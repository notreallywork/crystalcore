import { motion } from 'framer-motion';
import type { Profile, RaceSession } from '@/types';

interface HUDProps {
  profile: Profile;
  raceSession: RaceSession;
  onPause: () => void;
}

export function HUD({ profile, raceSession, onPause }: HUDProps) {
  const hearts = [];
  const maxHearts = profile.stats.shield;
  const currentHearts = maxHearts - raceSession.shieldHits;

  for (let i = 0; i < maxHearts; i++) {
    const isFilled = i < currentHearts;
    hearts.push(
      <motion.svg
        key={i}
        className={`w-8 h-8 ${isFilled ? 'text-red-500' : 'text-gray-600'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        initial={isFilled ? { scale: 1 } : { scale: 0.8 }}
        animate={isFilled ? { scale: [1, 1.1, 1] } : { scale: 0.8 }}
        transition={{ duration: 0.5, delay: i * 0.1 }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </motion.svg>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Left - Hearts */}
      <div className="absolute top-4 left-4 flex gap-1">
        {hearts}
      </div>

      {/* Top Right - Boost Meter */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-sm font-bold">BOOST</span>
          <div className="w-24 h-4 bg-black/50 rounded-full overflow-hidden border border-cyan-500/50">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300"
              initial={{ width: '100%' }}
              animate={{ 
                width: raceSession.isBoosting 
                  ? `${(raceSession.boostTimeLeft / profile.stats.boostDuration) * 100}%`
                  : '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Center - Distance */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20">
          <span className="text-white font-mono text-xl">
            {Math.floor(raceSession.distance).toLocaleString()}m
          </span>
        </div>
      </div>

      {/* Top Right - Pause Button */}
      <button
        onClick={onPause}
        className="absolute top-4 right-32 pointer-events-auto w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
      >
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>

      {/* Shards collected this run */}
      <div className="absolute top-16 right-4">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-500/50">
          <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
          </svg>
          <span className="text-yellow-400 font-bold">+{raceSession.shardsCollected}</span>
        </div>
      </div>

      {/* Boost active indicator */}
      {raceSession.isBoosting && (
        <motion.div
          className="absolute bottom-20 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
        >
          <div className="bg-cyan-500/80 text-white font-bold px-6 py-2 rounded-full animate-pulse">
            SPEED BOOST!
          </div>
        </motion.div>
      )}
    </div>
  );
}
