import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, Gate } from '@/types';
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
  const [showResults, setShowResults] = useState(false);
  const [respawnFlash, setRespawnFlash] = useState(false);
  const resultsRef = useRef<{ distance: number; shards: number; correct: number; attempted: number } | null>(null);

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
  } = useGameStore();

  const track = ProgressionEngine.getCurrentTrack(profile);

  // Sync boost state to engine
  useEffect(() => {
    if (engineRef.current && currentRun) {
      engineRef.current.setBoostState(currentRun.isBoosting);
    }
  }, [currentRun?.isBoosting]);

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
          setActiveGate((prev) => {
            if (prev !== null) return prev;
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
        onCheckpoint: () => {
          // Checkpoint auto-save handled by store persistence
        },
        onDistanceUpdate: (delta) => {
          updateDistance(delta);
        },
        onBoostTick: (deltaTime) => {
          decayBoost(deltaTime);
        },
        onRespawn: () => {
          // Visual handled by respawnFlash state
        },
      }
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

  // Handle pause
  useEffect(() => {
    if (isPaused) {
      engineRef.current?.stop();
    } else {
      engineRef.current?.start();
    }
  }, [isPaused]);

  const handleGateSolve = useCallback((correct: boolean) => {
    if (activeGate && engineRef.current) {
      engineRef.current.setGateResult(activeGate.id, correct);
      const isYoung = profile.age <= 8;
      if (correct) {
        const reward = isYoung ? 10 : 30;
        collectShards(reward);
      } else {
        collectShards(1);
      }
    }
    setActiveGate(null);
  }, [activeGate, profile.age, collectShards]);

  const handleGateSkip = useCallback(() => {
    if (activeGate && engineRef.current) {
      engineRef.current.setGateResult(activeGate.id, false);
    }
    setActiveGate(null);
  }, [activeGate]);

  const handleEndRace = useCallback(() => {
    const run = useGameStore.getState().currentRun;
    if (run) {
      resultsRef.current = {
        distance: run.distance,
        shards: run.shardsCollected,
        correct: run.correctAnswers,
        attempted: run.gatesAttempted,
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
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">Race Complete!</h2>
            <p className="text-white/50 mb-8">Great flying, {profile.name}!</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-white/50 text-sm mb-1">Distance</p>
              <p className="text-3xl font-bold text-white font-mono">
                {Math.floor(results.distance).toLocaleString()}
              </p>
              <p className="text-white/30 text-xs">meters</p>
            </motion.div>
            <motion.div
              className="bg-yellow-500/10 backdrop-blur-sm rounded-2xl p-5 border border-yellow-500/20"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-yellow-400/60 text-sm mb-1">Shards</p>
              <p className="text-3xl font-bold text-yellow-400 font-mono">
                +{results.shards}
              </p>
              <p className="text-yellow-400/30 text-xs">earned</p>
            </motion.div>
          </div>

          {results.attempted > 0 && (
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-white/50 text-sm mb-1">Gates Solved</p>
              <p className="text-2xl font-bold text-white">
                {results.correct} / {results.attempted}
              </p>
              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${results.attempted > 0 ? (results.correct / results.attempted) * 100 : 0}%` }}
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

      <AnimatePresence>
        {activeGate && (
          <GateOverlay
            gate={activeGate}
            profile={profile}
            onSolve={handleGateSolve}
            onSkip={handleGateSkip}
          />
        )}
      </AnimatePresence>

      {/* End Race Button */}
      <button
        onClick={handleEndRace}
        className="absolute bottom-4 left-4 px-4 py-2 bg-black/40 backdrop-blur-sm hover:bg-white/20 rounded-full text-white/50 hover:text-white text-sm transition-all border border-white/10"
      >
        End Race
      </button>
    </div>
  );
}
