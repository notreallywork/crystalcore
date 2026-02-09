import { motion } from 'framer-motion';
import type { Profile } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { ShardCounter } from '../ui/ShardCounter';

interface UpgradeShopProps {
  profile: Profile;
}

interface UpgradeTier {
  value: number;
  cost: number;
  label: string;
}

interface UpgradeCategory {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tiers: UpgradeTier[];
  getStat: (profile: Profile) => number;
  statKey: keyof Profile['stats'];
}

const UPGRADES: UpgradeCategory[] = [
  {
    key: 'speed',
    name: 'Engine Speed',
    description: 'Increases base flight speed',
    icon: 'S',
    color: '#00D9FF',
    statKey: 'speed',
    getStat: (p) => p.stats.speed,
    tiers: [
      { value: 1.0, cost: 0, label: 'Stock' },
      { value: 1.15, cost: 40, label: 'Tuned' },
      { value: 1.3, cost: 80, label: 'Racing' },
      { value: 1.5, cost: 160, label: 'Turbo' },
      { value: 1.75, cost: 350, label: 'Hyperdrive' },
    ],
  },
  {
    key: 'shield',
    name: 'Shield Capacity',
    description: 'Increases max hit points',
    icon: 'H',
    color: '#FF3366',
    statKey: 'shield',
    getStat: (p) => p.stats.shield,
    tiers: [
      { value: 3, cost: 0, label: '3 HP' },
      { value: 4, cost: 50, label: '4 HP' },
      { value: 5, cost: 100, label: '5 HP' },
      { value: 6, cost: 200, label: '6 HP' },
      { value: 8, cost: 400, label: '8 HP' },
    ],
  },
  {
    key: 'boostDuration',
    name: 'Boost Duration',
    description: 'Longer speed boost from gates',
    icon: 'B',
    color: '#FFD700',
    statKey: 'boostDuration',
    getStat: (p) => p.stats.boostDuration,
    tiers: [
      { value: 3, cost: 0, label: '3s' },
      { value: 4, cost: 40, label: '4s' },
      { value: 5, cost: 80, label: '5s' },
      { value: 7, cost: 160, label: '7s' },
      { value: 10, cost: 350, label: '10s' },
    ],
  },
  {
    key: 'weaponLevel',
    name: 'Weapon Systems',
    description: 'Fire rate and damage upgrades',
    icon: 'W',
    color: '#FF6600',
    statKey: 'weaponLevel',
    getStat: (p) => p.stats.weaponLevel || 1,
    tiers: [
      { value: 1, cost: 0, label: 'Basic' },
      { value: 2, cost: 60, label: 'Rapid I' },
      { value: 3, cost: 120, label: 'Rapid II' },
      { value: 4, cost: 250, label: 'Heavy' },
      { value: 5, cost: 500, label: 'Dual Shot' },
    ],
  },
];

function getCurrentLevel(statValue: number, tiers: UpgradeTier[]): number {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (statValue >= tiers[i].value) return i;
  }
  return 0;
}

export function UpgradeShop({ profile }: UpgradeShopProps) {
  const { updateProfile } = useGameStore();

  const handlePurchase = (upgrade: UpgradeCategory, nextLevel: number) => {
    const tier = upgrade.tiers[nextLevel];
    if (!tier || profile.shards < tier.cost) return;

    const newStats = { ...profile.stats, [upgrade.statKey]: tier.value };
    updateProfile(profile.id, {
      shards: profile.shards - tier.cost,
      stats: newStats,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Shard Display */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <ShardCounter count={profile.shards} size="md" />
        </div>
        <div className="text-white/30 text-xs">Permanent Upgrades</div>
      </div>

      {/* Upgrades List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {UPGRADES.map((upgrade, idx) => {
          const currentLevel = getCurrentLevel(upgrade.getStat(profile), upgrade.tiers);
          const isMaxed = currentLevel >= upgrade.tiers.length - 1;
          const nextTier = isMaxed ? null : upgrade.tiers[currentLevel + 1];
          const canAfford = nextTier ? profile.shards >= nextTier.cost : false;

          return (
            <motion.div
              key={upgrade.key}
              className="bg-white/3 rounded-2xl p-4 border border-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                  style={{
                    backgroundColor: upgrade.color + '20',
                    color: upgrade.color,
                    borderColor: upgrade.color + '30',
                    borderWidth: 1,
                  }}
                >
                  {upgrade.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm">{upgrade.name}</h3>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: upgrade.color + '15',
                        color: upgrade.color,
                      }}
                    >
                      Lv.{currentLevel + 1}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">{upgrade.description}</p>

                  {/* Level progress */}
                  <div className="flex gap-1 mt-2.5 mb-2">
                    {upgrade.tiers.map((tier, i) => (
                      <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full transition-all"
                        style={{
                          backgroundColor:
                            i <= currentLevel ? upgrade.color : 'rgba(255,255,255,0.08)',
                        }}
                        title={tier.label}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/30 text-[10px]">
                      {upgrade.tiers[currentLevel].label}
                      {nextTier ? ` → ${nextTier.label}` : ' (MAX)'}
                    </span>

                    {nextTier && (
                      <motion.button
                        onClick={() => handlePurchase(upgrade, currentLevel + 1)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          canAfford
                            ? 'text-white shadow-md'
                            : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        }`}
                        style={
                          canAfford
                            ? {
                                backgroundColor: upgrade.color + '30',
                                boxShadow: `0 2px 8px ${upgrade.color}20`,
                              }
                            : undefined
                        }
                        whileTap={canAfford ? { scale: 0.95 } : {}}
                      >
                        <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
                        </svg>
                        {nextTier.cost}
                      </motion.button>
                    )}

                    {isMaxed && (
                      <span className="text-green-400/60 text-xs font-medium">MAXED</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
