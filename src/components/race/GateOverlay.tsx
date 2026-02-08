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
}

export function GateOverlay({ profile, onSolve, onSkip }: GateOverlayProps) {
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [timeLeft, setTimeLeft] = useState(8);
  const [answer, setAnswer] = useState('');
  const [draggedCrystals, setDraggedCrystals] = useState<number>(0);
  const [solved, setSolved] = useState<boolean | null>(null);

  const isEmerson = profile.id === 'emerson';
  const solveTime = isEmerson ? emersonGates.solveTime : kyraGates.solveTime;
  const templates = isEmerson ? emersonGates.templates : kyraGates.templates;

  useEffect(() => {
    // Generate a random problem
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const generatedProblem = MathValidator.generateProblemFromTemplate(randomTemplate as MathProblem);
    setProblem(generatedProblem);
    setTimeLeft(solveTime);
  }, []);

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
      setTimeout(() => onSolve(false), 500);
    }
  }, [solved, onSolve]);

  const handleNumpadInput = (digit: string) => {
    if (solved !== null) return;
    if (answer.length < 3) {
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
    const isCorrect = MathValidator.validateAnswer(problem, numAnswer);
    
    setSolved(isCorrect);
    setTimeout(() => onSolve(isCorrect), 500);
  };

  const handleDragStart = (count: number) => {
    if (solved !== null) return;
    setDraggedCrystals(count);
  };

  const handleDrop = () => {
    if (solved !== null || !problem) return;
    
    const isCorrect = MathValidator.validateAnswer(problem, draggedCrystals);
    setSolved(isCorrect);
    setTimeout(() => onSolve(isCorrect), 500);
  };

  const progress = (timeLeft / solveTime) * 100;

  if (!problem) return null;

  return (
    <motion.div
      className="absolute inset-x-0 top-0 bg-black/80 backdrop-blur-md border-b-4 border-white/20"
      style={{ height: '40%' }}
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
    >
      {/* Timer Circle */}
      <div className="absolute top-4 right-4">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#333"
              strokeWidth="4"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={progress > 30 ? '#00FF88' : '#FF3366'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 1.76} 176`}
              className="transition-all duration-100"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
            {Math.ceil(timeLeft)}
          </div>
        </div>
      </div>

      {/* Problem Display */}
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AnimatePresence mode="wait">
          {solved === null && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              {/* Problem Text */}
              {problem.problemText && (
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  {problem.problemText}
                </h2>
              )}

              {/* Drag-drop interface for Emerson */}
              {isEmerson && problem.interaction === 'drag' && problem.setup && (
                <div className="flex items-center gap-8">
                  {/* Pile A */}
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2 mb-2">
                      {Array.from({ length: problem.setup.pileA?.count || 0 }).map((_, i) => (
                        <motion.div
                          key={`a-${i}`}
                          className="w-10 h-10 rounded-lg cursor-grab active:cursor-grabbing"
                          style={{ backgroundColor: problem.setup?.pileA?.color }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          draggable
                          onDragStart={() => handleDragStart(problem.setup?.pileA?.count || 0)}
                        />
                      ))}
                    </div>
                    <span className="text-white/60 text-sm">Drag these</span>
                  </div>

                  <span className="text-4xl text-white">+</span>

                  {/* Pile B */}
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2 mb-2">
                      {Array.from({ length: problem.setup.pileB?.count || 0 }).map((_, i) => (
                        <motion.div
                          key={`b-${i}`}
                          className="w-10 h-10 rounded-lg cursor-grab active:cursor-grabbing"
                          style={{ backgroundColor: problem.setup?.pileB?.color }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          draggable
                          onDragStart={() => handleDragStart(
                            (problem.setup?.pileA?.count || 0) + (problem.setup?.pileB?.count || 0)
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-white/60 text-sm">And these</span>
                  </div>

                  <span className="text-4xl text-white">=</span>

                  {/* Drop Zone */}
                  <motion.div
                    className="w-24 h-24 rounded-xl border-4 border-dashed border-white/40 flex items-center justify-center"
                    whileHover={{ borderColor: 'rgba(255,255,255,0.8)' }}
                    onClick={handleDrop}
                  >
                    <span className="text-white/60 text-sm text-center">
                      Tap to<br />merge!
                    </span>
                  </motion.div>
                </div>
              )}

              {/* Numpad for Kyra or number problems */}
              {(!isEmerson || problem.interaction === 'numpad') && (
                <div className="flex flex-col items-center">
                  {/* Answer Display */}
                  <div className="bg-black/50 rounded-xl px-8 py-4 mb-4 min-w-[120px]">
                    <span className="text-4xl font-mono text-white">
                      {answer || '?'}
                    </span>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <motion.button
                        key={digit}
                        onClick={() => handleNumpadInput(digit)}
                        className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-xl text-2xl font-bold text-white transition-colors"
                        whileTap={{ scale: 0.9 }}
                      >
                        {digit}
                      </motion.button>
                    ))}
                    <motion.button
                      onClick={handleClear}
                      className="w-16 h-16 bg-red-500/30 hover:bg-red-500/50 rounded-xl text-lg font-bold text-red-300 transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      CLR
                    </motion.button>
                    <motion.button
                      onClick={() => handleNumpadInput('0')}
                      className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-xl text-2xl font-bold text-white transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      0
                    </motion.button>
                    <motion.button
                      onClick={handleSubmit}
                      className="w-16 h-16 bg-green-500/30 hover:bg-green-500/50 rounded-xl text-lg font-bold text-green-300 transition-colors"
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
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-green-400">Correct!</h2>
              <p className="text-white/80 mt-2">+{isEmerson ? '10' : '30'} Shards!</p>
            </motion.div>
          )}

          {solved === false && (
            <motion.div
              key="wrong"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">💫</div>
              <h2 className="text-4xl font-bold text-yellow-400">Good Try!</h2>
              <p className="text-white/80 mt-2">+1 Shard for trying</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip Button */}
        {solved === null && (
          <motion.button
            onClick={onSkip}
            className="absolute bottom-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white/60 text-sm transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Skip Gate
          </motion.button>
        )}

        {/* Hint */}
        {solved === null && problem.hint && (
          <div className="absolute bottom-4 left-4 text-white/40 text-sm">
            💡 {problem.hint}
          </div>
        )}
      </div>
    </motion.div>
  );
}
