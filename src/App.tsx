import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ProfileCard } from '@/components/ui/ProfileCard';
import { GameCanvas } from '@/components/race/GameCanvas';
import { TechTree } from '@/components/garage/TechTree';
import { UpgradeShop } from '@/components/garage/UpgradeShop';
import { MathQuiz } from '@/components/garage/MathQuiz';
import type { ProfileId, CompetencyLevel } from '@/types';

type Screen = 'select' | 'create' | 'race' | 'garage' | 'settings';
type GarageTab = 'tree' | 'upgrades' | 'quiz';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('select');
  const [isPaused, setIsPaused] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<ProfileId | null>(null);
  const [garageTab, setGarageTab] = useState<GarageTab>('tree');

  // Create profile form state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newCompetency, setNewCompetency] = useState<CompetencyLevel>('beginner');

  const {
    profiles,
    activeProfileId,
    setActiveProfile,
    getActiveProfile,
    addProfile,
    deleteProfile,
    resetProfile,
    updateProfile,
  } = useGameStore();

  const activeProfile = getActiveProfile();

  const getLastPlayed = (): ProfileId | null => {
    if (profiles.length === 0) return null;
    const sorted = [...profiles].filter((p) => p.lastPlayed).sort((a, b) =>
      new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime()
    );
    return sorted[0]?.id || null;
  };

  const lastPlayed = getLastPlayed();

  const handleProfileSelect = (profileId: ProfileId) => {
    setActiveProfile(profileId);
    setCurrentScreen('race');
  };

  const handleCreateProfile = () => {
    const name = newName.trim();
    const age = parseInt(newAge, 10);
    if (!name || isNaN(age) || age < 3 || age > 18) return;

    const profile = addProfile(name, age, newCompetency);
    setNewName('');
    setNewAge('');
    setNewCompetency('beginner');
    setActiveProfile(profile.id);
    setCurrentScreen('select');
  };

  const handleEndRace = () => {
    setCurrentScreen('select');
  };

  const handleDelete = (profileId: ProfileId) => {
    deleteProfile(profileId);
    setDeleteConfirmId(null);
  };

  // Profile Select Screen
  if (currentScreen === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A1A] via-[#0F0F2E] to-[#1A1A3E] flex flex-col no-select">
        {/* Header */}
        <header className="pt-8 pb-4 px-6 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Crystal Core
          </motion.h1>
          <motion.p
            className="text-white/30 mt-1 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Math Racing Adventure
          </motion.p>
        </header>

        {/* Profile List */}
        <main className="flex-1 px-6 pb-4 overflow-y-auto">
          <div className="max-w-lg mx-auto space-y-3">
            {profiles.length === 0 && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm mb-1">No profiles yet</p>
                <p className="text-white/20 text-xs">Create a profile to start racing</p>
              </motion.div>
            )}

            {profiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <ProfileCard
                  profile={profile}
                  isLastPlayed={lastPlayed === profile.id}
                  onClick={() => handleProfileSelect(profile.id)}
                  onDelete={() => setDeleteConfirmId(profile.id)}
                />
              </motion.div>
            ))}
          </div>
        </main>

        {/* Bottom Actions */}
        <div className="px-6 pb-6 pt-2">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Create New Profile Button */}
            <motion.button
              onClick={() => setCurrentScreen('create')}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/20 hover:border-cyan-500/30 rounded-2xl text-white font-medium transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Player
            </motion.button>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={() => {
                  if (profiles.length > 0) {
                    if (!activeProfileId) setActiveProfile(profiles[0].id);
                    setCurrentScreen('garage');
                  }
                }}
                disabled={profiles.length === 0}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 rounded-xl text-white/50 hover:text-white/70 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                whileTap={{ scale: 0.98 }}
              >
                Garage
              </motion.button>
              <motion.button
                onClick={() => setCurrentScreen('settings')}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 rounded-xl text-white/50 hover:text-white/70 text-sm font-medium transition-all border border-white/5"
                whileTap={{ scale: 0.98 }}
              >
                Settings
              </motion.button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div
                className="bg-[#1A1A3E] rounded-2xl p-6 max-w-sm w-full border border-white/10"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-2">Delete Profile?</h3>
                <p className="text-white/50 text-sm mb-6">
                  This will permanently delete {profiles.find((p) => p.id === deleteConfirmId)?.name}'s progress, shards, and upgrades.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-xl text-white text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Create Profile Screen
  if (currentScreen === 'create') {
    const ageNum = parseInt(newAge, 10);
    const isValid = newName.trim().length > 0 && !isNaN(ageNum) && ageNum >= 3 && ageNum <= 18;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A1A] via-[#0F0F2E] to-[#1A1A3E] flex flex-col no-select">
        {/* Header */}
        <header className="p-6 flex items-center">
          <button
            onClick={() => setCurrentScreen('select')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors text-sm border border-white/5"
          >
            Back
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-white pr-16">New Player</h1>
        </header>

        {/* Form */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm w-full space-y-6">
            {/* Name */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter player name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors text-lg"
                autoFocus
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Age</label>
              <input
                type="number"
                value={newAge}
                onChange={(e) => setNewAge(e.target.value)}
                placeholder="3 - 18"
                min={3}
                max={18}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {!isNaN(ageNum) && ageNum >= 3 && (
                <p className="text-white/30 text-xs mt-1.5">
                  {ageNum <= 8 ? 'Younger player: auto-steer, counting & basic math' : 'Older player: manual steering, multiplication & fractions'}
                </p>
              )}
            </div>

            {/* Competency Level */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">Math Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as CompetencyLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setNewCompetency(level)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                      newCompetency === level
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/3 border-white/5 text-white/40 hover:bg-white/5 hover:text-white/60'
                    }`}
                  >
                    <span className="capitalize">{level}</span>
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-xs mt-1.5">
                {newCompetency === 'beginner' && 'Easier problems, more time to solve'}
                {newCompetency === 'intermediate' && 'Standard difficulty, balanced challenge'}
                {newCompetency === 'advanced' && 'Harder problems, faster pace'}
              </p>
            </div>

            {/* Submit */}
            <motion.button
              onClick={handleCreateProfile}
              disabled={!isValid}
              className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                isValid
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
              whileTap={isValid ? { scale: 0.98 } : {}}
            >
              Create Profile
            </motion.button>
          </div>
        </main>
      </div>
    );
  }

  // Race Screen
  if (currentScreen === 'race' && activeProfile) {
    return (
      <div className="fixed inset-0 bg-[#0A0A1A]">
        <GameCanvas
          profile={activeProfile}
          onEndRace={handleEndRace}
          onPause={() => setIsPaused((prev) => !prev)}
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
                className="bg-[#1A1A3E] rounded-2xl p-8 text-center max-w-xs w-full mx-6 border border-white/10"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              >
                <h2 className="text-3xl font-bold text-white mb-6">Paused</h2>
                <div className="space-y-3">
                  <motion.button
                    onClick={() => setIsPaused(false)}
                    className="block w-full px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl"
                    whileTap={{ scale: 0.97 }}
                  >
                    Resume
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setIsPaused(false);
                      handleEndRace();
                    }}
                    className="block w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 font-medium rounded-xl transition-colors border border-white/5"
                    whileTap={{ scale: 0.97 }}
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
          className="absolute top-4 left-4 z-40 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full text-white/40 hover:text-white text-sm transition-colors border border-white/10"
        >
          Back
        </button>
      </div>
    );
  }

  // Garage Screen
  if (currentScreen === 'garage') {
    const garageProfile = activeProfile || profiles[0];
    if (!garageProfile) {
      setCurrentScreen('select');
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A1A] to-[#1A1A3E]">
        {/* Header */}
        <header className="p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('select')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors text-sm border border-white/5"
          >
            Back
          </button>
          <h1 className="text-xl font-bold text-white">Garage</h1>
          <div className="w-16" />
        </header>

        {/* Profile Tabs */}
        {profiles.length > 1 && (
          <div className="flex gap-2 px-4 mb-2 overflow-x-auto scrollbar-hide">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProfile(p.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border ${
                  activeProfileId === p.id
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/3 border-white/5 text-white/40 hover:bg-white/5'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Garage Tabs */}
        <div className="flex gap-1 px-4 mb-2">
          {([
            { key: 'tree' as GarageTab, label: 'Tech Tree' },
            { key: 'upgrades' as GarageTab, label: 'Upgrades' },
            { key: 'quiz' as GarageTab, label: 'Math Quiz' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setGarageTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                garageTab === tab.key
                  ? 'bg-white/8 border-white/15 text-white'
                  : 'bg-white/2 border-white/5 text-white/35 hover:bg-white/5 hover:text-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="h-[calc(100vh-160px)]">
          {garageTab === 'tree' && <TechTree profile={garageProfile} />}
          {garageTab === 'upgrades' && <UpgradeShop profile={garageProfile} />}
          {garageTab === 'quiz' && <MathQuiz profile={garageProfile} />}
        </main>
      </div>
    );
  }

  // Settings Screen
  if (currentScreen === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A1A] to-[#1A1A3E]">
        {/* Header */}
        <header className="p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('select')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors text-sm border border-white/5"
          >
            Back
          </button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <div className="w-16" />
        </header>

        {/* Settings Content */}
        <main className="max-w-md mx-auto px-6 space-y-4 pb-8">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white/3 rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: profile.cosmetics.color + '30' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 100 100" fill={profile.cosmetics.color}>
                    <path d="M50 10 L70 70 L50 55 L30 70 Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                <span className="text-white/30 text-xs">Age {profile.age}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-sm">Steering</span>
                  <button
                    onClick={() => {
                      const newMode = profile.preferences.steering === 'auto' ? 'manual' : 'auto';
                      updateProfile(profile.id, {
                        preferences: { ...profile.preferences, steering: newMode },
                      });
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-xs font-medium transition-colors border border-white/5"
                  >
                    {profile.preferences.steering === 'auto' ? 'Auto-Steer' : 'Manual'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-sm">Stats</span>
                  <div className="text-white/30 text-xs">
                    {profile.totalRaces} races | Best: {Math.floor(profile.bestDistance).toLocaleString()}m
                  </div>
                </div>

                <button
                  onClick={() => resetProfile(profile.id)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 rounded-xl text-xs font-medium transition-colors border border-red-500/10"
                >
                  Reset Progress
                </button>
              </div>
            </div>
          ))}

          {profiles.length === 0 && (
            <div className="text-center py-12 text-white/20 text-sm">
              No profiles to configure
            </div>
          )}

          {/* App Info */}
          <div className="text-center pt-4">
            <p className="text-white/15 text-xs">Crystal Core v2.0</p>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
