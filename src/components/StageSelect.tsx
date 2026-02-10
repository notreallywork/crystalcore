import { motion } from 'framer-motion';
import type { Profile, StageConfig } from '@/types';
import { WORLD_1_STAGES } from '@/content/stages/world1';

interface StageSelectProps {
  profile: Profile;
  onStageSelect: (stage: StageConfig) => void;
}

export function StageSelect({ profile, onStageSelect }: StageSelectProps) {
  const isStageUnlocked = (stage: StageConfig): boolean => {
    if (stage.stage === 1) return true;
    const prevStageId = `${stage.world}-${stage.stage - 1}`;
    return profile.completedStages.includes(prevStageId);
  };

  const isStageCompleted = (stage: StageConfig): boolean => {
    return profile.completedStages.includes(stage.id);
  };

  return (
    <div className="px-4 pb-6">
      {/* World Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center">
          <span className="text-cyan-400 font-bold text-lg">1</span>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">World 1</h3>
          <p className="text-white/30 text-xs">
            {profile.completedStages.filter(s => s.startsWith('1-')).length} / {WORLD_1_STAGES.length} completed
          </p>
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-5 gap-2">
        {WORLD_1_STAGES.map((stage, index) => {
          const unlocked = isStageUnlocked(stage);
          const completed = isStageCompleted(stage);

          return (
            <motion.button
              key={stage.id}
              onClick={() => unlocked && onStageSelect(stage)}
              disabled={!unlocked}
              className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                completed
                  ? 'bg-green-500/15 border-green-500/30'
                  : unlocked
                    ? 'bg-white/5 border-cyan-500/30 hover:bg-cyan-500/10'
                    : 'bg-white/2 border-white/5 opacity-40 cursor-not-allowed'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              whileTap={unlocked ? { scale: 0.93 } : {}}
            >
              {/* Stage number */}
              <span className={`text-lg font-bold ${
                completed ? 'text-green-400' : unlocked ? 'text-white' : 'text-white/30'
              }`}>
                {stage.stage}
              </span>

              {/* Stage name */}
              <span className={`text-[9px] mt-0.5 leading-tight text-center px-1 ${
                completed ? 'text-green-400/60' : unlocked ? 'text-white/40' : 'text-white/15'
              }`}>
                {stage.name}
              </span>

              {/* Completed checkmark */}
              {completed && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Lock icon */}
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
                  </svg>
                </div>
              )}

              {/* Boss indicator */}
              {unlocked && stage.bossCount > 0 && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(stage.bossCount, 3) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                    ))}
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Stage Details - show for next unlocked stage */}
      {(() => {
        const nextStage = WORLD_1_STAGES.find(s => isStageUnlocked(s) && !isStageCompleted(s));
        if (!nextStage) return null;

        return (
          <motion.div
            className="mt-4 bg-white/3 rounded-2xl p-4 border border-white/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-cyan-400 text-xs font-bold">STAGE {nextStage.id}</span>
                <h4 className="text-white font-bold">{nextStage.name}</h4>
              </div>
              <motion.button
                onClick={() => onStageSelect(nextStage)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Play
              </motion.button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/3 rounded-lg py-1.5 px-2">
                <p className="text-white/30 text-[10px]">Distance</p>
                <p className="text-white/70 text-xs font-mono">{nextStage.distance / 1000}km</p>
              </div>
              <div className="bg-white/3 rounded-lg py-1.5 px-2">
                <p className="text-white/30 text-[10px]">Speed</p>
                <p className="text-white/70 text-xs font-mono">{nextStage.speedMultiplier}x</p>
              </div>
              <div className="bg-white/3 rounded-lg py-1.5 px-2">
                <p className="text-white/30 text-[10px]">Bosses</p>
                <p className="text-purple-400/70 text-xs font-mono">{nextStage.bossCount}</p>
              </div>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}
