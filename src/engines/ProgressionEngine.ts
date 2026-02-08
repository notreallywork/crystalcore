import type { Profile, TechTreeNode, TrackConfig, TechTreeData } from '@/types';
import emersonTreeData from '@/content/trees/emerson-tree.json';
import kyraTreeData from '@/content/trees/kyra-tree.json';
import rubyFlatsData from '@/content/tracks/ruby-flats.json';
import sapphireCavernsData from '@/content/tracks/sapphire-caverns.json';

const emersonTree = emersonTreeData as TechTreeData;
const kyraTree = kyraTreeData as TechTreeData;
const rubyFlats = rubyFlatsData as TrackConfig;
const sapphireCaverns = sapphireCavernsData as TrackConfig;

export class ProgressionEngine {
  static getTechTree(profile: Profile): TechTreeData {
    return profile.age <= 8 ? emersonTree : kyraTree;
  }

  static getCurrentNode(profile: Profile): TechTreeNode | null {
    const tree = this.getTechTree(profile);
    if (profile.treeIndex >= tree.nodes.length) {
      return null;
    }
    return tree.nodes[profile.treeIndex];
  }

  static getNextNode(profile: Profile): TechTreeNode | null {
    const tree = this.getTechTree(profile);
    if (profile.treeIndex + 1 >= tree.nodes.length) {
      return null;
    }
    return tree.nodes[profile.treeIndex + 1];
  }

  static getAllNodes(profile: Profile): TechTreeNode[] {
    const tree = this.getTechTree(profile);
    return tree.nodes;
  }

  static canAffordNode(profile: Profile, node: TechTreeNode): boolean {
    return profile.shards >= node.cost;
  }

  static isNodeUnlocked(profile: Profile, nodeIndex: number): boolean {
    return nodeIndex < profile.treeIndex;
  }

  static isNodeCurrent(profile: Profile, nodeIndex: number): boolean {
    return nodeIndex === profile.treeIndex;
  }

  static isNodeLocked(profile: Profile, nodeIndex: number): boolean {
    return nodeIndex > profile.treeIndex;
  }

  static getUnlockedTracks(profile: Profile): TrackConfig[] {
    const tracks: TrackConfig[] = [rubyFlats];

    if (profile.treeIndex >= 5) {
      tracks.push(sapphireCaverns);
    }

    return tracks;
  }

  static getCurrentTrack(profile: Profile): TrackConfig {
    const tracks = this.getUnlockedTracks(profile);
    return tracks[tracks.length - 1];
  }

  static calculateProgress(profile: Profile): number {
    const tree = this.getTechTree(profile);
    return (profile.treeIndex / tree.nodes.length) * 100;
  }

  static getTotalShardsSpent(profile: Profile): number {
    const tree = this.getTechTree(profile);
    let total = 0;
    for (let i = 0; i < profile.treeIndex && i < tree.nodes.length; i++) {
      total += tree.nodes[i].cost;
    }
    return total;
  }

  static getShardsToNextMilestone(profile: Profile): { current: number; needed: number; nextNode: TechTreeNode | null } {
    const tree = this.getTechTree(profile);
    let shardsNeeded = 0;
    let nextMilestone: TechTreeNode | null = null;

    for (let i = profile.treeIndex; i < tree.nodes.length; i++) {
      shardsNeeded += tree.nodes[i].cost;
      if (tree.nodes[i].type === 'milestone' || i === profile.treeIndex) {
        nextMilestone = tree.nodes[i];
        break;
      }
    }

    return {
      current: profile.shards,
      needed: shardsNeeded,
      nextNode: nextMilestone,
    };
  }
}
