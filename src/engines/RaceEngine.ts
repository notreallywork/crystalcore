import type {
  ShipState,
  Obstacle,
  Gate,
  Particle,
  Profile,
  TrackConfig,
  MathProblem,
} from '@/types';
import { MathValidator } from './MathValidator';
import emersonGates from '@/content/gates/emerson.json';
import kyraGates from '@/content/gates/kyra.json';

// Canvas dimensions (will be set based on container)
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;

// Lane positions (percentages)
const LANES = [0.25, 0.5, 0.75];

// Game constants
const BASE_SCROLL_SPEED = 200;
const OBSTACLE_SPAWN_RATE = 2000;
const GATE_SPAWN_RATE = 30000;
const CHECKPOINT_DISTANCE = 1000;
const SHIP_WIDTH = 50;
const SHIP_HEIGHT = 70;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 40;
const GATE_WIDTH = 120;
const GATE_HEIGHT = 150;
const BOOST_SPEED_MULTIPLIER = 1.5;
const SHIP_Y_PERCENT = 0.8;

interface RaceEngineCallbacks {
  onShardCollect: (amount: number) => void;
  onObstacleHit: () => void;
  onGateApproach: (gate: Gate) => void;
  onGatePass: (correct: boolean) => void;
  onCheckpoint: () => void;
  onDistanceUpdate: (delta: number) => void;
  onBoostTick: (deltaTime: number) => void;
  onRespawn: () => void;
}

export class RaceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private profile: Profile;
  private track: TrackConfig;
  private callbacks: RaceEngineCallbacks;

  // Game state
  private ship: ShipState;
  private obstacles: Obstacle[] = [];
  private gates: Gate[] = [];
  private particles: Particle[] = [];
  private distance = 0;
  private lastCheckpoint = 0;
  private isRunning = false;
  private lastTime = 0;
  private obstacleTimer = 0;
  private gateTimer = 0;
  private animationId: number | null = null;
  private isBoosting = false;
  private respawnTimer = 0;
  private respawnFlashTimer = 0;
  private isInvincible = false;

  // Visual state
  private gridOffset = 0;
  private starField: Array<{ x: number; y: number; size: number; speed: number }> = [];

  // Input state
  private touchX: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    profile: Profile,
    track: TrackConfig,
    callbacks: RaceEngineCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.profile = profile;
    this.track = track;
    this.callbacks = callbacks;

    this.resize();

    this.ship = {
      x: CANVAS_WIDTH * LANES[1],
      targetX: CANVAS_WIDTH * LANES[1],
      lane: 1,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
    };

    // Initialize star field for background
    this.initStarField();

    this.gameLoop = this.gameLoop.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.setupInputHandlers();
  }

  private initStarField() {
    this.starField = [];
    for (let i = 0; i < 60; i++) {
      this.starField.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 0.5 + Math.random() * 2,
        speed: 20 + Math.random() * 80,
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    CANVAS_WIDTH = rect.width;
    CANVAS_HEIGHT = rect.height;

    if (this.ship) {
      this.ship.x = CANVAS_WIDTH * LANES[this.ship.lane];
      this.ship.targetX = CANVAS_WIDTH * LANES[this.ship.lane];
    }

    this.initStarField();
  }

  private setupInputHandlers() {
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;

    if (this.profile.preferences.steering === 'manual') {
      this.ship.targetX = this.touchX;
    } else {
      const laneWidth = CANVAS_WIDTH / 3;
      const tappedLane = Math.floor(this.touchX / laneWidth);
      this.setLane(Math.max(0, Math.min(2, tappedLane)));
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (this.profile.preferences.steering === 'manual') {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchX = touch.clientX - rect.left;
      this.ship.targetX = this.touchX;
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.touchX = null;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      this.setLane(Math.max(0, this.ship.lane - 1));
    } else if (e.key === 'ArrowRight') {
      this.setLane(Math.min(2, this.ship.lane + 1));
    }
  }

  private setLane(lane: number) {
    this.ship.lane = lane;
    this.ship.targetX = CANVAS_WIDTH * LANES[lane];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setBoostState(isBoosting: boolean) {
    this.isBoosting = isBoosting;
  }

  private gameLoop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number) {
    // Calculate scroll speed with boost
    const boostMultiplier = this.isBoosting ? BOOST_SPEED_MULTIPLIER : 1.0;
    const scrollSpeed = BASE_SCROLL_SPEED * this.profile.stats.speed * boostMultiplier;

    // Update distance
    const distanceDelta = scrollSpeed * deltaTime;
    this.distance += distanceDelta;
    this.callbacks.onDistanceUpdate(distanceDelta);

    // Decay boost
    if (this.isBoosting) {
      this.callbacks.onBoostTick(deltaTime);
    }

    // Update respawn timer
    if (this.respawnTimer > 0) {
      this.respawnTimer -= deltaTime;
      this.respawnFlashTimer += deltaTime;
      if (this.respawnTimer <= 0) {
        this.isInvincible = false;
        this.respawnTimer = 0;
      }
    }

    // Update ship position with smoothing
    const lerpFactor = this.profile.preferences.steering === 'manual' ? 0.15 : 0.1;
    this.ship.x += (this.ship.targetX - this.ship.x) * lerpFactor;
    this.ship.x = Math.max(SHIP_WIDTH / 2, Math.min(CANVAS_WIDTH - SHIP_WIDTH / 2, this.ship.x));

    // Update star field
    for (const star of this.starField) {
      star.y += star.speed * deltaTime;
      if (star.y > CANVAS_HEIGHT) {
        star.y = -5;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Update grid offset for scrolling effect
    this.gridOffset = (this.gridOffset + scrollSpeed * deltaTime) % 100;

    // Spawn obstacles
    this.obstacleTimer += deltaTime * 1000;
    if (this.obstacleTimer >= OBSTACLE_SPAWN_RATE) {
      this.spawnObstacle();
      this.obstacleTimer = 0;
    }

    // Spawn gates
    this.gateTimer += deltaTime * 1000;
    if (this.gateTimer >= GATE_SPAWN_RATE) {
      this.spawnGate();
      this.gateTimer = 0;
    }

    // Update obstacles
    const shipY = CANVAS_HEIGHT * SHIP_Y_PERCENT;
    this.obstacles = this.obstacles.filter((obstacle) => {
      obstacle.y += scrollSpeed * deltaTime;

      if (!this.isInvincible && this.checkCollision(this.ship, obstacle, shipY)) {
        this.callbacks.onObstacleHit();
        this.spawnHitParticles(obstacle.x, obstacle.y);
        return false;
      }

      return obstacle.y < CANVAS_HEIGHT + 50;
    });

    // Update gates
    this.gates = this.gates.filter((gate) => {
      gate.y += scrollSpeed * deltaTime;

      // Gate approach: only trigger ONCE using the approached flag
      if (!gate.approached && gate.y > CANVAS_HEIGHT * 0.2 && gate.y < CANVAS_HEIGHT * 0.5) {
        gate.approached = true;
        this.callbacks.onGateApproach(gate);
      }

      // Gate pass: check if ship has passed below the gate (compare Y positions)
      if (gate.y > shipY + SHIP_HEIGHT / 2 && gate.solved === null) {
        gate.solved = false;
        this.callbacks.onGatePass(false);
      }

      return gate.y < CANVAS_HEIGHT + 200;
    });

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      return particle.life > 0;
    });

    // Check checkpoint
    if (this.distance - this.lastCheckpoint >= CHECKPOINT_DISTANCE) {
      this.lastCheckpoint = this.distance;
      this.callbacks.onCheckpoint();
    }
  }

  private spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const obstacle: Obstacle = {
      id: `obs-${Date.now()}-${Math.random()}`,
      x: CANVAS_WIDTH * LANES[lane],
      y: -50,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      lane,
      type: Math.random() > 0.4 ? 'crystal' : 'rock',
    };
    this.obstacles.push(obstacle);
  }

  private spawnGate() {
    // Generate a problem for this gate based on which lane the player is in
    const isYoung = this.profile.age <= 8;
    const gateData = isYoung ? emersonGates : kyraGates;
    const templates = gateData.templates as MathProblem[];
    const problem = MathValidator.getRandomProblem(templates);

    const gate: Gate = {
      id: `gate-${Date.now()}`,
      x: CANVAS_WIDTH * 0.5,
      y: -200,
      width: GATE_WIDTH * 3,
      height: GATE_HEIGHT,
      type: 'green',
      problem,
      solved: null,
      approached: false,
    };
    this.gates.push(gate);
  }

  private checkCollision(ship: ShipState, obstacle: Obstacle, shipY: number): boolean {
    const forgiveness = 12;
    return (
      Math.abs(ship.x - obstacle.x) < (ship.width + obstacle.width) / 2 - forgiveness &&
      Math.abs(shipY - obstacle.y) < (ship.height + obstacle.height) / 2 - forgiveness
    );
  }

  triggerRespawn() {
    this.isInvincible = true;
    this.respawnTimer = 2.0;
    this.respawnFlashTimer = 0;
    this.callbacks.onRespawn();
  }

  private spawnHitParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 100 + Math.random() * 120;
      this.particles.push({
        id: `hit-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color: '#FF3366',
        size: 3 + Math.random() * 5,
      });
    }
  }

  spawnShardParticles(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 80 + Math.random() * 100;
      this.particles.push({
        id: `shard-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1.0,
        maxLife: 1.0,
        color: '#FFD700',
        size: 5 + Math.random() * 5,
      });
    }
  }

  spawnBoostParticles() {
    const shipY = CANVAS_HEIGHT * SHIP_Y_PERCENT;
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: `boost-${Date.now()}-${i}`,
        x: this.ship.x + (Math.random() - 0.5) * SHIP_WIDTH,
        y: shipY + SHIP_HEIGHT / 2,
        vx: (Math.random() - 0.5) * 40,
        vy: 60 + Math.random() * 80,
        life: 0.4,
        maxLife: 0.4,
        color: '#00D9FF',
        size: 3 + Math.random() * 4,
      });
    }
  }

  private render() {
    const ctx = this.ctx;

    // Clear and draw background
    ctx.fillStyle = this.track.theme.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw star field
    for (const star of this.starField) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + star.size * 0.2})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw lane dividers with glow
    ctx.save();
    for (let i = 1; i < 3; i++) {
      const x = (CANVAS_WIDTH / 3) * i;
      ctx.strokeStyle = this.track.theme.gridColor;
      ctx.lineWidth = 1;
      ctx.shadowColor = this.track.theme.gridColor;
      ctx.shadowBlur = 8;
      ctx.setLineDash([20, 15]);
      ctx.lineDashOffset = -this.gridOffset * 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();

    // Draw scrolling grid lines (horizontal)
    ctx.save();
    ctx.strokeStyle = this.track.theme.gridColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    for (let y = -100 + this.gridOffset; y < CANVAS_HEIGHT; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw obstacles
    this.obstacles.forEach((obstacle) => {
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);

      if (obstacle.type === 'crystal') {
        ctx.fillStyle = this.track.theme.crystalColor;
        ctx.shadowColor = this.track.theme.crystalColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, -obstacle.height / 2);
        ctx.lineTo(obstacle.width / 2, 0);
        ctx.lineTo(0, obstacle.height / 2);
        ctx.lineTo(-obstacle.width / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.moveTo(0, -obstacle.height / 4);
        ctx.lineTo(obstacle.width / 4, 0);
        ctx.lineTo(0, obstacle.height / 4);
        ctx.lineTo(-obstacle.width / 4, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#555';
        ctx.shadowColor = '#333';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw gates
    this.gates.forEach((gate) => {
      ctx.save();

      const laneWidth = CANVAS_WIDTH / 3;
      const colors = ['#00FF88', '#667788', '#9D00FF'];
      const labels = ['EASY', 'SKIP', 'HARD'];

      for (let i = 0; i < 3; i++) {
        const x = laneWidth * i + laneWidth / 2;

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 3;
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 20;

        // Draw arch
        ctx.beginPath();
        ctx.arc(x, gate.y, GATE_WIDTH / 2, Math.PI, 0);
        ctx.stroke();

        // Draw pillars
        ctx.beginPath();
        ctx.moveTo(x - GATE_WIDTH / 2, gate.y);
        ctx.lineTo(x - GATE_WIDTH / 2, gate.y + GATE_HEIGHT);
        ctx.moveTo(x + GATE_WIDTH / 2, gate.y);
        ctx.lineTo(x + GATE_WIDTH / 2, gate.y + GATE_HEIGHT);
        ctx.stroke();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = colors[i];
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, gate.y - GATE_WIDTH / 2 - 8);
      }

      ctx.restore();
    });

    // Draw ship
    this.renderShip();

    // Draw particles
    this.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw boost effect overlay
    if (this.isBoosting) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#00D9FF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Speed lines
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const len = 40 + Math.random() * 80;
        ctx.beginPath();
        ctx.moveTo(x, Math.random() * CANVAS_HEIGHT);
        ctx.lineTo(x, Math.random() * CANVAS_HEIGHT + len);
        ctx.stroke();
      }
      ctx.restore();

      this.spawnBoostParticles();
    }
  }

  private renderShip() {
    const ctx = this.ctx;
    const shipY = CANVAS_HEIGHT * SHIP_Y_PERCENT;

    // Respawn flash (blink effect)
    if (this.isInvincible && Math.floor(this.respawnFlashTimer * 8) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.ship.x, shipY);

    // Ship glow
    ctx.shadowColor = this.profile.cosmetics.color;
    ctx.shadowBlur = this.isBoosting ? 25 : 12;

    ctx.fillStyle = this.profile.cosmetics.color;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;

    switch (this.profile.cosmetics.shipShape) {
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_HEIGHT / 2);
        ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.lineTo(0, SHIP_HEIGHT / 4);
        ctx.lineTo(-SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_HEIGHT / 2);
        ctx.lineTo(SHIP_WIDTH / 2, 0);
        ctx.lineTo(0, SHIP_HEIGHT / 2);
        ctx.lineTo(-SHIP_WIDTH / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_HEIGHT / 2);
        ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.lineTo(0, SHIP_HEIGHT / 4);
        ctx.lineTo(-SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Draw trail
    if (this.profile.cosmetics.trail !== 'none') {
      ctx.globalAlpha = 0.5;
      const trailGradient = ctx.createLinearGradient(0, SHIP_HEIGHT / 4, 0, SHIP_HEIGHT / 2 + 40);
      trailGradient.addColorStop(0, this.profile.cosmetics.color);
      trailGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = trailGradient;
      ctx.beginPath();
      ctx.moveTo(-SHIP_WIDTH / 3, SHIP_HEIGHT / 4);
      ctx.lineTo(0, SHIP_HEIGHT / 2 + 40);
      ctx.lineTo(SHIP_WIDTH / 3, SHIP_HEIGHT / 4);
      ctx.closePath();
      ctx.fill();
    }

    // Engine glow
    ctx.globalAlpha = 0.9;
    const engineGlow = ctx.createRadialGradient(0, SHIP_HEIGHT / 2 + 5, 2, 0, SHIP_HEIGHT / 2 + 5, 12);
    engineGlow.addColorStop(0, this.isBoosting ? '#00FFFF' : '#00D9FF');
    engineGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.arc(0, SHIP_HEIGHT / 2 + 5, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Public methods for external control
  setGateResult(gateId: string, correct: boolean) {
    const gate = this.gates.find((g) => g.id === gateId);
    if (gate) {
      gate.solved = correct;
      this.callbacks.onGatePass(correct);

      if (correct) {
        this.spawnShardParticles(gate.x, gate.y);
      }
    }
  }

  getDistance(): number {
    return this.distance;
  }

  cleanup() {
    this.stop();
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
