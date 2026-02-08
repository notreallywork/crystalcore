import { motion } from 'framer-motion';
import type { Profile } from '@/types';
import { ShardCounter } from './ShardCounter';

interface ProfileCardProps {
  profile: Profile;
  isLastPlayed: boolean;
  onClick: () => void;
}

export function ProfileCard({ profile, isLastPlayed, onClick }: ProfileCardProps) {
  const isEmerson = profile.id === 'emerson';
  
  return (
    <motion.button
      onClick={onClick}
      className={`relative w-full max-w-sm p-6 rounded-3xl border-4 transition-all ${
        isEmerson
          ? 'bg-gradient-to-br from-green-900/80 to-emerald-950/80 border-green-400 hover:border-green-300'
          : 'bg-gradient-to-br from-purple-900/80 to-violet-950/80 border-purple-400 hover:border-purple-300'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Last Played Badge */}
      {isLastPlayed && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-950 text-sm font-bold rounded-full"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Last Played
        </motion.div>
      )}

      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <motion.div
          className={`w-24 h-24 rounded-full flex items-center justify-center ${
            isEmerson ? 'bg-green-500/30' : 'bg-purple-500/30'
          }`}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <svg
            className="w-16 h-16"
            viewBox="0 0 100 100"
            fill={profile.cosmetics.color}
          >
            {/* Ship shape */}
            <path d="M50 10 L70 70 L50 55 L30 70 Z" />
            {/* Engine glow */}
            <circle cx="50" cy="75" r="8" fill="#00D9FF" opacity="0.8" />
          </svg>
        </motion.div>
      </div>

      {/* Name */}
      <h2 className={`text-3xl font-bold text-center mb-2 ${
        isEmerson ? 'text-green-300' : 'text-purple-300'
      }`}>
        {isEmerson ? 'Emerson' : 'Kyra'}
      </h2>

      {/* Age indicator */}
      <p className="text-center text-white/60 text-sm mb-4">
        Age {isEmerson ? '7' : '11'}
      </p>

      {/* Shards */}
      <div className="flex justify-center">
        <ShardCounter count={profile.shards} size="md" />
      </div>

      {/* Steering mode indicator */}
      <div className="mt-4 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          isEmerson
            ? 'bg-green-500/30 text-green-300'
            : 'bg-purple-500/30 text-purple-300'
        }`}>
          {profile.preferences.steering === 'auto' ? 'Auto-Steer' : 'Manual Steering'}
        </span>
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Progress</span>
          <span>{profile.treeIndex}/20</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isEmerson ? 'bg-green-400' : 'bg-purple-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(profile.treeIndex / 20) * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </div>
    </motion.button>
  );
}
