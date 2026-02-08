import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ProfileCard } from '@/components/ui/ProfileCard';
import { GameCanvas } from '@/components/race/GameCanvas';
import { TechTree } from '@/components/garage/TechTree';
import type { ProfileId } from '@/types';

type Screen = 'select' | 'race' | 'garage' | 'settings';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('select');
  const [isPaused, setIsPaused] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState<ProfileId | null>(null);
  
  const { 
    emerson, 
    kyra, 
    activeProfile, 
    setActiveProfile, 
    resetProfile,
  } = useGameStore();

  // Determine last played profile
  const getLastPlayed = (): ProfileId | null => {
    if (!emerson.lastPlayed && !kyra.lastPlayed) return null;
    if (!emerson.lastPlayed) return 'kyra';
    if (!kyra.lastPlayed) return 'emerson';
    return new Date(emerson.lastPlayed) > new Date(kyra.lastPlayed) ? 'emerson' : 'kyra';
  };

  const lastPlayed = getLastPlayed();

  const handleProfileSelect = (profile: ProfileId) => {
    setActiveProfile(profile);
    setCurrentScreen('race');
  };

  const handleEndRace = () => {
    setCurrentScreen('select');
  };

  const handleResetProfile = (profileId: ProfileId) => {
    resetProfile(profileId);
    setShowResetConfirm(null);
  };

  // Profile Select Screen
  if (currentScreen === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F0F1E] to-[#1A1A3E] flex flex-col">
        {/* Header */}
        <header className="p-6 text-center">
          <motion.h1
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Crystal Core
          </motion.h1>
          <motion.p
            className="text-white/60 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Math Racing Adventure
          </motion.p>
        </header>

        {/* Profile Selection */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ProfileCard
                profile={emerson}
                isLastPlayed={lastPlayed === 'emerson'}
                onClick={() => handleProfileSelect('emerson')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ProfileCard
                profile={kyra}
                isLastPlayed={lastPlayed === 'kyra'}
                onClick={() => handleProfileSelect('kyra')}
              />
            </motion.div>
          </div>
        </main>

        {/* Footer Actions */}
        <footer className="p-6 flex justify-center gap-4">
          <motion.button
            onClick={() => setCurrentScreen('garage')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🏭 Garage
          </motion.button>
          <motion.button
            onClick={() => setCurrentScreen('settings')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⚙️ Settings
          </motion.button>
        </footer>
      </div>
    );
  }

  // Race Screen
  if (currentScreen === 'race' && activeProfile) {
    const profile = activeProfile === 'emerson' ? emerson : kyra;
    
    return (
      <div className="fixed inset-0 bg-[#0F0F1E]">
        <GameCanvas
          profile={profile}
          onEndRace={handleEndRace}
          onPause={() => setIsPaused(true)}
          isPaused={isPaused}
        />

        {/* Pause Menu */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-3xl p-8 text-center"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              >
                <h2 className="text-4xl font-bold text-white mb-8">Paused</h2>
                <div className="space-y-4">
                  <motion.button
                    onClick={() => setIsPaused(false)}
                    className="block w-full px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full"
                    whileTap={{ scale: 0.95 }}
                  >
                    Resume
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setIsPaused(false);
                      handleEndRace();
                    }}
                    className="block w-full px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full"
                    whileTap={{ scale: 0.95 }}
                  >
                    Quit Race
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Button */}
        <button
          onClick={handleEndRace}
          className="absolute top-4 left-4 z-40 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  // Garage Screen
  if (currentScreen === 'garage') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F0F1E] to-[#1A1A3E]">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('select')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Garage</h1>
          <div className="w-20" /> {/* Spacer */}
        </header>

        {/* Profile Tabs */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setActiveProfile('emerson')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              activeProfile === 'emerson'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Emerson
          </button>
          <button
            onClick={() => setActiveProfile('kyra')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              activeProfile === 'kyra'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Kyra
          </button>
        </div>

        {/* Tech Tree */}
        <main className="h-[calc(100vh-200px)]">
          {activeProfile && (
            <TechTree profile={activeProfile === 'emerson' ? emerson : kyra} />
          )}
        </main>
      </div>
    );
  }

  // Settings Screen
  if (currentScreen === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F0F1E] to-[#1A1A3E]">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('select')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <div className="w-20" />
        </header>

        {/* Settings Content */}
        <main className="max-w-md mx-auto p-6 space-y-6">
          {/* Emerson Settings */}
          <div className="bg-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-green-400 mb-4">Emerson's Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white">Steering Mode</span>
                <button
                  onClick={() => {
                    const newMode = emerson.preferences.steering === 'auto' ? 'manual' : 'auto';
                    useGameStore.getState().updateProfile('emerson', {
                      preferences: { ...emerson.preferences, steering: newMode },
                    });
                  }}
                  className="px-4 py-2 bg-green-500/30 text-green-300 rounded-full text-sm"
                >
                  {emerson.preferences.steering === 'auto' ? 'Auto-Steer' : 'Manual'}
                </button>
              </div>
              <button
                onClick={() => setShowResetConfirm('emerson')}
                className="w-full py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
              >
                Reset Emerson's Progress
              </button>
            </div>
          </div>

          {/* Kyra Settings */}
          <div className="bg-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-purple-400 mb-4">Kyra's Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white">Steering Mode</span>
                <button
                  onClick={() => {
                    const newMode = kyra.preferences.steering === 'auto' ? 'manual' : 'auto';
                    useGameStore.getState().updateProfile('kyra', {
                      preferences: { ...kyra.preferences, steering: newMode },
                    });
                  }}
                  className="px-4 py-2 bg-purple-500/30 text-purple-300 rounded-full text-sm"
                >
                  {kyra.preferences.steering === 'auto' ? 'Auto-Steer' : 'Manual'}
                </button>
              </div>
              <button
                onClick={() => setShowResetConfirm('kyra')}
                className="w-full py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
              >
                Reset Kyra's Progress
              </button>
            </div>
          </div>

          {/* About */}
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-white/40 text-sm">Crystal Core v1.0</p>
            <p className="text-white/40 text-sm">Made with ❤️ for Emerson & Kyra</p>
          </div>
        </main>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-3xl p-8 max-w-sm w-full"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-white mb-4">Reset Progress?</h3>
                <p className="text-white/60 mb-6">
                  This will reset all shards, upgrades, and progress for {showResetConfirm === 'emerson' ? 'Emerson' : 'Kyra'}. This cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowResetConfirm(null)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetProfile(showResetConfirm)}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

export default App;
