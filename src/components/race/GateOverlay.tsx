import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, MathProblem, Gate } from '@/types';
import { MathValidator } from '@/engines/MathValidator';
import emersonGates from '@/content/gates/emerson.json';
import kyraGates from '@/content/gates/kyra.json';

interface GateOverlayProps {
  gate: Gate;
  profile: Profile;
  onSolve: (correct: boolean) => void;
  onSkip: () => void;
  isBossChallenge?: boolean;
}

export function GateOverlay({ gate, profile, onSolve, onSkip, isBossChallenge = false }: GateOverlayProps) {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [timeLeft, setTimeLeft] = useState(8);
  const [answer, setAnswer] = useState('');
  const [draggedCrystals, setDraggedCrystals] = useState<number>(0);
  const [solved, setSolved] = useState<boolean | null>(null);

  const isYoung = profile.age <= 8;
  const solveTime = isYoung ? emersonGates.solveTime : kyraGates.solveTime;
  const templates = isYoung ? emersonGates.templates : kyraGates.templates;

  useEffect(() => {
    if (gate.problem) {
      setProblem(gate.problem);
    } else {
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const generatedProblem = MathValidator.generateProblemFromTemplate(randomTemplate as MathProblem);
      setProblem(generatedProblem);
    }
    setTimeLeft(isBossChallenge ? solveTime + 3 : solveTime);
  }, [gate.id]);

  useEffect(() => {
    if (solved !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [solved]);

  const handleTimeout = useCallback(() => {
    if (solved === null) {
      setSolved(false);
      setTimeout(() => onSolve(false), 800);
    }
  }, [solved, onSolve]);

  const handleNumpadInput = (digit: string) => {
    if (solved !== null) return;
    if (answer.length < 4) {
      setAnswer((prev) => prev + digit);
    }
  };

  const handleClear = () => {
    if (solved !== null) return;
    setAnswer('');
  };

  const handleSubmit = () => {
    if (solved !== null || !problem) return;

    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer)) return;
    const isCorrect = MathValidator.validateAnswer(problem, numAnswer);

    setSolved(isCorrect);
    setTimeout(() => onSolve(isCorrect), 800);
  };

  const handleDragStart = (count: number) => {
    if (solved !== null) return;
    setDraggedCrystals(count);
  };

  const handleDrop = () => {
    if (solved !== null || !problem) return;

    // Auto-calculate total for tap-to-merge (works on tablet where drag doesn't)
    const total = draggedCrystals > 0
      ? draggedCrystals
      : (problem.setup?.pileA?.count || 0) + (problem.setup?.pileB?.count || 0);
    const isCorrect = MathValidator.validateAnswer(problem, total);
    setSolved(isCorrect);
    setTimeout(() => onSolve(isCorrect), 800);
  };

  const maxTime = isBossChallenge ? solveTime + 3 : solveTime;
  const progress = (timeLeft / maxTime) * 100;
  const timerColor = progress > 50 ? (isBossChallenge ? '#9900FF' : '#00FF88') : progress > 25 ? '#FFD700' : '#FF3366';

  if (!problem) return null;

  return (
    <motion.div
      className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="relative">
        {/* Timer bar across top */}
        <div className="absolute top-0 left-0 right-0 h-1.5">
          <motion.div
            className="h-full"
            style={{ backgroundColor: timerColor }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>

        <div className="flex items-center justify-between p-4 pt-6">
          {/* Label */}
          <div className="flex items-center gap-2">
            {isBossChallenge ? (
              <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                <span className="text-purple-300 text-xs font-bold">BOSS CHALLENGE</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="text-green-300 text-xs font-bold">MATH GATE</span>
              </div>
            )}
          </div>

          {/* Timer circle */}
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke={timerColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 1.51} 151`}
                className="transition-all duration-100"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
              {Math.ceil(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Problem Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {solved === null && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="text-center w-full max-w-lg"
            >
              {isBossChallenge && (
                <p className="text-purple-300/60 text-sm mb-2">Solve to deal massive damage!</p>
              )}

              {/* Problem Text */}
              {problem.problemText && (
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  {problem.problemText}
                </h2>
              )}

              {/* Drag-drop interface for young players */}
              {isYoung && problem.interaction === 'drag' && problem.setup && (
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1.5 mb-2 flex-wrap justify-center">
                      {Array.from({ length: problem.setup.pileA?.count || 0 }).map((_, i) => (
                        <motion.div
                          key={`a-${i}`}
                          className="w-9 h-9 rounded-lg cursor-grab active:cursor-grabbing shadow-lg"
                          style={{ backgroundColor: problem.setup?.pileA?.color }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          draggable
                          onDragStart={() => handleDragStart(problem.setup?.pileA?.count || 0)}
                        />
                      ))}
                    </div>
                  </div>

                  <span className="text-3xl text-white/60 font-bold">+</span>

                  <div className="flex flex-col items-center">
                    <div className="flex gap-1.5 mb-2 flex-wrap justify-center">
                      {Array.from({ length: problem.setup.pileB?.count || 0 }).map((_, i) => (
                        <motion.div
                          key={`b-${i}`}
                          className="w-9 h-9 rounded-lg cursor-grab active:cursor-grabbing shadow-lg"
                          style={{ backgroundColor: problem.setup?.pileB?.color }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          draggable
                          onDragStart={() =>
                            handleDragStart(
                              (problem.setup?.pileA?.count || 0) + (problem.setup?.pileB?.count || 0),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <span className="text-3xl text-white/60 font-bold">=</span>

                  <motion.div
                    className="w-20 h-20 rounded-xl border-3 border-dashed border-white/30 flex items-center justify-center bg-white/5"
                    whileHover={{
                      borderColor: 'rgba(0, 255, 136, 0.6)',
                      backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    }}
                    onClick={handleDrop}
                  >
                    <span className="text-white/40 text-xs text-center font-medium">
                      Tap to
                      <br />
                      merge!
                    </span>
                  </motion.div>
                </div>
              )}

              {/* Numpad interface */}
              {(!isYoung || problem.interaction === 'numpad') && (
                <div className="flex flex-col items-center">
                  {/* Answer Display */}
                  <div
                    className="border rounded-xl px-8 py-3 mb-4 min-w-[140px]"
                    style={{
                      backgroundColor: isBossChallenge ? 'rgba(153,0,255,0.1)' : 'rgba(255,255,255,0.05)',
                      borderColor: isBossChallenge ? 'rgba(153,0,255,0.2)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="text-3xl font-mono text-white">
                      {answer || <span className="text-white/20">?</span>}
                    </span>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-4 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <motion.button
                        key={digit}
                        onClick={() => handleNumpadInput(digit)}
                        className="w-14 h-14 bg-white/8 hover:bg-white/15 rounded-xl text-xl font-bold text-white transition-colors border border-white/5"
                        whileTap={{ scale: 0.9 }}
                      >
                        {digit}
                      </motion.button>
                    ))}
                    <motion.button
                      onClick={() => handleNumpadInput('0')}
                      className="w-14 h-14 bg-white/8 hover:bg-white/15 rounded-xl text-xl font-bold text-white transition-colors border border-white/5"
                      whileTap={{ scale: 0.9 }}
                    >
                      0
                    </motion.button>
                    <motion.button
                      onClick={handleClear}
                      className="w-14 h-14 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-sm font-bold text-red-300 transition-colors border border-red-500/10"
                      whileTap={{ scale: 0.9 }}
                    >
                      CLR
                    </motion.button>
                    <motion.button
                      onClick={handleSubmit}
                      className="w-14 h-14 rounded-xl text-sm font-bold transition-colors border"
                      style={{
                        backgroundColor: isBossChallenge ? 'rgba(153,0,255,0.2)' : 'rgba(0,255,136,0.2)',
                        borderColor: isBossChallenge ? 'rgba(153,0,255,0.2)' : 'rgba(0,255,136,0.1)',
                        color: isBossChallenge ? '#CC66FF' : '#66FF99',
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      GO
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {solved === true && (
            <motion.div
              key="correct"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: isBossChallenge ? 'rgba(153,0,255,0.2)' : 'rgba(0,255,136,0.2)',
                  borderColor: isBossChallenge ? '#CC66FF' : '#4ADE80',
                }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: isBossChallenge ? '#CC66FF' : '#4ADE80' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h2
                className="text-3xl font-bold"
                style={{ color: isBossChallenge ? '#CC66FF' : '#4ADE80' }}
              >
                {isBossChallenge ? 'Critical Hit!' : 'Correct!'}
              </h2>
              <p className="text-white/60 mt-1">
                {isBossChallenge
                  ? '+20 Shards + Boss Damage!'
                  : `+${isYoung ? '10' : '30'} Shards + Speed Boost!`}
              </p>
            </motion.div>
          )}

          {solved === false && (
            <motion.div
              key="wrong"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">~</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-yellow-400">
                {isBossChallenge ? 'Boss Heals!' : 'Good Try!'}
              </h2>
              <p className="text-white/60 mt-1">
                {isBossChallenge ? 'The boss recovers some health' : '+1 Shard for trying'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="p-4 flex items-center justify-between">
        {solved === null && problem.hint && (
          <div className="text-white/25 text-xs max-w-[200px]">Hint: {problem.hint}</div>
        )}
        <div className="flex-1" />
        {solved === null && (
          <motion.button
            onClick={onSkip}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white/60 text-sm transition-all border border-white/5"
            whileTap={{ scale: 0.95 }}
          >
            Skip
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
