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
  
  const { 
    currentRun, 
    collectShards, 
    hitObstacle, 
    passGate, 
    activateBoost,
    endRace,
    startRace,
  } = useGameStore();

  // Get current track
  const track = ProgressionEngine.getCurrentTrack(profile);

  // Initialize race engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        engineRef.current?.resize();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create engine
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
            // Visual feedback for respawn
          }
        },
        onGateApproach: (gate) => {
          setActiveGate(gate);
        },
        onGatePass: (correct) => {
          passGate(correct);
          if (correct) {
            activateBoost();
          }
          setActiveGate(null);
        },
        onCheckpoint: () => {
          // Checkpoint reached - auto-save
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
  }, [profile, track]);

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
      if (correct) {
        const reward = profile.id === 'emerson' ? 10 : 30;
        collectShards(reward);
      } else {
        collectShards(1); // Consolation prize
      }
    }
    setActiveGate(null);
  }, [activeGate, profile.id, collectShards]);

  const handleGateSkip = useCallback(() => {
    if (activeGate && engineRef.current) {
      engineRef.current.setGateResult(activeGate.id, false);
    }
    setActiveGate(null);
  }, [activeGate]);

  const handleEndRace = useCallback(() => {
    engineRef.current?.stop();
    endRace();
    setShowResults(true);
  }, [endRace]);

  if (showResults) {
    return (
      <motion.div
        className="absolute inset-0 bg-black/90 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center p-8">
          <motion.h2
            className="text-5xl font-bold text-white mb-8"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
          >
            Race Complete!
          </motion.h2>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-white/10 rounded-2xl p-6">
              <p className="text-white/60 mb-2">Distance</p>
              <p className="text-4xl font-bold text-white">
                {Math.floor(currentRun?.distance || 0).toLocaleString()}m
              </p>
            </div>
            <div className="bg-yellow-500/20 rounded-2xl p-6">
              <p className="text-yellow-400 mb-2">Shards Earned</p>
              <p className="text-4xl font-bold text-yellow-400">
                +{currentRun?.shardsCollected || 0}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-white/60 mb-2">Gates Solved</p>
            <p className="text-3xl font-bold text-white">
              {currentRun?.correctAnswers || 0} / {currentRun?.gatesAttempted || 0}
            </p>
          </div>

          <motion.button
            onClick={onEndRace}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-xl rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
        className="absolute bottom-4 left-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white/60 text-sm transition-colors"
      >
        End Race
      </button>
    </div>
  );
}
