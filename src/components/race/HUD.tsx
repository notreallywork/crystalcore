import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, RaceSession } from '@/types';

interface HUDProps {
  profile: Profile;
  raceSession: RaceSession;
  onPause: () => void;
}

export function HUD({ profile, raceSession, onPause }: HUDProps) {
  const maxHearts = profile.stats.shield;
  const currentHearts = maxHearts - raceSession.shieldHits;

  const boostPercent = raceSession.isBoosting
    ? (raceSession.boostTimeLeft / profile.stats.boostDuration) * 100
    : 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar background */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Top Left - Hearts */}
      <div className="absolute top-3 left-3 flex gap-1">
        {Array.from({ length: maxHearts }).map((_, i) => {
          const isFilled = i < currentHearts;
          return (
            <motion.div
              key={i}
              initial={false}
              animate={isFilled ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg
                className={`w-7 h-7 ${isFilled ? 'text-red-500' : 'text-gray-600'}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </motion.div>
          );
        })}
      </div>

      {/* Top Center - Pause */}
      <button
        onClick={onPause}
        className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
      >
        <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>

      {/* Top Right - Shards */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-yellow-500/20">
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
          </svg>
          <span className="text-yellow-400 font-bold text-sm font-mono">
            {raceSession.shardsCollected}
          </span>
        </div>
      </div>

      {/* Bottom Center - Distance */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-5 py-1.5 border border-white/10">
          <span className="text-white/80 font-mono text-lg">
            {Math.floor(raceSession.distance).toLocaleString()}m
          </span>
        </div>
      </div>

      {/* Boost indicator */}
      <AnimatePresence>
        {raceSession.isBoosting && (
          <motion.div
            className="absolute bottom-16 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-cyan-400 text-xs font-bold mb-1 tracking-wider">BOOST</span>
              <div className="w-32 h-2 bg-black/40 rounded-full overflow-hidden border border-cyan-500/30">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300 rounded-full"
                  style={{ width: `${boostPercent}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
