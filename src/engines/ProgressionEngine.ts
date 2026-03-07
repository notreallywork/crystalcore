import type { Profile, TechTreeNode, TrackConfig, TechTreeData } from '@/types';
import emersonTreeData from '@/content/trees/emerson-tree.json';
import kyraTreeData from '@/content/trees/kyra-tree.json';
import rubyFlatsData from '@/content/tracks/ruby-flats.json';
import sapphireCavernsData from '@/content/tracks/sapphire-caverns.json';

const emersonTree = emersonTreeData as TechTreeData;
const kyraTree = kyraTreeData as TechTreeData;
const rubyFlats = rubyFlatsData as TrackConfig;
const sapphireCaverns = sapphireCavernsData as TrackConfig;

export const BRANCHES = ['stats', 'colors', 'trails', 'shapes'] as const;
export type Branch = typeof BRANCHES[number];

export const BRANCH_LABELS: Record<Branch, string> = {
  stats:  'Stats',
  colors: 'Colors',
  trails: 'Trails',
  shapes: 'Skins',
};

export const BRANCH_ICONS: Record<Branch, string> = {
  stats:  '⚡',
  colors: '🎨',
  trails: '✨',
  shapes: '🚀',
};

export class ProgressionEngine {
  static getTechTree(profile: Profile): TechTreeData {
    return profile.age <= 8 ? emersonTree : kyraTree;
  }

  static getAllNodes(profile: Profile): TechTreeNode[] {
    return this.getTechTree(profile).nodes;
  }

  static getBranchNodes(profile: Profile, branch: string): TechTreeNode[] {
    return this.getTechTree(profile).nodes.filter((n) => n.branch === branch);
  }

  static getBranchProgress(profile: Profile, branch: string): number {
    return profile.branchProgress[branch as keyof typeof profile.branchProgress] ?? 0;
  }

  /** Returns the status of a node within its own branch. */
  static getNodeStatus(
    profile: Profile,
    node: TechTreeNode,
  ): 'unlocked' | 'current' | 'locked' {
    const branchNodes = this.getBranchNodes(profile, node.branch);
    const indexInBranch = branchNodes.findIndex((n) => n.id === node.id);
    const progress = this.getBranchProgress(profile, node.branch);

    if (indexInBranch < progress) return 'unlocked';
    if (indexInBranch === progress) return 'current';
    return 'locked';
  }

  static canAffordNode(profile: Profile, node: TechTreeNode): boolean {
    return profile.shards >= node.cost;
  }

  static getUnlockedTracks(profile: Profile): TrackConfig[] {
    const tracks: TrackConfig[] = [rubyFlats];
    if (profile.unlockedNodes.includes('milestone-sapphire')) {
      tracks.push(sapphireCaverns);
    }
    return tracks;
  }

  static getCurrentTrack(profile: Profile): TrackConfig {
    const tracks = this.getUnlockedTracks(profile);
    return tracks[tracks.length - 1];
  }

  /** Total nodes unlocked across all branches. */
  static getTotalUnlocked(profile: Profile): number {
    return Object.values(profile.branchProgress).reduce((a, b) => a + b, 0);
  }

  /** Progress as a percentage (0-100) across all branches. */
  static calculateProgress(profile: Profile): number {
    const tree = this.getTechTree(profile);
    const total = tree.nodes.length;
    if (total === 0) return 0;
    return (this.getTotalUnlocked(profile) / total) * 100;
  }

  static getTotalShardsSpent(profile: Profile): number {
    const tree = this.getTechTree(profile);
    return tree.nodes
      .filter((n) => profile.unlockedNodes.includes(n.id))
      .reduce((sum, n) => sum + n.cost, 0);
  }

  /** Returns the next unlockable node across all branches and how many shards are needed. */
  static getShardsToNextMilestone(
    profile: Profile,
  ): { current: number; needed: number; nextNode: TechTreeNode | null } {
    const tree = this.getTechTree(profile);
    let cheapest: TechTreeNode | null = null;

    for (const branch of BRANCHES) {
      const branchNodes = tree.nodes.filter((n) => n.branch === branch);
      const progress = this.getBranchProgress(profile, branch);
      if (progress < branchNodes.length) {
        const next = branchNodes[progress];
        if (!cheapest || next.cost < cheapest.cost) {
          cheapest = next;
        }
      }
    }

    return {
      current: profile.shards,
      needed: cheapest?.cost ?? 0,
      nextNode: cheapest,
    };
  }
}
