import { motion } from 'framer-motion';
import type { Profile } from '@/types';
import { ShardCounter } from './ShardCounter';

interface ProfileCardProps {
  profile: Profile;
  isLastPlayed: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export function ProfileCard({ profile, isLastPlayed, onClick, onDelete }: ProfileCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative w-full p-5 rounded-2xl border-2 transition-all bg-white/5 hover:bg-white/8 border-white/10 hover:border-white/20 text-left"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Last Played Badge */}
      {isLastPlayed && (
        <div className="absolute -top-2.5 left-4 px-3 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
          Last Played
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: profile.cosmetics.color + '20' }}
        >
          <svg
            className="w-8 h-8"
            viewBox="0 0 100 100"
            fill={profile.cosmetics.color}
          >
            <path d="M50 10 L70 70 L50 55 L30 70 Z" />
            <circle cx="50" cy="75" r="6" fill="#00D9FF" opacity="0.8" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-lg font-bold text-white truncate">{profile.name}</h3>
            <span className="text-white/30 text-xs">Age {profile.age}</span>
          </div>
          <div className="flex items-center gap-3">
            <ShardCounter count={profile.shards} size="sm" animated={false} />
            <span className="text-white/20 text-xs">|</span>
            <span className="text-white/40 text-xs">
              {profile.preferences.steering === 'auto' ? 'Auto-Steer' : 'Manual'}
            </span>
            <span className="text-white/20 text-xs">|</span>
            <span className="text-white/40 text-xs capitalize">
              {profile.competency}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
                initial={{ width: 0 }}
                animate={{ width: `${(profile.treeIndex / 20) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="text-white/30 text-[10px] font-mono">{profile.treeIndex}/20</span>
          </div>
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors pointer-events-auto"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </motion.button>
  );
}
