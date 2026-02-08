// Crystal Core - TypeScript Type Definitions

export type ProfileId = string;
export type SteeringMode = 'auto' | 'manual';
export type GateType = 'green' | 'purple' | 'skip';
export type NodeType = 'stat' | 'cosmetic' | 'milestone';
export type InteractionType = 'drag' | 'numpad';
export type CompetencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  id: ProfileId;
  name: string;
  age: number;
  competency: CompetencyLevel;
  shards: number;
  treeIndex: number;
  unlockedNodes: string[];
  difficulty: number;
  stats: {
    speed: number;
    shield: number;
    boostDuration: number;
  };
  cosmetics: {
    color: string;
    trail: string;
    shipShape: string;
  };
  preferences: {
    steering: SteeringMode;
  };
  lastPlayed: string | null;
  totalDistance: number;
  totalRaces: number;
  bestDistance: number;
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
  lane: number;
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
  lane: number;
  width: number;
  height: number;
}

export interface SessionResults {
  gatesAttempted: number;
  correctAnswers: number;
  avgTime: number;
}
