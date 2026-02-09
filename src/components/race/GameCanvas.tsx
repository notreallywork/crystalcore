import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, Gate, MathProblem, PowerupType } from '@/types';
import { RaceEngine } from '@/engines/RaceEngine';
import { useGameStore } from '@/stores/gameStore';
import { HUD } from './HUD';
import { GateOverlay } from './GateOverlay';
import { ProgressionEngine } from '@/engines/ProgressionEngine';

interface GameCanvasProps {
  profile: Profile;
  onEndRace: () => void;
  onPause: () => void;
  isPaused: boolean;
}

export function GameCanvas({ profile, onEndRace, onPause, isPaused }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const [activeGate, setActiveGate] = useState<Gate | null>(null);
  const [bossMathProblem, setBossMathProblem] = useState<MathProblem | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [respawnFlash, setRespawnFlash] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [bossActive, setBossActive] = useState(false);
  const [stageClear, setStageClear] = useState(false);
  const [powerupMessage, setPowerupMessage] = useState<string | null>(null);
  const resultsRef = useRef<{
    distance: number;
    shards: number;
    correct: number;
    attempted: number;
    rocksDestroyed: number;
    bossesDefeated: number;
  } | null>(null);

  const {
    currentRun,
    collectShards,
    hitObstacle,
    passGate,
    activateBoost,
    decayBoost,
    updateDistance,
    endRace,
    startRace,
    adjustDifficulty,
    destroyRock,
    defeatBoss,
  } = useGameStore();

  const track = ProgressionEngine.getCurrentTrack(profile);

  // Sync boost state to engine
  useEffect(() => {
    if (engineRef.current && currentRun) {
      engineRef.current.setBoostState(currentRun.isBoosting);
    }
  }, [currentRun?.isBoosting]);

  // Hide tutorial after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTutorial(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Spacebar pause handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !activeGate && !bossMathProblem && !showResults) {
        e.preventDefault();
        onPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGate, bossMathProblem, showResults, onPause]);

  // Initialize race engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        engineRef.current?.resize();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const engine = new RaceEngine(
      canvas,
      profile,
      track,
      {
        onShardCollect: (amount) => {
          collectShards(amount);
        },
        onObstacleHit: () => {
          const shouldRespawn = hitObstacle();
          if (shouldRespawn) {
            engineRef.current?.triggerRespawn();
            setRespawnFlash(true);
            setTimeout(() => setRespawnFlash(false), 300);
          }
        },
        onGateApproach: (gate) => {
          // Pause engine for gate solving
          setActiveGate((prev) => {
            if (prev !== null) return prev;
            engineRef.current?.stop();
            return gate;
          });
        },
        onGatePass: (correct) => {
          passGate(correct);
          if (correct) {
            activateBoost();
          }
          setActiveGate(null);
        },
        onCheckpoint: () => {},
        onDistanceUpdate: (delta) => {
          updateDistance(delta);
        },
        onBoostTick: (deltaTime) => {
          decayBoost(deltaTime);
        },
        onRespawn: () => {},
        onBossSpawn: () => {
          setBossActive(true);
        },
        onBossMathPhase: (problem) => {
          // Pause engine for boss math challenge
          setBossMathProblem(problem);
          engineRef.current?.stop();
        },
        onBossDefeated: () => {
          defeatBoss();
          setBossActive(false);
        },
        onRockDestroyed: () => {
          destroyRock();
        },
        onStageClear: () => {
          setStageClear(true);
          // Auto-end race with stage clear bonus
          const run = useGameStore.getState().currentRun;
          if (run) {
            collectShards(50); // Stage completion bonus
            resultsRef.current = {
              distance: run.distance,
              shards: run.shardsCollected + 50,
              correct: run.correctAnswers,
              attempted: run.gatesAttempted,
              rocksDestroyed: run.rocksDestroyed,
              bossesDefeated: run.bossesDefeated,
            };

            if (run.gatesAttempted > 0) {
              adjustDifficulty({
                gatesAttempted: run.gatesAttempted,
                correctAnswers: run.correctAnswers,
                avgTime: 0,
              });
            }
          }
          engineRef.current?.stop();
          endRace();
          setShowResults(true);
        },
        onPowerupCollect: (type: PowerupType) => {
          if (type === 'boost') {
            activateBoost();
            setPowerupMessage('SPEED BOOST!');
          } else if (type === 'rapidfire') {
            setPowerupMessage('RAPID FIRE!');
          } else if (type === 'shield') {
            // Restore a shield hit
            const store = useGameStore.getState();
            if (store.currentRun && store.currentRun.shieldHits > 0) {
              useGameStore.setState({
                currentRun: {
                  ...store.currentRun,
                  shieldHits: store.currentRun.shieldHits - 1,
                },
              });
            }
            setPowerupMessage('SHIELD RESTORED!');
          }
          setTimeout(() => setPowerupMessage(null), 1500);
        },
      },
    );

    engineRef.current = engine;
    startRace();
    engine.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      engine.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, track.id]);

  // Handle external pause
  useEffect(() => {
    if (!activeGate && !bossMathProblem) {
      if (isPaused) {
        engineRef.current?.stop();
      } else {
        engineRef.current?.start();
      }
    }
  }, [isPaused, activeGate, bossMathProblem]);

  const handleGateSolve = useCallback(
    (correct: boolean) => {
      if (activeGate && engineRef.current) {
        engineRef.current.setGateResult(activeGate.id, correct);
        const isYoung = profile.age <= 8;
        if (correct) {
          const reward = isYoung ? 10 : 30;
          collectShards(reward);
        } else {
          collectShards(1);
        }
        // Resume engine after gate
        engineRef.current.start();
      }
      setActiveGate(null);
    },
    [activeGate, profile.age, collectShards],
  );

  const handleGateSkip = useCallback(() => {
    if (activeGate && engineRef.current) {
      engineRef.current.setGateResult(activeGate.id, false);
      // Resume engine
      engineRef.current.start();
    }
    setActiveGate(null);
  }, [activeGate]);

  const handleBossMathSolve = useCallback(
    (correct: boolean) => {
      if (engineRef.current) {
        engineRef.current.setBossMathResult(correct);
        if (correct) {
          collectShards(20);
        }
        // Resume engine
        engineRef.current.start();
      }
      setBossMathProblem(null);
    },
    [collectShards],
  );

  const handleBossMathSkip = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.setBossMathResult(false);
      engineRef.current.start();
    }
    setBossMathProblem(null);
  }, []);

  const handleEndRace = useCallback(() => {
    const run = useGameStore.getState().currentRun;
    if (run) {
      resultsRef.current = {
        distance: run.distance,
        shards: run.shardsCollected,
        correct: run.correctAnswers,
        attempted: run.gatesAttempted,
        rocksDestroyed: run.rocksDestroyed,
        bossesDefeated: run.bossesDefeated,
      };

      if (run.gatesAttempted > 0) {
        adjustDifficulty({
          gatesAttempted: run.gatesAttempted,
          correctAnswers: run.correctAnswers,
          avgTime: 0,
        });
      }
    }

    engineRef.current?.stop();
    endRace();
    setShowResults(true);
  }, [endRace, adjustDifficulty]);

  if (showResults && resultsRef.current) {
    const results = resultsRef.current;
    return (
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-[#0F0F1E] to-[#1A1A3E] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center p-8 max-w-md w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {stageClear ? 'Stage Complete!' : 'Race Complete!'}
            </h2>
            <p className="text-white/50 mb-8">
              {stageClear ? 'Amazing run, ' : 'Great flying, '}{profile.name}!
            </p>
            {stageClear && (
              <div className="mb-4 inline-block px-4 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 rounded-full">
                <span className="text-cyan-300 text-sm font-bold">+50 Stage Bonus Shards!</span>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-white/50 text-xs mb-1">Distance</p>
              <p className="text-2xl font-bold text-white font-mono">
                {Math.floor(results.distance).toLocaleString()}
              </p>
              <p className="text-white/30 text-[10px]">meters</p>
            </motion.div>
            <motion.div
              className="bg-yellow-500/10 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/20"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-yellow-400/60 text-xs mb-1">Shards</p>
              <p className="text-2xl font-bold text-yellow-400 font-mono">+{results.shards}</p>
              <p className="text-yellow-400/30 text-[10px]">earned</p>
            </motion.div>
            <motion.div
              className="bg-orange-500/10 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <p className="text-orange-400/60 text-xs mb-1">Rocks Blasted</p>
              <p className="text-2xl font-bold text-orange-400 font-mono">{results.rocksDestroyed}</p>
            </motion.div>
            <motion.div
              className="bg-purple-500/10 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-purple-400/60 text-xs mb-1">Bosses Defeated</p>
              <p className="text-2xl font-bold text-purple-400 font-mono">{results.bossesDefeated}</p>
            </motion.div>
          </div>

          {results.attempted > 0 && (
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <p className="text-white/50 text-xs mb-1">Gates Solved</p>
              <p className="text-xl font-bold text-white">
                {results.correct} / {results.attempted}
              </p>
              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${results.attempted > 0 ? (results.correct / results.attempted) * 100 : 0}%`,
                  }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                />
              </div>
            </motion.div>
          )}

          <motion.button
            onClick={onEndRace}
            className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-cyan-500/25"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Back to Menu
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        style={{ touchAction: 'none' }}
      />

      {currentRun && (
        <HUD
          profile={profile}
          raceSession={currentRun}
          onPause={onPause}
          bossActive={bossActive}
        />
      )}

      {/* Respawn flash overlay */}
      <AnimatePresence>
        {respawnFlash && (
          <motion.div
            className="absolute inset-0 bg-red-500/30 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Powerup message */}
      <AnimatePresence>
        {powerupMessage && (
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-30"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
          >
            <div className="px-6 py-3 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/20">
              <span className="text-xl font-bold text-white drop-shadow-lg">{powerupMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gate math overlay - pauses game */}
      <AnimatePresence>
        {activeGate && (
          <GateOverlay
            gate={activeGate}
            profile={profile}
            onSolve={handleGateSolve}
            onSkip={handleGateSkip}
            isBossChallenge={false}
          />
        )}
      </AnimatePresence>

      {/* Boss math overlay - pauses game */}
      <AnimatePresence>
        {bossMathProblem && (
          <GateOverlay
            gate={{
              id: 'boss-math',
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              type: 'purple',
              problem: bossMathProblem,
              solved: null,
              approached: true,
            }}
            profile={profile}
            onSolve={handleBossMathSolve}
            onSkip={handleBossMathSkip}
            isBossChallenge={true}
          />
        )}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-black/60 backdrop-blur-sm rounded-3xl p-6 max-w-xs mx-4 border border-white/10">
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 9l4 4 4-4M15 5l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium">Drag or Arrow Keys to move</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium">Fly through crystals!</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium">Shoot rocks or dodge them!</span>
                </div>
                <p className="text-white/40 text-xs pt-1">Auto-fire active</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Race Button */}
      {!activeGate && !bossMathProblem && (
        <button
          onClick={handleEndRace}
          className="absolute bottom-4 left-4 px-4 py-2 bg-black/40 backdrop-blur-sm hover:bg-white/20 rounded-full text-white/50 hover:text-white text-sm transition-all border border-white/10"
        >
          End Race
        </button>
      )}
    </div>
  );
}
