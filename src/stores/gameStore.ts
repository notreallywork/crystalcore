import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, ProfileId, RaceSession, TechTreeNode, CompetencyLevel } from '@/types';
import { ProgressionEngine } from '@/engines/ProgressionEngine';

const CURRENT_VERSION = 3;

const SHIP_COLORS = [
  '#00D9FF', '#9D00FF', '#00FF88', '#FF3366', '#FFD700',
  '#FF6B35', '#00BFFF', '#FF1493', '#7CFC00', '#FF4500',
];

export function createProfile(
  name: string,
  age: number,
  competency: CompetencyLevel,
): Profile {
  const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const colorIndex = Math.floor(Math.random() * SHIP_COLORS.length);
  const isYoung = age <= 8;

  return {
    id,
    name,
    age,
    competency,
    shards: 0,
    treeIndex: 0,
    unlockedNodes: [],
    difficulty: competency === 'beginner' ? 1 : competency === 'intermediate' ? 2 : 3,
    stats: {
      speed: 1.0,
      shield: 3,
      boostDuration: 3,
      weaponLevel: 1,
    },
    cosmetics: {
      color: SHIP_COLORS[colorIndex],
      trail: 'none',
      shipShape: 'default',
    },
    preferences: {
      steering: isYoung ? 'auto' : 'manual',
    },
    lastPlayed: null,
    totalDistance: 0,
    totalRaces: 0,
    bestDistance: 0,
  };
}

interface GameStoreState {
  profiles: Profile[];
  activeProfileId: ProfileId | null;
  version: number;
  currentRun: RaceSession | null;
}

interface GameStoreActions {
  addProfile: (name: string, age: number, competency: CompetencyLevel) => Profile;
  deleteProfile: (profileId: ProfileId) => void;
  setActiveProfile: (profileId: ProfileId) => void;
  getActiveProfile: () => Profile | null;
  getProfile: (profileId: ProfileId) => Profile | null;

  startRace: () => void;
  endRace: () => void;
  collectShards: (amount: number) => void;
  hitObstacle: () => boolean;
  passGate: (correct: boolean) => void;
  activateBoost: () => void;
  decayBoost: (deltaTime: number) => void;
  updateDistance: (distance: number) => void;
  destroyRock: () => void;
  defeatBoss: () => void;

  canAffordNode: (node: TechTreeNode) => boolean;
  purchaseNode: (node: TechTreeNode) => boolean;

  updateProfile: (profileId: ProfileId, updates: Partial<Profile>) => void;
  adjustDifficulty: (sessionResults: { gatesAttempted: number; correctAnswers: number; avgTime: number }) => void;
  resetProfile: (profileId: ProfileId) => void;
}

type GameStore = GameStoreState & GameStoreActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      version: CURRENT_VERSION,
      currentRun: null,

      addProfile: (name, age, competency) => {
        const profile = createProfile(name, age, competency);
        set((state) => ({
          profiles: [...state.profiles, profile],
        }));
        return profile;
      },

      deleteProfile: (profileId) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
          activeProfileId: state.activeProfileId === profileId ? null : state.activeProfileId,
        }));
      },

      setActiveProfile: (profileId) => {
        set((state) => ({
          activeProfileId: profileId,
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, lastPlayed: new Date().toISOString() }
              : p
          ),
        }));
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        if (!activeProfileId) return null;
        return profiles.find((p) => p.id === activeProfileId) || null;
      },

      getProfile: (profileId) => {
        return get().profiles.find((p) => p.id === profileId) || null;
      },

      startRace: () => {
        const profile = get().getActiveProfile();
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
            bossesDefeated: 0,
            rocksDestroyed: 0,
          },
        });
      },

      endRace: () => {
        const { currentRun, activeProfileId } = get();
        if (!currentRun || !activeProfileId) return;

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === activeProfileId
              ? {
                  ...p,
                  shards: p.shards + currentRun.shardsCollected,
                  totalDistance: p.totalDistance + currentRun.distance,
                  totalRaces: p.totalRaces + 1,
                  bestDistance: Math.max(p.bestDistance, currentRun.distance),
                }
              : p
          ),
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
        const { currentRun, activeProfileId, profiles } = get();
        if (!currentRun || !activeProfileId) return false;

        const profile = profiles.find((p) => p.id === activeProfileId);
        if (!profile) return false;

        const newHits = currentRun.shieldHits + 1;
        const maxHits = profile.stats.shield;

        if (newHits >= maxHits) {
          set((state) => ({
            currentRun: {
              ...state.currentRun!,
              shieldHits: 0,
            },
          }));
          return true;
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
        const profile = get().getActiveProfile();
        if (!profile) return;

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

      decayBoost: (deltaTime) => {
        set((state) => {
          if (!state.currentRun || !state.currentRun.isBoosting) return state;
          const newTimeLeft = state.currentRun.boostTimeLeft - deltaTime;
          if (newTimeLeft <= 0) {
            return {
              currentRun: {
                ...state.currentRun,
                isBoosting: false,
                boostTimeLeft: 0,
              },
            };
          }
          return {
            currentRun: {
              ...state.currentRun,
              boostTimeLeft: newTimeLeft,
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

      destroyRock: () => {
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              rocksDestroyed: state.currentRun.rocksDestroyed + 1,
            },
          };
        });
      },

      defeatBoss: () => {
        set((state) => {
          if (!state.currentRun) return state;
          return {
            currentRun: {
              ...state.currentRun,
              bossesDefeated: state.currentRun.bossesDefeated + 1,
            },
          };
        });
      },

      canAffordNode: (node) => {
        const profile = get().getActiveProfile();
        if (!profile) return false;
        return profile.shards >= node.cost;
      },

      purchaseNode: (node) => {
        const { activeProfileId, canAffordNode } = get();
        if (!activeProfileId) return false;
        if (!canAffordNode(node)) return false;

        set((state) => {
          const profile = state.profiles.find((p) => p.id === activeProfileId);
          if (!profile) return state;

          const tree = ProgressionEngine.getTechTree(profile);
          const nodeIndex = tree.nodes.findIndex((n) => n.id === node.id);

          if (nodeIndex === -1) return state;
          if (nodeIndex !== profile.treeIndex) return state;

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
            profiles: state.profiles.map((p) =>
              p.id === activeProfileId ? { ...p, ...updates } : p
            ),
          };
        });

        return true;
      },

      updateProfile: (profileId, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId ? { ...p, ...updates } : p
          ),
        }));
      },

      adjustDifficulty: (sessionResults) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        const accuracy = sessionResults.gatesAttempted > 0
          ? sessionResults.correctAnswers / sessionResults.gatesAttempted
          : 0.5;

        set((state) => {
          const profile = state.profiles.find((p) => p.id === activeProfileId);
          if (!profile) return state;

          let newDifficulty = profile.difficulty;
          if (accuracy > 0.8 && profile.difficulty < 5) {
            newDifficulty = profile.difficulty + 1;
          } else if (accuracy < 0.4 && profile.difficulty > 1) {
            newDifficulty = profile.difficulty - 1;
          }

          if (newDifficulty !== profile.difficulty) {
            return {
              profiles: state.profiles.map((p) =>
                p.id === activeProfileId ? { ...p, difficulty: newDifficulty } : p
              ),
            };
          }
          return state;
        });
      },

      resetProfile: (profileId) => {
        set((state) => {
          const profile = state.profiles.find((p) => p.id === profileId);
          if (!profile) return state;

          const reset = createProfile(profile.name, profile.age, profile.competency);
          return {
            profiles: state.profiles.map((p) =>
              p.id === profileId ? { ...reset, id: profileId } : p
            ),
          };
        });
      },
    }),
    {
      name: 'crystal-core-storage',
      version: CURRENT_VERSION,
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        version: state.version,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          const profiles: Profile[] = [];
          const oldEmerson = state.emerson as Record<string, unknown> | undefined;
          const oldKyra = state.kyra as Record<string, unknown> | undefined;

          if (oldEmerson) {
            profiles.push({
              id: 'emerson',
              name: 'Emerson',
              age: 7,
              competency: 'beginner' as const,
              shards: (oldEmerson.shards as number) || 0,
              treeIndex: (oldEmerson.treeIndex as number) || 0,
              unlockedNodes: (oldEmerson.unlockedNodes as string[]) || [],
              difficulty: (oldEmerson.difficulty as number) || 1,
              stats: { speed: 1.0, shield: 3, boostDuration: 3, weaponLevel: 1, ...((oldEmerson.stats as Partial<Profile['stats']>) || {}) },
              cosmetics: (oldEmerson.cosmetics as Profile['cosmetics']) || { color: '#00D9FF', trail: 'none', shipShape: 'default' },
              preferences: (oldEmerson.preferences as Profile['preferences']) || { steering: 'auto' },
              lastPlayed: (oldEmerson.lastPlayed as string) || null,
              totalDistance: 0,
              totalRaces: 0,
              bestDistance: 0,
            });
          }

          if (oldKyra) {
            profiles.push({
              id: 'kyra',
              name: 'Kyra',
              age: 11,
              competency: 'intermediate' as const,
              shards: (oldKyra.shards as number) || 0,
              treeIndex: (oldKyra.treeIndex as number) || 0,
              unlockedNodes: (oldKyra.unlockedNodes as string[]) || [],
              difficulty: (oldKyra.difficulty as number) || 1,
              stats: { speed: 1.0, shield: 3, boostDuration: 3, weaponLevel: 1, ...((oldKyra.stats as Partial<Profile['stats']>) || {}) },
              cosmetics: (oldKyra.cosmetics as Profile['cosmetics']) || { color: '#9D00FF', trail: 'none', shipShape: 'default' },
              preferences: (oldKyra.preferences as Profile['preferences']) || { steering: 'manual' },
              lastPlayed: (oldKyra.lastPlayed as string) || null,
              totalDistance: 0,
              totalRaces: 0,
              bestDistance: 0,
            });
          }

          return {
            profiles,
            activeProfileId: state.activeProfile || null,
            version: CURRENT_VERSION,
            currentRun: null,
          };
        }
        // v2 -> v3: add weaponLevel to existing profiles
        if (version < 3) {
          const profiles = (state.profiles as Profile[]) || [];
          return {
            ...state,
            profiles: profiles.map((p) => ({
              ...p,
              stats: {
                ...p.stats,
                weaponLevel: p.stats.weaponLevel || 1,
              },
            })),
            version: CURRENT_VERSION,
          };
        }
        return state;
      },
    }
  )
);
