import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, TechTreeNode } from '@/types';
import { ProgressionEngine } from '@/engines/ProgressionEngine';
import { useGameStore } from '@/stores/gameStore';
import { ShardCounter } from '@/components/ui/ShardCounter';

interface TechTreeProps {
  profile: Profile;
}

export function TechTree({ profile }: TechTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TechTreeNode | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const { purchaseNode, canAffordNode } = useGameStore();
  
  const nodes = ProgressionEngine.getAllNodes(profile);
  const currentNodeIndex = profile.treeIndex;

  const handleNodeClick = (node: TechTreeNode, index: number) => {
    if (index === currentNodeIndex) {
      setSelectedNode(node);
      setShowPurchaseModal(true);
    }
  };

  const handlePurchase = () => {
    if (selectedNode) {
      const success = purchaseNode(selectedNode);
      if (success) {
        setShowPurchaseModal(false);
        setSelectedNode(null);
      }
    }
  };

  const getNodeStatus = (index: number) => {
    if (index < currentNodeIndex) return 'unlocked';
    if (index === currentNodeIndex) return 'current';
    return 'locked';
  };

  const getNodeColor = (node: TechTreeNode, status: string) => {
    if (status === 'locked') return 'bg-gray-700 border-gray-600';
    if (status === 'unlocked') {
      if (node.type === 'stat') return 'bg-blue-500 border-blue-400';
      if (node.type === 'cosmetic') return 'bg-purple-500 border-purple-400';
      return 'bg-yellow-500 border-yellow-400';
    }
    // Current
    if (node.type === 'stat') return 'bg-blue-400 border-blue-300 animate-pulse';
    if (node.type === 'cosmetic') return 'bg-purple-400 border-purple-300 animate-pulse';
    return 'bg-yellow-400 border-yellow-300 animate-pulse';
  };

  const getNodeIcon = (node: TechTreeNode) => {
    switch (node.visual) {
      case 'add-wings-blue':
      case 'add-wings-gold':
      case 'add-wings-rainbow':
      case 'add-wings-crystal':
        return '✈️';
      case 'paint-ship':
        return '🎨';
      case 'add-shield':
      case 'add-shield-gold':
      case 'add-shield-crystal':
        return '🛡️';
      case 'add-trail':
        return '✨';
      case 'add-boost':
      case 'add-boost-gold':
        return '🚀';
      case 'change-shape':
        return '🔷';
      case 'unlock-track':
        return '🏁';
      default:
        return '⭐';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40">
        <div>
          <h2 className="text-2xl font-bold text-white">Tech Tree</h2>
          <p className="text-white/60 text-sm">
            {profile.id === 'emerson' ? "Emerson's Upgrades" : "Kyra's Upgrades"}
          </p>
        </div>
        <ShardCounter count={profile.shards} size="lg" />
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-black/20">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Overall Progress</span>
          <span>{currentNodeIndex}/20 Nodes</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${(currentNodeIndex / 20) * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Tree Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center px-8 py-12 min-w-max">
          {/* Connection Line */}
          <div className="absolute left-8 right-8 h-1 bg-white/10" style={{ top: '50%' }} />

          {nodes.map((node, index) => {
            const status = getNodeStatus(index);
            const isClickable = status === 'current';

            return (
              <motion.div
                key={node.id}
                className="relative mx-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Node */}
                <motion.button
                  onClick={() => handleNodeClick(node, index)}
                  disabled={!isClickable}
                  className={`relative w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl ${
                    getNodeColor(node, status)
                  } ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {status === 'unlocked' ? (
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : (
                    getNodeIcon(node)
                  )}

                  {/* Cost Badge */}
                  {status === 'current' && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-1 rounded-full">
                      {node.cost}
                    </div>
                  )}

                  {/* Type Indicator */}
                  <div
                    className={`absolute -top-2 -left-2 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                      node.type === 'stat'
                        ? 'bg-blue-400 text-blue-950'
                        : node.type === 'cosmetic'
                        ? 'bg-purple-400 text-purple-950'
                        : 'bg-yellow-400 text-yellow-950'
                    }`}
                  >
                    {node.type === 'stat' ? 'S' : node.type === 'cosmetic' ? 'C' : 'M'}
                  </div>
                </motion.button>

                {/* Node Label */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center w-24">
                  <p className="text-white text-xs font-medium truncate">{node.name}</p>
                </div>

                {/* Connection to next node */}
                {index < nodes.length - 1 && (
                  <div
                    className={`absolute top-1/2 left-full w-8 h-0.5 ${
                      index < currentNodeIndex ? 'bg-green-400' : 'bg-white/20'
                    }`}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 p-4 bg-black/40 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-white/60">Stat Boost</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500" />
          <span className="text-white/60">Cosmetic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500" />
          <span className="text-white/60">Milestone</span>
        </div>
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && selectedNode && (
          <motion.div
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPurchaseModal(false)}
          >
            <motion.div
              className="bg-gray-900 rounded-3xl p-8 max-w-sm w-full border-2 border-white/20"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{getNodeIcon(selectedNode)}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedNode.name}</h3>
                <p className="text-white/60">{selectedNode.description}</p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-white/60">Cost:</span>
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
                  </svg>
                  <span className="text-xl font-bold text-yellow-400">{selectedNode.cost}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium"
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handlePurchase}
                  disabled={!canAffordNode(selectedNode)}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    canAffordNode(selectedNode)
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  whileTap={canAffordNode(selectedNode) ? { scale: 0.95 } : {}}
                >
                  {canAffordNode(selectedNode) ? 'Buy!' : 'Need More Shards'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
