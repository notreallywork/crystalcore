// Crystal Core - TypeScript Type Definitions

export type ProfileId = string;
export type SteeringMode = 'auto' | 'manual';
export type GateType = 'green' | 'purple' | 'skip';
export type NodeType = 'stat' | 'cosmetic' | 'milestone';
export type InteractionType = 'drag' | 'numpad';
export type CompetencyLevel = 'beginner' | 'intermediate' | 'advanced';
export type PowerupType = 'shield' | 'boost' | 'weapon' | 'magnet';

export interface Profile {
  id: ProfileId;
  name: string;
  age: number;
  competency: CompetencyLevel;
  shards: number;
  /** Per-branch unlock progress (replaces the old flat treeIndex). */
  branchProgress: { stats: number; colors: number; trails: number; shapes: number };
  unlockedNodes: string[];
  difficulty: number;
  stats: {
    speed: number;
    shield: number;
    boostDuration: number;
    weaponLevel: number;
  };
  /** The currently equipped cosmetics. */
  cosmetics: {
    color: string;
    trail: string;
    shipShape: string;
  };
  /** Every cosmetic the player has ever purchased, indexed by category. */
  ownedCosmetics: {
    colors: string[];
    trails: string[];
    shapes: string[];
  };
  preferences: {
    steering: SteeringMode;
  };
  lastPlayed: string | null;
  totalDistance: number;
  totalRaces: number;
  bestDistance: number;
  completedStages: string[];
}

export interface StageConfig {
  id: string;
  name: string;
  worldId: number;
  gateCount: number;
  hasBoss: boolean;
}

export interface GameState {
  profiles: Profile[];
  activeProfileId: ProfileId | null;
  version: number;
}

export interface RaceSession {
  distance: number;
  shardsCollected: number;
  gatesPassed: number;
  gatesAttempted: number;
  correctAnswers: number;
  isRunning: boolean;
  shieldHits: number;
  isBoosting: boolean;
  boostTimeLeft: number;
  bossesDefeated: number;
  rocksDestroyed: number;
}

export interface MathProblem {
  id: string;
  visual: string;
  interaction: InteractionType;
  problemText: string | null;
  variables?: Record<string, number[]>;
  validation: string | { target: number; tolerance: number };
  hint: string;
  setup?: {
    pileA?: { count: number; color: string; shape: string };
    pileB?: { count: number; color: string; shape: string };
  };
}

export interface GateConfig {
  difficultyId: string;
  targetAge: number;
  gateType: GateType;
  solveTime: number;
  reward: number;
  templates: MathProblem[];
}

export interface TechTreeNode {
  id: string;
  cost: number;
  type: NodeType;
  /** Which branch this node belongs to: 'stats' | 'colors' | 'trails' | 'shapes' */
  branch: string;
  stat?: string;
  value?: number;
  effect?: string;
  visual: string;
  name: string;
  description: string;
}

export interface TechTreeData {
  profile: string;
  nodes: TechTreeNode[];
}

export interface TrackTheme {
  bgColor: string;
  crystalColor: string;
  speed: number;
  obstacleDensity: number;
  gridColor: string;
}

export interface TrackConfig {
  id: string;
  unlockRequirement: number;
  theme: TrackTheme;
  gateFrequency: number;
  difficultyScaling: number;
  name: string;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'crystal' | 'rock';
}

export interface Gate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: GateType;
  problem: MathProblem | null;
  solved: boolean | null;
  approached: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ShipState {
  x: number;
  targetX: number;
  width: number;
  height: number;
}

export interface SessionResults {
  gatesAttempted: number;
  correctAnswers: number;
  avgTime: number;
}
