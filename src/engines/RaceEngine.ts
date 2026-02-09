import type {
  ShipState,
  Obstacle,
  Gate,
  Particle,
  Projectile,
  Boss,
  Profile,
  TrackConfig,
  MathProblem,
} from '@/types';
import { MathValidator } from './MathValidator';
import emersonGates from '@/content/gates/emerson.json';
import kyraGates from '@/content/gates/kyra.json';

// Canvas dimensions (set based on container)
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600;

// Game constants
const BASE_SCROLL_SPEED = 180;
const OBSTACLE_SPAWN_INTERVAL = 1200;
const GATE_SPAWN_INTERVAL = 25000;
const BOSS_SPAWN_DISTANCE = 5000;
const CHECKPOINT_DISTANCE = 1000;
const SHIP_WIDTH = 44;
const SHIP_HEIGHT = 56;
const OBSTACLE_SIZE_MIN = 28;
const OBSTACLE_SIZE_MAX = 48;
const PROJECTILE_SPEED = 650;
const PROJECTILE_WIDTH = 6;
const PROJECTILE_HEIGHT = 18;
const SHOOT_INTERVAL = 0.28;
const BOSS_WIDTH = 120;
const BOSS_HEIGHT = 80;
const BOSS_SHOOT_INTERVAL = 1.8;
const BOSS_PROJECTILE_SPEED = 220;
const BOSS_MAX_HEALTH = 15;
const BOSS_MATH_THRESHOLD = 0.5;
const BOSS_REWARD = 75;
const BOOST_SPEED_MULTIPLIER = 1.5;
const SHIP_MOVE_SPEED = 500;
const SHIP_LERP_TOUCH = 0.14;
const GATE_HEIGHT = 60;

interface RaceEngineCallbacks {
  onShardCollect: (amount: number) => void;
  onObstacleHit: () => void;
  onGateApproach: (gate: Gate) => void;
  onGatePass: (correct: boolean) => void;
  onCheckpoint: () => void;
  onDistanceUpdate: (delta: number) => void;
  onBoostTick: (deltaTime: number) => void;
  onRespawn: () => void;
  onBossSpawn: () => void;
  onBossMathPhase: (problem: MathProblem) => void;
  onBossDefeated: (reward: number) => void;
  onRockDestroyed: () => void;
}

// Nebula cloud for background
interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  speed: number;
}

// Star for parallax background
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export class RaceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private profile: Profile;
  private track: TrackConfig;
  private callbacks: RaceEngineCallbacks;

  // Game objects
  private ship: ShipState;
  private projectiles: Projectile[] = [];
  private obstacles: Obstacle[] = [];
  private gates: Gate[] = [];
  private boss: Boss | null = null;
  private particles: Particle[] = [];

  // Timers
  private shootTimer = 0;
  private obstacleTimer = 0;
  private gateTimer = 0;
  private distance = 0;
  private lastCheckpoint = 0;
  private lastBossDistance = 0;

  // State
  private isRunning = false;
  private lastTime = 0;
  private animationId: number | null = null;
  private isBoosting = false;
  private respawnTimer = 0;
  private respawnFlashTimer = 0;
  private isInvincible = false;
  private screenShake = { x: 0, y: 0, time: 0 };
  private bossWarningTimer = 0;

  // Background
  private starLayers: Star[][] = [];
  private nebulaClouds: NebulaCloud[] = [];
  private gridOffset = 0;

  // Input
  private keys = new Set<string>();
  private touchActive = false;
  private touchTarget = { x: 0, y: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    profile: Profile,
    track: TrackConfig,
    callbacks: RaceEngineCallbacks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.profile = profile;
    this.track = track;
    this.callbacks = callbacks;

    this.resize();

    // Ship starts at bottom-center
    this.ship = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT * 0.78,
      targetX: CANVAS_WIDTH / 2,
      targetY: CANVAS_HEIGHT * 0.78,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
    };

    this.initBackground();

    this.gameLoop = this.gameLoop.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    this.setupInputHandlers();
  }

  // ═══════════════════════════════════════
  // BACKGROUND INITIALIZATION
  // ═══════════════════════════════════════

  private initBackground() {
    // 3 star layers for parallax (deep, mid, close)
    this.starLayers = [
      this.generateStarLayer(40, 0.5, 1.2, 15, 35, 0.15, 0.4),
      this.generateStarLayer(25, 1.0, 2.0, 40, 75, 0.35, 0.7),
      this.generateStarLayer(12, 1.5, 3.0, 80, 130, 0.6, 1.0),
    ];

    // Nebula clouds
    const nebulaColors = ['#4B0082', '#1E3A5F', '#2D1B4E', '#0D3B66', '#3C1053', '#1A1A4E'];
    this.nebulaClouds = [];
    for (let i = 0; i < 6; i++) {
      this.nebulaClouds.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        radius: 100 + Math.random() * 180,
        color: nebulaColors[i % nebulaColors.length],
        alpha: 0.04 + Math.random() * 0.06,
        speed: 8 + Math.random() * 15,
      });
    }
  }

  private generateStarLayer(
    count: number,
    minSize: number,
    maxSize: number,
    minSpeed: number,
    maxSpeed: number,
    minBright: number,
    maxBright: number,
  ): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: minSize + Math.random() * (maxSize - minSize),
        speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
        brightness: minBright + Math.random() * (maxBright - minBright),
      });
    }
    return stars;
  }

  // ═══════════════════════════════════════
  // SETUP & LIFECYCLE
  // ═══════════════════════════════════════

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    CANVAS_WIDTH = rect.width;
    CANVAS_HEIGHT = rect.height;

    if (this.ship) {
      this.ship.x = Math.min(this.ship.x, CANVAS_WIDTH - SHIP_WIDTH / 2);
      this.ship.targetX = this.ship.x;
    }

    this.initBackground();
  }

  private setupInputHandlers() {
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  // ═══════════════════════════════════════
  // INPUT HANDLERS
  // ═══════════════════════════════════════

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchActive = true;
    this.touchTarget.x = touch.clientX - rect.left;
    this.touchTarget.y = touch.clientY - rect.top;
    this.ship.targetX = this.touchTarget.x;
    this.ship.targetY = Math.min(this.touchTarget.y, CANVAS_HEIGHT * 0.92);
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touchTarget.x = touch.clientX - rect.left;
    this.touchTarget.y = touch.clientY - rect.top;
    this.ship.targetX = this.touchTarget.x;
    this.ship.targetY = Math.min(this.touchTarget.y, CANVAS_HEIGHT * 0.92);
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.touchActive = false;
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.touchActive = true;
    this.touchTarget.x = e.clientX - rect.left;
    this.touchTarget.y = e.clientY - rect.top;
    this.ship.targetX = this.touchTarget.x;
    this.ship.targetY = Math.min(this.touchTarget.y, CANVAS_HEIGHT * 0.92);
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.touchActive) return;
    const rect = this.canvas.getBoundingClientRect();
    this.touchTarget.x = e.clientX - rect.left;
    this.touchTarget.y = e.clientY - rect.top;
    this.ship.targetX = this.touchTarget.x;
    this.ship.targetY = Math.min(this.touchTarget.y, CANVAS_HEIGHT * 0.92);
  }

  private handleMouseUp() {
    this.touchActive = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key);
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key);
  }

  // ═══════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════

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

  // ═══════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════

  private update(dt: number) {
    const boostMul = this.isBoosting ? BOOST_SPEED_MULTIPLIER : 1.0;
    const scrollSpeed = BASE_SCROLL_SPEED * this.profile.stats.speed * boostMul;

    // Distance
    const distanceDelta = scrollSpeed * dt;
    this.distance += distanceDelta;
    this.callbacks.onDistanceUpdate(distanceDelta);

    // Boost decay
    if (this.isBoosting) {
      this.callbacks.onBoostTick(dt);
    }

    // Screen shake decay
    if (this.screenShake.time > 0) {
      this.screenShake.time -= dt;
      this.screenShake.x = (Math.random() - 0.5) * 8 * (this.screenShake.time / 0.3);
      this.screenShake.y = (Math.random() - 0.5) * 8 * (this.screenShake.time / 0.3);
      if (this.screenShake.time <= 0) {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }

    // Boss warning
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
    }

    // Respawn timer
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      this.respawnFlashTimer += dt;
      if (this.respawnTimer <= 0) {
        this.isInvincible = false;
        this.respawnTimer = 0;
      }
    }

    this.updateShip(dt);
    this.updateProjectiles(dt, scrollSpeed);
    this.updateObstacles(dt, scrollSpeed);
    this.updateGates(dt, scrollSpeed);
    this.updateBoss(dt);
    this.updateParticles(dt);
    this.updateBackground(dt, scrollSpeed);

    // Spawning
    this.obstacleTimer += dt * 1000;
    if (this.obstacleTimer >= OBSTACLE_SPAWN_INTERVAL) {
      this.spawnObstacle();
      this.obstacleTimer = 0;
    }

    this.gateTimer += dt * 1000;
    if (this.gateTimer >= GATE_SPAWN_INTERVAL) {
      this.spawnGate();
      this.gateTimer = 0;
    }

    // Auto-fire
    this.shootTimer += dt;
    if (this.shootTimer >= SHOOT_INTERVAL) {
      this.fireProjectile();
      this.shootTimer = 0;
    }

    // Boss spawn check
    if (!this.boss && this.distance - this.lastBossDistance >= BOSS_SPAWN_DISTANCE && this.distance > 2000) {
      this.spawnBoss();
    }

    // Checkpoint
    if (this.distance - this.lastCheckpoint >= CHECKPOINT_DISTANCE) {
      this.lastCheckpoint = this.distance;
      this.callbacks.onCheckpoint();
    }

    this.gridOffset = (this.gridOffset + scrollSpeed * dt) % 80;
  }

  private updateShip(dt: number) {
    // Keyboard movement
    const speed = SHIP_MOVE_SPEED * dt;
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      this.ship.targetX = this.ship.x - speed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      this.ship.targetX = this.ship.x + speed;
    }
    if (this.keys.has('ArrowUp') || this.keys.has('w')) {
      this.ship.targetY = this.ship.y - speed;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('s')) {
      this.ship.targetY = this.ship.y + speed;
    }

    // Smooth movement towards target
    const lerp = this.touchActive ? SHIP_LERP_TOUCH : 0.12;
    this.ship.x += (this.ship.targetX - this.ship.x) * lerp;
    this.ship.y += (this.ship.targetY - this.ship.y) * lerp;

    // Bounds
    const pad = SHIP_WIDTH / 2 + 4;
    this.ship.x = Math.max(pad, Math.min(CANVAS_WIDTH - pad, this.ship.x));
    this.ship.y = Math.max(CANVAS_HEIGHT * 0.25, Math.min(CANVAS_HEIGHT * 0.92, this.ship.y));
  }

  private updateProjectiles(dt: number, _scrollSpeed: number) {
    this.projectiles = this.projectiles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Off-screen check
      if (p.y < -30 || p.y > CANVAS_HEIGHT + 30 || p.x < -30 || p.x > CANVAS_WIDTH + 30) {
        return false;
      }

      if (p.fromBoss) {
        // Boss projectile hits player
        if (
          !this.isInvincible &&
          Math.abs(p.x - this.ship.x) < (p.width + this.ship.width) / 2 - 8 &&
          Math.abs(p.y - this.ship.y) < (p.height + this.ship.height) / 2 - 8
        ) {
          this.callbacks.onObstacleHit();
          this.spawnHitParticles(this.ship.x, this.ship.y, '#FF3366');
          this.screenShake.time = 0.2;
          return false;
        }
      } else {
        // Player projectile hits rock
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
          const obs = this.obstacles[i];
          if (obs.type !== 'rock') continue;
          if (
            Math.abs(p.x - obs.x) < (p.width + obs.width) / 2 &&
            Math.abs(p.y - obs.y) < (p.height + obs.height) / 2
          ) {
            // Destroy rock
            this.spawnExplosionParticles(obs.x, obs.y);
            this.obstacles.splice(i, 1);
            this.callbacks.onRockDestroyed();
            this.callbacks.onShardCollect(1);
            return false;
          }
        }

        // Player projectile hits boss
        if (this.boss && this.boss.phase === 'attack') {
          if (
            Math.abs(p.x - this.boss.x) < (p.width + this.boss.width) / 2 &&
            Math.abs(p.y - this.boss.y) < (p.height + this.boss.height) / 2
          ) {
            this.boss.health -= p.damage;
            this.boss.damageFlash = 0.15;
            this.spawnHitParticles(p.x, p.y, '#FF6600');

            // Check math phase trigger
            if (!this.boss.mathTriggered && this.boss.health <= this.boss.maxHealth * BOSS_MATH_THRESHOLD) {
              this.boss.mathTriggered = true;
              this.boss.phase = 'math';
              const isYoung = this.profile.age <= 8;
              const gateData = isYoung ? emersonGates : kyraGates;
              const templates = gateData.templates as MathProblem[];
              const problem = MathValidator.getRandomProblem(templates);
              this.callbacks.onBossMathPhase(problem);
            }

            // Boss defeated
            if (this.boss.health <= 0) {
              this.boss.phase = 'defeated';
              this.spawnBossExplosion(this.boss.x, this.boss.y);
              this.callbacks.onBossDefeated(this.boss.reward);
              this.callbacks.onShardCollect(this.boss.reward);
              // Remove boss projectiles
              this.projectiles = this.projectiles.filter((proj) => !proj.fromBoss);
              this.lastBossDistance = this.distance;
              setTimeout(() => {
                this.boss = null;
              }, 1500);
            }

            return false;
          }
        }
      }

      return true;
    });
  }

  private updateObstacles(dt: number, scrollSpeed: number) {
    this.obstacles = this.obstacles.filter((obs) => {
      obs.y += scrollSpeed * dt;
      obs.rotation += obs.rotationSpeed * dt;

      // Off-screen
      if (obs.y > CANVAS_HEIGHT + 60) return false;

      // Collision with ship
      const collisionDist =
        obs.type === 'crystal'
          ? (this.ship.width + obs.width) / 2 - 6
          : (this.ship.width + obs.width) / 2 - 10;

      if (
        Math.abs(this.ship.x - obs.x) < collisionDist &&
        Math.abs(this.ship.y - obs.y) < collisionDist
      ) {
        if (obs.type === 'crystal') {
          // Collect crystal!
          this.callbacks.onShardCollect(2);
          this.spawnShardCollectParticles(obs.x, obs.y);
          return false;
        } else if (!this.isInvincible) {
          // Rock damage
          this.callbacks.onObstacleHit();
          this.spawnHitParticles(obs.x, obs.y, '#FF3366');
          this.screenShake.time = 0.25;
          return false;
        }
      }

      return true;
    });
  }

  private updateGates(dt: number, scrollSpeed: number) {
    this.gates = this.gates.filter((gate) => {
      gate.y += scrollSpeed * dt;

      // Gate approach - pause game for solving
      if (!gate.approached && gate.y > CANVAS_HEIGHT * 0.15 && gate.y < CANVAS_HEIGHT * 0.4) {
        gate.approached = true;
        this.callbacks.onGateApproach(gate);
      }

      // Gate passed without solving
      if (gate.y > this.ship.y + SHIP_HEIGHT && gate.solved === null) {
        gate.solved = false;
        this.callbacks.onGatePass(false);
      }

      return gate.y < CANVAS_HEIGHT + 200;
    });
  }

  private updateBoss(dt: number) {
    if (!this.boss) return;

    // Damage flash
    if (this.boss.damageFlash > 0) {
      this.boss.damageFlash -= dt;
    }

    if (this.boss.phase === 'entering') {
      // Slide down to target position
      this.boss.y += (this.boss.targetY - this.boss.y) * 0.03;
      if (Math.abs(this.boss.y - this.boss.targetY) < 5) {
        this.boss.phase = 'attack';
      }
    } else if (this.boss.phase === 'attack') {
      // Move side to side
      this.boss.x += this.boss.moveDirection * 80 * dt;
      if (this.boss.x < BOSS_WIDTH / 2 + 20 || this.boss.x > CANVAS_WIDTH - BOSS_WIDTH / 2 - 20) {
        this.boss.moveDirection *= -1;
      }

      // Boss shoots
      this.boss.shootTimer += dt;
      if (this.boss.shootTimer >= BOSS_SHOOT_INTERVAL) {
        this.boss.shootTimer = 0;
        this.fireBossProjectile();
      }
    } else if (this.boss.phase === 'defeated') {
      // Defeated animation - boss drifts up and fades
      this.boss.y -= 30 * dt;
    }
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  private updateBackground(dt: number, _scrollSpeed: number) {
    // Stars parallax
    for (const layer of this.starLayers) {
      for (const star of layer) {
        star.y += star.speed * dt * (this.isBoosting ? 2.5 : 1);
        if (star.y > CANVAS_HEIGHT + 5) {
          star.y = -5;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      }
    }

    // Nebula clouds drift
    for (const cloud of this.nebulaClouds) {
      cloud.y += cloud.speed * dt;
      if (cloud.y - cloud.radius > CANVAS_HEIGHT) {
        cloud.y = -cloud.radius;
        cloud.x = Math.random() * CANVAS_WIDTH;
      }
    }
  }

  // ═══════════════════════════════════════
  // SPAWNING
  // ═══════════════════════════════════════

  private spawnObstacle() {
    const padding = 40;
    const x = padding + Math.random() * (CANVAS_WIDTH - padding * 2);
    const size = OBSTACLE_SIZE_MIN + Math.random() * (OBSTACLE_SIZE_MAX - OBSTACLE_SIZE_MIN);
    const isCrystal = Math.random() > 0.45;

    const obstacle: Obstacle = {
      id: `obs-${Date.now()}-${Math.random()}`,
      x,
      y: -50,
      width: size,
      height: size,
      type: isCrystal ? 'crystal' : 'rock',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: isCrystal
        ? 1.5 + Math.random() * 1.5
        : 0.3 + Math.random() * 0.8,
    };

    // Generate asteroid shape for rocks
    if (!isCrystal) {
      obstacle.shape = this.generateAsteroidShape(size / 2);
    }

    this.obstacles.push(obstacle);
  }

  private generateAsteroidShape(radius: number): { x: number; y: number }[] {
    const vertices = 7 + Math.floor(Math.random() * 4);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < vertices; i++) {
      const angle = (Math.PI * 2 * i) / vertices;
      const r = radius * (0.65 + Math.random() * 0.35);
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
  }

  private spawnGate() {
    const isYoung = this.profile.age <= 8;
    const gateData = isYoung ? emersonGates : kyraGates;
    const templates = gateData.templates as MathProblem[];
    const problem = MathValidator.getRandomProblem(templates);

    const gate: Gate = {
      id: `gate-${Date.now()}`,
      x: CANVAS_WIDTH / 2,
      y: -120,
      width: CANVAS_WIDTH,
      height: GATE_HEIGHT,
      type: 'green',
      problem,
      solved: null,
      approached: false,
    };
    this.gates.push(gate);
  }

  private spawnBoss() {
    const isYoung = this.profile.age <= 8;
    const hp = isYoung ? Math.floor(BOSS_MAX_HEALTH * 0.6) : BOSS_MAX_HEALTH;

    this.boss = {
      id: `boss-${Date.now()}`,
      x: CANVAS_WIDTH / 2,
      y: -BOSS_HEIGHT,
      targetY: CANVAS_HEIGHT * 0.12,
      width: BOSS_WIDTH,
      height: BOSS_HEIGHT,
      health: hp,
      maxHealth: hp,
      phase: 'entering',
      shootTimer: 0,
      moveDirection: Math.random() > 0.5 ? 1 : -1,
      damageFlash: 0,
      reward: BOSS_REWARD,
      mathTriggered: false,
    };

    this.bossWarningTimer = 2.0;
    this.callbacks.onBossSpawn();
  }

  private fireProjectile() {
    this.projectiles.push({
      id: `proj-${Date.now()}-${Math.random()}`,
      x: this.ship.x,
      y: this.ship.y - SHIP_HEIGHT / 2 - 4,
      vx: 0,
      vy: -PROJECTILE_SPEED,
      width: PROJECTILE_WIDTH,
      height: PROJECTILE_HEIGHT,
      damage: 1,
      fromBoss: false,
    });
  }

  private fireBossProjectile() {
    if (!this.boss) return;

    // Aim roughly toward player with some spread
    const dx = this.ship.x - this.boss.x;
    const dy = this.ship.y - this.boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spread = (Math.random() - 0.5) * 0.4;

    this.projectiles.push({
      id: `bproj-${Date.now()}-${Math.random()}`,
      x: this.boss.x,
      y: this.boss.y + BOSS_HEIGHT / 2,
      vx: (dx / dist) * BOSS_PROJECTILE_SPEED + spread * 60,
      vy: (dy / dist) * BOSS_PROJECTILE_SPEED,
      width: 14,
      height: 14,
      damage: 1,
      fromBoss: true,
    });
  }

  // ═══════════════════════════════════════
  // PARTICLE SPAWNERS
  // ═══════════════════════════════════════

  private spawnHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        id: `hit-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  private spawnShardCollectParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        id: `shard-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.8,
        maxLife: 0.8,
        color: '#FFD700',
        size: 3 + Math.random() * 5,
      });
    }
    // Add sparkle
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        id: `sparkle-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 60,
        life: 0.6,
        maxLife: 0.6,
        color: '#FFFFFF',
        size: 2 + Math.random() * 3,
      });
    }
  }

  private spawnExplosionParticles(x: number, y: number) {
    // Large explosion for destroyed rocks
    const colors = ['#FF6600', '#FF3300', '#FF9900', '#FFCC00', '#888888'];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        id: `exp-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 6,
      });
    }
    // Debris
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        id: `deb-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.8,
        maxLife: 0.8,
        color: '#666666',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private spawnBossExplosion(x: number, y: number) {
    const colors = ['#FF0000', '#FF6600', '#FFCC00', '#FFFFFF', '#FF3399'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 250;
      this.particles.push({
        id: `boss-exp-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * BOSS_WIDTH,
        y: y + (Math.random() - 0.5) * BOSS_HEIGHT,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
      });
    }
    this.screenShake.time = 0.5;
  }

  spawnBoostParticles() {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        id: `boost-${Date.now()}-${i}`,
        x: this.ship.x + (Math.random() - 0.5) * SHIP_WIDTH,
        y: this.ship.y + SHIP_HEIGHT / 2,
        vx: (Math.random() - 0.5) * 30,
        vy: 50 + Math.random() * 70,
        life: 0.35,
        maxLife: 0.35,
        color: '#00D9FF',
        size: 2 + Math.random() * 3,
      });
    }
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  private render() {
    const ctx = this.ctx;

    ctx.save();
    // Screen shake offset
    if (this.screenShake.time > 0) {
      ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    this.renderBackground(ctx);
    this.renderGates(ctx);
    this.renderObstacles(ctx);
    this.renderProjectiles(ctx);
    this.renderBoss(ctx);
    this.renderShip(ctx);
    this.renderParticles(ctx);
    this.renderBoostEffect(ctx);
    this.renderBossWarning(ctx);

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    // Deep space gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(0.4, this.track.theme.bgColor);
    bgGrad.addColorStop(1, '#0A0A1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Nebula clouds
    for (const cloud of this.nebulaClouds) {
      const grad = ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.radius,
      );
      grad.addColorStop(0, cloud.color);
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = cloud.alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Star layers
    for (const layer of this.starLayers) {
      for (const star of layer) {
        ctx.save();
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Subtle grid lines
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = this.track.theme.gridColor;
    ctx.lineWidth = 0.5;
    for (let y = -80 + this.gridOffset; y < CANVAS_HEIGHT; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.rotation);

      if (obs.type === 'crystal') {
        this.renderCrystal(ctx, obs);
      } else {
        this.renderRock(ctx, obs);
      }

      ctx.restore();
    }
  }

  private renderCrystal(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const half = obs.width / 2;
    const pulse = 1 + Math.sin(Date.now() * 0.004 + obs.rotation * 3) * 0.08;

    // Outer glow
    ctx.shadowColor = this.track.theme.crystalColor;
    ctx.shadowBlur = 18;

    // Main crystal diamond shape
    ctx.fillStyle = this.track.theme.crystalColor;
    ctx.beginPath();
    ctx.moveTo(0, -half * pulse);
    ctx.lineTo(half * 0.6 * pulse, 0);
    ctx.lineTo(0, half * pulse);
    ctx.lineTo(-half * 0.6 * pulse, 0);
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const innerScale = 0.35 * pulse;
    ctx.moveTo(0, -half * innerScale);
    ctx.lineTo(half * 0.4 * innerScale, 0);
    ctx.lineTo(0, half * innerScale);
    ctx.lineTo(-half * 0.4 * innerScale, 0);
    ctx.closePath();
    ctx.fill();

    // Cross shine
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-half * 0.3, 0);
    ctx.lineTo(half * 0.3, 0);
    ctx.moveTo(0, -half * 0.3);
    ctx.lineTo(0, half * 0.3);
    ctx.stroke();
  }

  private renderRock(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    if (!obs.shape || obs.shape.length < 3) return;

    // Rock body
    ctx.fillStyle = '#3A3A44';
    ctx.strokeStyle = '#555560';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#222';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(obs.shape[0].x, obs.shape[0].y);
    for (let i = 1; i < obs.shape.length; i++) {
      ctx.lineTo(obs.shape[i].x, obs.shape[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crater details
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2A2A32';
    const craterCount = 2 + Math.floor(obs.width / 20);
    for (let i = 0; i < craterCount; i++) {
      const cx = (Math.sin(i * 2.7 + obs.rotation) * obs.width) / 4;
      const cy = (Math.cos(i * 3.1 + obs.rotation) * obs.height) / 4;
      const cr = 2 + (i % 3) * 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight edge
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(obs.width * -0.15, obs.height * -0.15, obs.width * 0.25, 0, Math.PI);
    ctx.stroke();
  }

  private renderGates(ctx: CanvasRenderingContext2D) {
    for (const gate of this.gates) {
      if (gate.solved !== null && gate.solved) continue;

      ctx.save();

      const glowColor = gate.solved === false ? '#666' : '#00FF88';
      const alpha = gate.solved === false ? 0.3 : 0.7;

      ctx.globalAlpha = alpha;

      // Gate beam across screen
      const beamGrad = ctx.createLinearGradient(0, gate.y - 2, 0, gate.y + GATE_HEIGHT);
      beamGrad.addColorStop(0, glowColor + '30');
      beamGrad.addColorStop(0.5, glowColor + '15');
      beamGrad.addColorStop(1, glowColor + '05');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, gate.y, CANVAS_WIDTH, GATE_HEIGHT);

      // Top line with glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, gate.y);
      ctx.lineTo(CANVAS_WIDTH, gate.y);
      ctx.stroke();

      // Gate label
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = glowColor;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MATH GATE', CANVAS_WIDTH / 2, gate.y + GATE_HEIGHT / 2 + 4);

      // Side pillars
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = glowColor;
      ctx.fillRect(0, gate.y, 4, GATE_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - 4, gate.y, 4, GATE_HEIGHT);

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      ctx.save();

      if (p.fromBoss) {
        // Boss projectile - red/orange energy orb
        ctx.shadowColor = '#FF4400';
        ctx.shadowBlur = 12;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        grad.addColorStop(0, '#FFCC00');
        grad.addColorStop(0.5, '#FF6600');
        grad.addColorStop(1, '#FF220040');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Player projectile - cyan energy bolt
        ctx.shadowColor = this.profile.cosmetics.color;
        ctx.shadowBlur = 10;

        const grad = ctx.createLinearGradient(p.x, p.y - p.height / 2, p.x, p.y + p.height / 2);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, this.profile.cosmetics.color);
        grad.addColorStop(1, this.profile.cosmetics.color + '40');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderBoss(ctx: CanvasRenderingContext2D) {
    if (!this.boss || this.boss.phase === 'defeated') return;
    const boss = this.boss;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Damage flash
    const flashAlpha = boss.damageFlash > 0 ? 0.5 : 0;

    // Main hexagonal body
    ctx.shadowColor = '#9900FF';
    ctx.shadowBlur = 20;

    const hw = boss.width / 2;
    const hh = boss.height / 2;

    // Shield layer
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#9900FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw + 15, hh + 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Body gradient
    const bodyGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    bodyGrad.addColorStop(0, '#2A1040');
    bodyGrad.addColorStop(0.5, '#3D1060');
    bodyGrad.addColorStop(1, '#1A0830');
    ctx.fillStyle = flashAlpha > 0 ? '#FFFFFF' : bodyGrad;

    // Hex shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = Math.cos(angle) * hw;
      const py = Math.sin(angle) * hh;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = '#9900FF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Central energy core
    const corePhase = Date.now() * 0.003;
    const coreSize = 12 + Math.sin(corePhase) * 3;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.3, '#CC66FF');
    coreGrad.addColorStop(0.7, '#9900FF');
    coreGrad.addColorStop(1, '#9900FF00');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    ctx.fill();

    // Side turret details
    ctx.fillStyle = '#4A2080';
    ctx.fillRect(-hw * 0.8, -8, 12, 16);
    ctx.fillRect(hw * 0.8 - 12, -8, 12, 16);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(-hw * 0.8, 2, 12, 4);
    ctx.fillRect(hw * 0.8 - 12, 2, 12, 4);

    ctx.restore();

    // Health bar above boss
    const barWidth = boss.width * 1.2;
    const barHeight = 6;
    const barX = boss.x - barWidth / 2;
    const barY = boss.y - boss.height / 2 - 18;
    const healthPercent = boss.health / boss.maxHealth;

    ctx.save();
    ctx.fillStyle = '#1A1A2E';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();
    ctx.stroke();

    const healthColor = healthPercent > 0.5 ? '#9900FF' : healthPercent > 0.25 ? '#FF6600' : '#FF0000';
    ctx.fillStyle = healthColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * healthPercent, barHeight, 3);
    ctx.fill();

    // Boss label
    ctx.fillStyle = '#9900FF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', boss.x, barY - 4);
    ctx.restore();
  }

  private renderShip(ctx: CanvasRenderingContext2D) {
    // Respawn blink
    if (this.isInvincible && Math.floor(this.respawnFlashTimer * 8) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.ship.x, this.ship.y);

    const color = this.profile.cosmetics.color;

    // Engine trail
    if (this.profile.cosmetics.trail !== 'none' || true) {
      const trailLen = this.isBoosting ? 50 : 30;
      const trailGrad = ctx.createLinearGradient(0, SHIP_HEIGHT * 0.3, 0, SHIP_HEIGHT * 0.3 + trailLen);
      trailGrad.addColorStop(0, this.isBoosting ? '#00FFFF' : color);
      trailGrad.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(-8, SHIP_HEIGHT * 0.25);
      ctx.lineTo(0, SHIP_HEIGHT * 0.25 + trailLen);
      ctx.lineTo(8, SHIP_HEIGHT * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ship glow
    ctx.shadowColor = color;
    ctx.shadowBlur = this.isBoosting ? 25 : 14;

    // Main body
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;

    // Ship shape - sleek fighter
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_HEIGHT / 2);           // nose
    ctx.lineTo(8, -SHIP_HEIGHT * 0.15);        // right neck
    ctx.lineTo(SHIP_WIDTH / 2, SHIP_HEIGHT * 0.2);   // right wing tip
    ctx.lineTo(SHIP_WIDTH * 0.3, SHIP_HEIGHT * 0.25);  // right wing inner
    ctx.lineTo(SHIP_WIDTH * 0.25, SHIP_HEIGHT * 0.4);   // right engine
    ctx.lineTo(-SHIP_WIDTH * 0.25, SHIP_HEIGHT * 0.4);  // left engine
    ctx.lineTo(-SHIP_WIDTH * 0.3, SHIP_HEIGHT * 0.25);  // left wing inner
    ctx.lineTo(-SHIP_WIDTH / 2, SHIP_HEIGHT * 0.2);   // left wing tip
    ctx.lineTo(-8, -SHIP_HEIGHT * 0.15);       // left neck
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, -SHIP_HEIGHT * 0.2, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing details
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -SHIP_HEIGHT * 0.1);
    ctx.lineTo(-SHIP_WIDTH * 0.35, SHIP_HEIGHT * 0.18);
    ctx.moveTo(4, -SHIP_HEIGHT * 0.1);
    ctx.lineTo(SHIP_WIDTH * 0.35, SHIP_HEIGHT * 0.18);
    ctx.stroke();

    // Engine glow
    ctx.globalAlpha = 0.9;
    const engineGlow = ctx.createRadialGradient(0, SHIP_HEIGHT * 0.42, 2, 0, SHIP_HEIGHT * 0.42, 10);
    engineGlow.addColorStop(0, this.isBoosting ? '#00FFFF' : '#00D9FF');
    engineGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.arc(0, SHIP_HEIGHT * 0.42, 10, 0, Math.PI * 2);
    ctx.fill();

    // Shield ring when invincible
    if (this.isInvincible) {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.15;
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, SHIP_WIDTH * 0.6, SHIP_HEIGHT * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Boost particles
    if (this.isBoosting) {
      this.spawnBoostParticles();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBoostEffect(ctx: CanvasRenderingContext2D) {
    if (!this.isBoosting) return;

    // Subtle blue overlay
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#00D9FF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Speed lines
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const yStart = Math.random() * CANVAS_HEIGHT;
      const len = 30 + Math.random() * 70;
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x, yStart + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderBossWarning(ctx: CanvasRenderingContext2D) {
    if (this.bossWarningTimer <= 0) return;

    const alpha = Math.min(this.bossWarningTimer, 1);
    const flash = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = alpha * flash * 0.8;
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('⚠ BOSS APPROACHING ⚠', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35);
    ctx.restore();
  }

  // ═══════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════

  setGateResult(gateId: string, correct: boolean) {
    const gate = this.gates.find((g) => g.id === gateId);
    if (gate) {
      gate.solved = correct;
      this.callbacks.onGatePass(correct);
      if (correct) {
        this.spawnShardCollectParticles(gate.x, gate.y);
      }
    }
  }

  setBossMathResult(correct: boolean) {
    if (!this.boss) return;
    if (correct) {
      // Bonus damage
      const bonusDamage = Math.ceil(this.boss.maxHealth * 0.3);
      this.boss.health -= bonusDamage;
      this.boss.damageFlash = 0.3;
      this.spawnHitParticles(this.boss.x, this.boss.y, '#FFCC00');

      if (this.boss.health <= 0) {
        this.boss.phase = 'defeated';
        this.spawnBossExplosion(this.boss.x, this.boss.y);
        this.callbacks.onBossDefeated(this.boss.reward);
        this.callbacks.onShardCollect(this.boss.reward);
        this.projectiles = this.projectiles.filter((p) => !p.fromBoss);
        this.lastBossDistance = this.distance;
        setTimeout(() => {
          this.boss = null;
        }, 1500);
      } else {
        this.boss.phase = 'attack';
      }
    } else {
      // Boss heals slightly
      this.boss.health = Math.min(this.boss.maxHealth, this.boss.health + Math.ceil(this.boss.maxHealth * 0.1));
      this.boss.phase = 'attack';
    }
  }

  triggerRespawn() {
    this.isInvincible = true;
    this.respawnTimer = 2.0;
    this.respawnFlashTimer = 0;
    this.callbacks.onRespawn();
  }

  getDistance(): number {
    return this.distance;
  }

  getBoss(): Boss | null {
    return this.boss;
  }

  cleanup() {
    this.stop();
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
