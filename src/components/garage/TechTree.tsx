import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, TechTreeNode } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { ProgressionEngine } from '@/engines/ProgressionEngine';
import { ShardCounter } from '../ui/ShardCounter';

interface TechTreeProps {
  profile: Profile;
}

export function TechTree({ profile }: TechTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TechTreeNode | null>(null);
  const { purchaseNode, canAffordNode } = useGameStore();

  const nodes = ProgressionEngine.getAllNodes(profile);

  const handlePurchase = (node: TechTreeNode) => {
    const success = purchaseNode(node);
    if (success) {
      setSelectedNode(null);
    }
  };

  const getNodeColor = (node: TechTreeNode, index: number): string => {
    if (index < profile.treeIndex) return 'rgb(34, 197, 94)';
    if (index === profile.treeIndex) {
      return canAffordNode(node) ? 'rgb(0, 217, 255)' : 'rgb(107, 114, 128)';
    }
    return 'rgb(55, 65, 81)';
  };

  const getNodeBg = (index: number): string => {
    if (index < profile.treeIndex) return 'bg-green-500/15 border-green-500/30';
    if (index === profile.treeIndex) return 'bg-cyan-500/10 border-cyan-500/30';
    return 'bg-gray-800/30 border-gray-700/20';
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'stat': return 'S';
      case 'cosmetic': return 'C';
      case 'milestone': return 'M';
      default: return '?';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Shard Display */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <ShardCounter count={profile.shards} size="md" />
        </div>
        <div className="text-white/30 text-xs">
          {profile.treeIndex} / {nodes.length} unlocked
        </div>
      </div>

      {/* Scrollable Tree */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide px-6"
      >
        <div className="flex items-center h-full min-w-max py-6 gap-3">
          {nodes.map((node, index) => {
            const isUnlocked = index < profile.treeIndex;
            const isCurrent = index === profile.treeIndex;
            const isLocked = index > profile.treeIndex;
            const affordable = canAffordNode(node);

            return (
              <div key={node.id} className="flex items-center">
                {/* Connector line */}
                {index > 0 && (
                  <div className={`w-6 h-0.5 ${isUnlocked ? 'bg-green-500/40' : 'bg-gray-700/30'}`} />
                )}

                {/* Node */}
                <motion.button
                  onClick={() => setSelectedNode(node)}
                  className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 ${getNodeBg(index)} ${
                    isCurrent && affordable ? 'animate-pulse' : ''
                  }`}
                  style={{ borderColor: getNodeColor(node, index) + '60' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Type indicator */}
                  <div
                    className="text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center absolute top-1 right-1"
                    style={{ color: getNodeColor(node, index) }}
                  >
                    {getTypeIcon(node.type)}
                  </div>

                  {/* Icon */}
                  {isUnlocked && (
                    <svg className="w-6 h-6 text-green-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}

                  {isCurrent && (
                    <div className="text-xl mb-0.5" style={{ color: affordable ? '#00D9FF' : '#6B7280' }}>
                      {affordable ? '+' : '?'}
                    </div>
                  )}

                  {isLocked && (
                    <svg className="w-5 h-5 text-gray-600 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  )}

                  {/* Cost */}
                  <span className={`text-[10px] font-bold ${isUnlocked ? 'text-green-400/60' : isCurrent ? 'text-white/60' : 'text-gray-600'}`}>
                    {isUnlocked ? 'Owned' : `${node.cost}`}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="bg-white/5 border-t border-white/10 p-5 backdrop-blur-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="max-w-lg mx-auto">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedNode.name}</h3>
                  <p className="text-white/50 text-sm">{selectedNode.description}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Node type badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  selectedNode.type === 'stat' ? 'bg-blue-500/20 text-blue-300' :
                  selectedNode.type === 'cosmetic' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                </span>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
                  </svg>
                  <span className="text-yellow-400 text-sm font-bold">{selectedNode.cost}</span>
                </div>
              </div>

              {/* Purchase button */}
              {(() => {
                const nodeIndex = nodes.findIndex((n) => n.id === selectedNode.id);
                const isUnlocked = nodeIndex < profile.treeIndex;
                const isCurrent = nodeIndex === profile.treeIndex;
                const affordable = canAffordNode(selectedNode);

                if (isUnlocked) {
                  return (
                    <div className="py-3 text-center text-green-400/60 text-sm font-medium">
                      Already Unlocked
                    </div>
                  );
                }

                if (!isCurrent) {
                  return (
                    <div className="py-3 text-center text-gray-500 text-sm font-medium">
                      Unlock previous nodes first
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
                      ? `Purchase for ${selectedNode.cost} Shards`
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
