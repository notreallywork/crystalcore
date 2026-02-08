import type { 
  ShipState, 
  Obstacle, 
  Gate, 
  Particle, 
  Profile, 
  TrackConfig 
} from '@/types';

// Canvas dimensions (will be set based on container)
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;

// Lane positions (percentages)
const LANES = [0.25, 0.5, 0.75];

// Game constants
const BASE_SCROLL_SPEED = 200; // pixels per second
const OBSTACLE_SPAWN_RATE = 2000; // ms
const GATE_SPAWN_RATE = 30000; // ms
const CHECKPOINT_DISTANCE = 1000;
const SHIP_WIDTH = 50;
const SHIP_HEIGHT = 70;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 40;
const GATE_WIDTH = 120;
const GATE_HEIGHT = 150;

interface RaceEngineCallbacks {
  onShardCollect: (amount: number) => void;
  onObstacleHit: () => void;
  onGateApproach: (gate: Gate) => void;
  onGatePass: (correct: boolean) => void;
  onCheckpoint: () => void;
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
    
    // Set canvas size
    this.resize();
    
    // Initialize ship in center lane
    this.ship = {
      x: CANVAS_WIDTH * LANES[1],
      targetX: CANVAS_WIDTH * LANES[1],
      lane: 1,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
    };
    
    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // Setup input handlers
    this.setupInputHandlers();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    CANVAS_WIDTH = rect.width;
    CANVAS_HEIGHT = rect.height;
    
    // Update ship position to match new lane position
    this.ship.x = CANVAS_WIDTH * LANES[this.ship.lane];
    this.ship.targetX = CANVAS_WIDTH * LANES[this.ship.lane];
  }

  private setupInputHandlers() {
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    
    // Keyboard events (for testing on desktop)
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;
    
    if (this.profile.preferences.steering === 'manual') {
      // Manual steering - ship follows finger
      this.ship.targetX = this.touchX;
    } else {
      // Auto-steer - tap to change lane
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

  private gameLoop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number) {
    // Calculate scroll speed with boost
    const scrollSpeed = BASE_SCROLL_SPEED * this.profile.stats.speed;

    // Update distance
    const distanceDelta = scrollSpeed * deltaTime;
    this.distance += distanceDelta;

    // Update ship position with smoothing
    const lerpFactor = this.profile.preferences.steering === 'manual' ? 0.15 : 0.1;
    this.ship.x += (this.ship.targetX - this.ship.x) * lerpFactor;
    
    // Clamp ship to screen bounds
    this.ship.x = Math.max(SHIP_WIDTH / 2, Math.min(CANVAS_WIDTH - SHIP_WIDTH / 2, this.ship.x));

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
    this.obstacles = this.obstacles.filter((obstacle) => {
      obstacle.y += scrollSpeed * deltaTime;
      
      // Check collision with ship
      if (this.checkCollision(this.ship, obstacle)) {
        this.callbacks.onObstacleHit();
        this.spawnHitParticles(obstacle.x, obstacle.y);
        return false; // Remove obstacle
      }
      
      // Remove if off screen
      return obstacle.y < CANVAS_HEIGHT + 50;
    });

    // Update gates
    this.gates = this.gates.filter((gate) => {
      gate.y += scrollSpeed * deltaTime;
      
      // Check if gate is approaching (trigger overlay)
      if (gate.y > CANVAS_HEIGHT * 0.3 && gate.y < CANVAS_HEIGHT * 0.5) {
        this.callbacks.onGateApproach(gate);
      }
      
      // Check if ship passed through gate
      if (gate.y > this.ship.x + SHIP_HEIGHT / 2 && gate.solved === null) {
        // Player didn't solve in time - auto-pass with no reward
        gate.solved = false;
        this.callbacks.onGatePass(false);
      }
      
      // Remove if off screen
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
      id: `obs-${Date.now()}`,
      x: CANVAS_WIDTH * LANES[lane],
      y: -50,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      lane,
      type: Math.random() > 0.5 ? 'crystal' : 'rock',
    };
    this.obstacles.push(obstacle);
  }

  private spawnGate() {
    // Create a gate with three paths
    const gate: Gate = {
      id: `gate-${Date.now()}`,
      x: CANVAS_WIDTH * 0.5,
      y: -200,
      width: GATE_WIDTH * 3,
      height: GATE_HEIGHT,
      type: 'green', // Will be determined by which path player takes
      problem: null,
      solved: null,
    };
    this.gates.push(gate);
  }

  private checkCollision(ship: ShipState, obstacle: Obstacle): boolean {
    // AABB collision with forgiveness
    const forgiveness = 10;
    return (
      Math.abs(ship.x - obstacle.x) < (ship.width + obstacle.width) / 2 - forgiveness &&
      Math.abs(CANVAS_HEIGHT * 0.8 - obstacle.y) < (ship.height + obstacle.height) / 2 - forgiveness
    );
  }

  private spawnHitParticles(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        id: `hit-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: '#FF3366',
        size: 4 + Math.random() * 4,
      });
    }
  }

  spawnShardParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 80 + Math.random() * 80;
      this.particles.push({
        id: `shard-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        color: '#FFD700',
        size: 6 + Math.random() * 4,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.fillStyle = this.track.theme.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines (track)
    ctx.strokeStyle = this.track.theme.gridColor;
    ctx.lineWidth = 2;
    
    // Vertical lane dividers
    for (let i = 1; i < 3; i++) {
      const x = (CANVAS_WIDTH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Horizontal scrolling grid lines
    const gridOffset = (this.distance % 100);
    for (let y = -100 + gridOffset; y < CANVAS_HEIGHT; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw obstacles
    this.obstacles.forEach((obstacle) => {
      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);
      
      if (obstacle.type === 'crystal') {
        // Draw crystal obstacle
        ctx.fillStyle = this.track.theme.crystalColor;
        ctx.beginPath();
        ctx.moveTo(0, -obstacle.height / 2);
        ctx.lineTo(obstacle.width / 2, 0);
        ctx.lineTo(0, obstacle.height / 2);
        ctx.lineTo(-obstacle.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        
        // Glow effect
        ctx.shadowColor = this.track.theme.crystalColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
      } else {
        // Draw rock obstacle
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });

    // Draw gates
    this.gates.forEach((gate) => {
      ctx.save();
      
      // Draw three archways
      const laneWidth = CANVAS_WIDTH / 3;
      const colors = ['#00FF88', '#CCCCCC', '#9D00FF']; // Green, Skip (gray), Purple
      const labels = ['EASY', 'SKIP', 'HARD'];
      
      for (let i = 0; i < 3; i++) {
        const x = laneWidth * i + laneWidth / 2;
        
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 4;
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 15;
        
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
        ctx.fillStyle = colors[i];
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(labels[i], x, gate.y - GATE_WIDTH / 2 - 10);
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
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderShip() {
    const ctx = this.ctx;
    const shipY = CANVAS_HEIGHT * 0.8;
    
    ctx.save();
    ctx.translate(this.ship.x, shipY);
    
    // Ship color
    ctx.fillStyle = this.profile.cosmetics.color;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    
    // Draw ship based on shape
    switch (this.profile.cosmetics.shipShape) {
      case 'arrow':
        // Arrow shape
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
        // Diamond shape
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
        // Default triangular ship
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_HEIGHT / 2);
        ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.lineTo(0, SHIP_HEIGHT / 4);
        ctx.lineTo(-SHIP_WIDTH / 2, SHIP_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    // Draw trail if active
    if (this.profile.cosmetics.trail !== 'none') {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = this.profile.cosmetics.color;
      ctx.beginPath();
      ctx.moveTo(-SHIP_WIDTH / 4, SHIP_HEIGHT / 4);
      ctx.lineTo(0, SHIP_HEIGHT / 2 + 30);
      ctx.lineTo(SHIP_WIDTH / 4, SHIP_HEIGHT / 4);
      ctx.closePath();
      ctx.fill();
    }
    
    // Engine glow
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#00D9FF';
    ctx.beginPath();
    ctx.arc(0, SHIP_HEIGHT / 2 + 5, 8, 0, Math.PI * 2);
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
