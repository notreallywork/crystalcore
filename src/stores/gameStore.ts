import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, ProfileId, RaceSession, TechTreeNode } from '@/types';
import { ProgressionEngine } from '@/engines/ProgressionEngine';

const CURRENT_VERSION = 1;

const defaultEmersonProfile: Profile = {
  id: 'emerson',
  shards: 0,
  treeIndex: 0,
  unlockedNodes: [],
  difficulty: 1,
  stats: {
    speed: 1.0,
    shield: 3,
    boostDuration: 3,
  },
  cosmetics: {
    color: '#00D9FF',
    trail: 'none',
    shipShape: 'default',
  },
  preferences: {
    steering: 'auto',
  },
  lastPlayed: null,
};

const defaultKyraProfile: Profile = {
  id: 'kyra',
  shards: 0,
  treeIndex: 0,
  unlockedNodes: [],
  difficulty: 1,
  stats: {
    speed: 1.0,
    shield: 3,
    boostDuration: 3,
  },
  cosmetics: {
    color: '#9D00FF',
    trail: 'none',
    shipShape: 'default',
  },
  preferences: {
    steering: 'manual',
  },
  lastPlayed: null,
};

interface GameStoreState {
  emerson: Profile;
  kyra: Profile;
  activeProfile: ProfileId | null;
  version: number;
  currentRun: RaceSession | null;
}

interface GameStoreActions {
  // Actions
  setActiveProfile: (profile: ProfileId) => void;
  startRace: () => void;
  endRace: () => void;
  collectShards: (amount: number) => void;
  hitObstacle: () => boolean;
  passGate: (correct: boolean) => void;
  activateBoost: () => void;
  updateDistance: (distance: number) => void;
  
  // Tech Tree
  canAffordNode: (node: TechTreeNode) => boolean;
  purchaseNode: (node: TechTreeNode) => boolean;
  
  // Profile
  updateProfile: (profileId: ProfileId, updates: Partial<Profile>) => void;
  getActiveProfileData: () => Profile | null;
  
  // Difficulty
  adjustDifficulty: (sessionResults: { gatesAttempted: number; correctAnswers: number; avgTime: number }) => void;
  
  // Reset
  resetProfile: (profileId: ProfileId) => void;
}

type GameStore = GameStoreState & GameStoreActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      emerson: { ...defaultEmersonProfile },
      kyra: { ...defaultKyraProfile },
      activeProfile: null,
      version: CURRENT_VERSION,
      currentRun: null,

      setActiveProfile: (profile) => {
        set((state) => ({
          activeProfile: profile,
          [profile]: {
            ...state[profile],
            lastPlayed: new Date().toISOString(),
          },
        }));
      },

      startRace: () => {
        const profile = get().getActiveProfileData();
        if (!profile) return;
        
        set({
          currentRun: {
            distance: 0,
            shardsCollected: 0,
            gatesPassed: 0,
            gatesAttempted: 0,
            correctAnswers: 0,
            isRunning: true,
            shieldHits: 0,
            isBoosting: false,
            boostTimeLeft: 0,
          },
        });
      },

      endRace: () => {
        const { currentRun, activeProfile } = get();
        if (!currentRun || !activeProfile) return;

        set((state) => ({
          [activeProfile]: {
            ...state[activeProfile],
            shards: state[activeProfile].shards + currentRun.shardsCollected,
          },
          currentRun: null,
        }));
      },

      collectShards: (amount) => {
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              shardsCollected: state.currentRun.shardsCollected + amount,
            },
          };
        });
      },

      hitObstacle: () => {
        const { currentRun, activeProfile, emerson, kyra } = get();
        if (!currentRun || !activeProfile) return false;

        const profile = activeProfile === 'emerson' ? emerson : kyra;
        const newHits = currentRun.shieldHits + 1;
        const maxHits = profile.stats.shield;

        if (newHits >= maxHits) {
          // Shield depleted - respawn at checkpoint
          set((state) => ({
            currentRun: {
              ...state.currentRun!,
              shieldHits: 0,
            },
          }));
          return true; // Indicates respawn needed
        }

        set((state) => ({
          currentRun: {
            ...state.currentRun!,
            shieldHits: newHits,
          },
        }));
        return false;
      },

      passGate: (correct) => {
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              gatesPassed: state.currentRun.gatesPassed + 1,
              gatesAttempted: state.currentRun.gatesAttempted + 1,
              correctAnswers: state.currentRun.correctAnswers + (correct ? 1 : 0),
            },
          };
        });
      },

      activateBoost: () => {
        const { activeProfile, emerson, kyra } = get();
        if (!activeProfile) return;
        
        const profile = activeProfile === 'emerson' ? emerson : kyra;
        
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              isBoosting: true,
              boostTimeLeft: profile.stats.boostDuration,
            },
          };
        });
      },

      updateDistance: (distance) => {
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              distance: state.currentRun.distance + distance,
            },
          };
        });
      },

      canAffordNode: (node) => {
        const { activeProfile, emerson, kyra } = get();
        if (!activeProfile) return false;
        const profile = activeProfile === 'emerson' ? emerson : kyra;
        return profile.shards >= node.cost;
      },

      purchaseNode: (node) => {
        const { activeProfile, canAffordNode } = get();
        if (!activeProfile) return false;
        if (!canAffordNode(node)) return false;

        set((state) => {
          const profile = state[activeProfile];
          const tree = ProgressionEngine.getTechTree(activeProfile);
          const nodeIndex = tree.nodes.findIndex((n) => n.id === node.id);
          
          if (nodeIndex === -1) return state;
          if (nodeIndex !== profile.treeIndex) return state;

          // Apply stat upgrades
          const updates: Partial<Profile> = {
            shards: profile.shards - node.cost,
            treeIndex: profile.treeIndex + 1,
            unlockedNodes: [...profile.unlockedNodes, node.id],
          };

          if (node.type === 'stat' && node.stat) {
            if (node.stat === 'speed') {
              updates.stats = { ...profile.stats, speed: node.value || profile.stats.speed };
            } else if (node.stat === 'shield') {
              updates.stats = { ...profile.stats, shield: node.value || profile.stats.shield };
            } else if (node.stat === 'boostDuration') {
              updates.stats = { ...profile.stats, boostDuration: node.value || profile.stats.boostDuration };
            }
          } else if (node.type === 'cosmetic' && node.effect) {
            if (node.visual === 'paint-ship') {
              updates.cosmetics = { ...profile.cosmetics, color: node.effect };
            } else if (node.visual === 'add-trail') {
              updates.cosmetics = { ...profile.cosmetics, trail: node.effect };
            } else if (node.visual === 'change-shape') {
              updates.cosmetics = { ...profile.cosmetics, shipShape: node.effect };
            }
          }

          return {
            [activeProfile]: {
              ...profile,
              ...updates,
            },
          };
        });

        return true;
      },

      updateProfile: (profileId, updates) => {
        set((state) => ({
          [profileId]: {
            ...state[profileId],
            ...updates,
          },
        }));
      },

      getActiveProfileData: () => {
        const { activeProfile, emerson, kyra } = get();
        if (!activeProfile) return null;
        return activeProfile === 'emerson' ? emerson : kyra;
      },

      adjustDifficulty: (sessionResults) => {
        const { activeProfile } = get();
        if (!activeProfile) return;

        const accuracy = sessionResults.gatesAttempted > 0 
          ? sessionResults.correctAnswers / sessionResults.gatesAttempted 
          : 0.5;

        set((state) => {
          const profile = state[activeProfile];
          let newDifficulty = profile.difficulty;

          if (accuracy > 0.8 && profile.difficulty < 5) {
            newDifficulty = profile.difficulty + 1;
          } else if (accuracy < 0.4 && profile.difficulty > 1) {
            newDifficulty = profile.difficulty - 1;
          }

          if (newDifficulty !== profile.difficulty) {
            return {
              [activeProfile]: {
                ...profile,
                difficulty: newDifficulty,
              },
            };
          }
          return state;
        });
      },

      resetProfile: (profileId) => {
        set({
          [profileId]: profileId === 'emerson' 
            ? { ...defaultEmersonProfile } 
            : { ...defaultKyraProfile },
        });
      },
    }),
    {
      name: 'crystal-core-storage',
      version: CURRENT_VERSION,
      partialize: (state) => ({
        emerson: state.emerson,
        kyra: state.kyra,
        activeProfile: state.activeProfile,
        version: state.version,
      }),
    }
  )
);
