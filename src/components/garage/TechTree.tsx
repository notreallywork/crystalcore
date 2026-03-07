import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, TechTreeNode } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { ProgressionEngine, BRANCHES, BRANCH_LABELS, BRANCH_ICONS, type Branch } from '@/engines/ProgressionEngine';
import { ShardCounter } from '../ui/ShardCounter';

interface TechTreeProps {
  profile: Profile;
}

export function TechTree({ profile }: TechTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeBranch, setActiveBranch] = useState<Branch>('stats');
  const [selectedNode, setSelectedNode] = useState<TechTreeNode | null>(null);
  const { purchaseNode, equipCosmetic } = useGameStore();
  const canAfford = (node: TechTreeNode) => profile.shards >= node.cost;

  const branchNodes = ProgressionEngine.getBranchNodes(profile, activeBranch);

  const handlePurchase = (node: TechTreeNode) => {
    const success = purchaseNode(node);
    if (success) setSelectedNode(null);
  };

  const getNodeBg = (status: ReturnType<typeof ProgressionEngine.getNodeStatus>) => {
    if (status === 'unlocked') return 'bg-green-500/15 border-green-500/40';
    if (status === 'current')  return 'bg-cyan-500/10 border-cyan-500/30';
    return 'bg-gray-800/30 border-gray-700/20';
  };

  const getNodeColor = (status: ReturnType<typeof ProgressionEngine.getNodeStatus>, node: TechTreeNode) => {
    if (status === 'unlocked') return '#22c55e';
    if (status === 'current')  return canAfford(node) ? '#00D9FF' : '#6B7280';
    return '#374151';
  };

  // ── Cosmetic equip helpers ──────────────────────────────────────────────────
  const ownedColors  = profile.ownedCosmetics?.colors  ?? [];
  const ownedTrails  = profile.ownedCosmetics?.trails  ?? [];
  const ownedShapes  = profile.ownedCosmetics?.shapes  ?? [];

  const showEquipPanel =
    (activeBranch === 'colors'  && ownedColors.length  > 0) ||
    (activeBranch === 'trails'  && ownedTrails.length  > 0) ||
    (activeBranch === 'shapes'  && ownedShapes.length  > 0);

  const equipItems = activeBranch === 'colors'
    ? ownedColors
    : activeBranch === 'trails'
    ? ownedTrails
    : ownedShapes;

  const activeEquip =
    activeBranch === 'colors'  ? profile.cosmetics.color :
    activeBranch === 'trails'  ? profile.cosmetics.trail :
    activeBranch === 'shapes'  ? profile.cosmetics.shipShape : '';

  const TRAIL_LABEL: Record<string, string> = {
    sparkle: '✨ Sparkle', fire: '🔥 Fire', rainbow: '🌈 Rainbow',
    electric: '⚡ Electric', void: '🌑 Void', nebula: '🌌 Nebula',
  };
  const SHAPE_LABEL: Record<string, string> = {
    default: '🚀 Default',  rocket: '🚀 Rocket',    ufo: '🛸 UFO',
    star: '⭐ Star',         'crazy-cat': '🐱 Cat',  stealth: '✈️ Stealth',
    phantom: '👻 Phantom',  dragon: '🐉 Dragon',    ninja: '🌟 Ninja Star',
    diamond: '💎 Diamond',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header: shards + overall progress */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/3 border-b border-white/5 shrink-0">
        <ShardCounter count={profile.shards} size="md" />
        <div className="text-white/30 text-xs">
          {ProgressionEngine.getTotalUnlocked(profile)} / {ProgressionEngine.getAllNodes(profile).length} unlocked
        </div>
      </div>

      {/* Branch tabs */}
      <div className="flex border-b border-white/8 shrink-0 bg-black/20">
        {BRANCHES.map((branch) => {
          const progress = ProgressionEngine.getBranchProgress(profile, branch);
          const total    = ProgressionEngine.getBranchNodes(profile, branch).length;
          const active   = branch === activeBranch;
          return (
            <button
              key={branch}
              onClick={() => { setActiveBranch(branch); setSelectedNode(null); }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all relative ${
                active ? 'text-white' : 'text-white/35 hover:text-white/60'
              }`}
            >
              <span className="text-base leading-none block">{BRANCH_ICONS[branch]}</span>
              <span className="block mt-0.5">{BRANCH_LABELS[branch]}</span>
              <span className={`block text-[9px] mt-0.5 ${active ? 'text-cyan-400' : 'text-white/20'}`}>
                {progress}/{total}
              </span>
              {active && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  layoutId="branch-indicator"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Equip loadout panel for cosmetic branches */}
      <AnimatePresence>
        {showEquipPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="px-4 py-2.5 bg-white/3 border-b border-white/8">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2">
                Equipped — tap to switch
              </p>
              <div className="flex gap-2 flex-wrap">
                {equipItems.map((val) => {
                  const isActive = val === activeEquip;
                  const label =
                    activeBranch === 'colors' ? null :
                    activeBranch === 'trails' ? TRAIL_LABEL[val] ?? val :
                    SHAPE_LABEL[val] ?? val;

                  return (
                    <motion.button
                      key={val}
                      onClick={() =>
                        equipCosmetic(
                          activeBranch === 'colors' ? 'color' :
                          activeBranch === 'trails' ? 'trail' : 'shape',
                          val,
                        )
                      }
                      whileTap={{ scale: 0.92 }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                          : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {activeBranch === 'colors' && (
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 inline-block shrink-0"
                          style={{ backgroundColor: val }}
                        />
                      )}
                      {label && <span>{label}</span>}
                      {isActive && <span className="text-cyan-400 text-[10px]">✓</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch node list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden px-6 min-h-0"
      >
        <div className="flex items-center h-full min-w-max py-6 gap-3">
          {branchNodes.map((node, index) => {
            const status = ProgressionEngine.getNodeStatus(profile, node);
            const affordable = canAfford(node);
            const isCurrent = status === 'current';

            return (
              <div key={node.id} className="flex items-center">
                {/* Connector */}
                {index > 0 && (
                  <div className={`w-6 h-0.5 ${status === 'unlocked' || (isCurrent) ? 'bg-green-500/30' : 'bg-gray-700/30'}`} />
                )}

                {/* Node button */}
                <motion.button
                  onClick={() => setSelectedNode(node)}
                  className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 ${
                    getNodeBg(status)
                  } ${isCurrent && affordable ? 'animate-pulse' : ''}`}
                  style={{ borderColor: getNodeColor(status, node) + '60' }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {/* Colour swatch for colour nodes */}
                  {node.visual === 'paint-ship' && node.effect && (
                    <span
                      className="w-6 h-6 rounded-full border-2 border-white/20 mb-1 shrink-0"
                      style={{ backgroundColor: node.effect }}
                    />
                  )}

                  {/* Status icon */}
                  {status === 'unlocked' && node.visual !== 'paint-ship' && (
                    <svg className="w-6 h-6 text-green-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isCurrent && node.visual !== 'paint-ship' && (
                    <div className="text-xl mb-0.5" style={{ color: affordable ? '#00D9FF' : '#6B7280' }}>
                      {affordable ? '+' : '?'}
                    </div>
                  )}
                  {status === 'locked' && node.visual !== 'paint-ship' && (
                    <svg className="w-5 h-5 text-gray-600 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  )}

                  {/* Cost / label */}
                  <span className={`text-[10px] font-bold leading-tight text-center px-1 ${
                    status === 'unlocked' ? 'text-green-400/70' :
                    isCurrent ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    {status === 'unlocked' ? 'Owned' : `${node.cost}✦`}
                  </span>

                  {/* Node name (tiny) */}
                  <span className="text-[8px] text-white/30 text-center leading-tight px-1 mt-0.5">
                    {node.name}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node detail panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="bg-white/5 border-t border-white/10 p-5 backdrop-blur-md shrink-0"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="max-w-lg mx-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Colour preview */}
                  {selectedNode.visual === 'paint-ship' && selectedNode.effect && (
                    <span
                      className="w-10 h-10 rounded-xl border-2 border-white/20 shrink-0"
                      style={{ backgroundColor: selectedNode.effect }}
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedNode.name}</h3>
                    <p className="text-white/50 text-sm">{selectedNode.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0 ml-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Type badge + cost */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  selectedNode.type === 'stat'      ? 'bg-blue-500/20 text-blue-300' :
                  selectedNode.type === 'cosmetic'  ? 'bg-purple-500/20 text-purple-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                </span>
                <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
                  </svg>
                  {selectedNode.cost}
                </div>
              </div>

              {/* Purchase / status */}
              {(() => {
                const status = ProgressionEngine.getNodeStatus(profile, selectedNode);
                const affordable = canAfford(selectedNode);

                if (status === 'unlocked') {
                  return (
                    <div className="py-3 text-center text-green-400/60 text-sm font-medium">
                      Already Owned
                    </div>
                  );
                }
                if (status === 'locked') {
                  return (
                    <div className="py-3 text-center text-gray-500 text-sm font-medium">
                      Unlock the previous node in this branch first
                    </div>
                  );
                }
                return (
                  <motion.button
                    onClick={() => handlePurchase(selectedNode)}
                    disabled={!affordable}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                      affordable
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                    }`}
                    whileTap={affordable ? { scale: 0.97 } : {}}
                  >
                    {affordable
                      ? `Unlock for ${selectedNode.cost} Shards`
                      : `Need ${selectedNode.cost - profile.shards} more Shards`}
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
