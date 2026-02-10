import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, MathProblem } from '@/types';
import { MathValidator } from '@/engines/MathValidator';
import { useGameStore } from '@/stores/gameStore';
import emersonGates from '@/content/gates/emerson.json';
import kyraGates from '@/content/gates/kyra.json';

interface MathQuizProps {
  profile: Profile;
}

const QUIZ_LENGTH = 10;

export function MathQuiz({ profile }: MathQuizProps) {
  const [state, setState] = useState<'idle' | 'active' | 'results'>('idle');
  const [questions, setQuestions] = useState<MathProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const { updateProfile } = useGameStore();

  const isYoung = profile.age <= 8;
  const questionTime = isYoung ? 15 : 12;
  const shardsPerCorrect = isYoung ? 5 : 8;

  const startQuiz = useCallback(() => {
    const gateData = isYoung ? emersonGates : kyraGates;
    const allTemplates = gateData.templates as MathProblem[];
    // Filter to numpad-only problems (drag problems can't be solved in quiz)
    const templates = allTemplates.filter(t => t.interaction === 'numpad');
    const generated: MathProblem[] = [];
    for (let i = 0; i < QUIZ_LENGTH; i++) {
      generated.push(MathValidator.getRandomProblem(templates));
    }
    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setAnswer('');
    setFeedback(null);
    setTimeLeft(questionTime);
    setState('active');
  }, [isYoung, questionTime]);

  // Timer
  useEffect(() => {
    if (state !== 'active' || feedback !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [state, feedback, currentIndex]);

  const handleSubmit = useCallback(
    (timeout = false) => {
      if (feedback !== null) return;
      const problem = questions[currentIndex];
      if (!problem) return;

      let isCorrect = false;
      if (!timeout) {
        const numAnswer = parseInt(answer, 10);
        if (!isNaN(numAnswer)) {
          isCorrect = MathValidator.validateAnswer(problem, numAnswer);
        }
      }

      if (isCorrect) {
        setScore((prev) => prev + 1);
      }
      setFeedback(isCorrect ? 'correct' : 'wrong');

      setTimeout(() => {
        if (currentIndex + 1 >= QUIZ_LENGTH) {
          const finalScore = isCorrect ? score + 1 : score;
          const reward = finalScore * shardsPerCorrect;
          // Award shards directly to profile
          updateProfile(profile.id, {
            shards: profile.shards + reward,
          });
          setState('results');
        } else {
          setCurrentIndex((prev) => prev + 1);
          setAnswer('');
          setFeedback(null);
          setTimeLeft(questionTime);
        }
      }, 1000);
    },
    [answer, currentIndex, feedback, questions, score, shardsPerCorrect, questionTime, profile, updateProfile],
  );

  const handleNumpad = (digit: string) => {
    if (feedback !== null) return;
    if (answer.length < 4) {
      setAnswer((prev) => prev + digit);
    }
  };

  const handleClear = () => {
    if (feedback !== null) return;
    setAnswer('');
  };

  // Idle state
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <motion.div
          className="text-center max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Math Quiz</h2>
          <p className="text-white/50 text-sm mb-2">
            Answer {QUIZ_LENGTH} questions to earn bonus shards!
          </p>
          <p className="text-yellow-400/60 text-sm mb-6">
            {shardsPerCorrect} shards per correct answer (up to {QUIZ_LENGTH * shardsPerCorrect})
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Questions</span>
              <span className="text-white/60">{QUIZ_LENGTH}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Time per question</span>
              <span className="text-white/60">{questionTime}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Difficulty</span>
              <span className="text-white/60">{isYoung ? 'Addition & Subtraction' : 'Multiplication & Division'}</span>
            </div>
          </div>

          <motion.button
            onClick={startQuiz}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Quiz
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Results state
  if (state === 'results') {
    const finalScore = score;
    const reward = finalScore * shardsPerCorrect;
    const percentage = (finalScore / QUIZ_LENGTH) * 100;

    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <motion.div
          className="text-center max-w-sm w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center border-2"
            style={{
              backgroundColor: percentage >= 70 ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
              borderColor: percentage >= 70 ? '#22C55E' : '#EAB308',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <span className="text-3xl font-bold" style={{ color: percentage >= 70 ? '#22C55E' : '#EAB308' }}>
              {finalScore}
            </span>
          </motion.div>

          <h2 className="text-3xl font-bold text-white mb-1">
            {percentage >= 90 ? 'Perfect!' : percentage >= 70 ? 'Great Job!' : percentage >= 50 ? 'Good Try!' : 'Keep Practicing!'}
          </h2>
          <p className="text-white/50 mb-6">
            {finalScore} / {QUIZ_LENGTH} correct
          </p>

          <motion.div
            className="bg-yellow-500/10 rounded-2xl p-5 border border-yellow-500/20 mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
              </svg>
              <span className="text-2xl font-bold text-yellow-400">+{reward}</span>
              <span className="text-yellow-400/60 text-sm">Shards earned!</span>
            </div>
          </motion.div>

          <div className="space-y-3">
            <motion.button
              onClick={startQuiz}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl"
              whileTap={{ scale: 0.97 }}
            >
              Try Again
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active quiz state
  const problem = questions[currentIndex];
  const progress = ((currentIndex) / QUIZ_LENGTH) * 100;
  const timerPercent = (timeLeft / questionTime) * 100;
  const timerColor = timerPercent > 50 ? '#00FF88' : timerPercent > 25 ? '#FFD700' : '#FF3366';

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/40 text-xs font-medium">
            Question {currentIndex + 1} / {QUIZ_LENGTH}
          </span>
          <span className="text-white/40 text-xs font-mono">{Math.ceil(timeLeft)}s</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: timerColor, width: `${timerPercent}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {feedback === null && problem && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center w-full max-w-md"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
                {problem.problemText || 'Solve it!'}
              </h2>

              {/* Answer display */}
              <div className="border rounded-xl px-8 py-3 mb-4 min-w-[140px] inline-block bg-white/5 border-white/10">
                <span className="text-3xl font-mono text-white">
                  {answer || <span className="text-white/20">?</span>}
                </span>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-4 gap-2 max-w-[240px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <motion.button
                    key={digit}
                    onClick={() => handleNumpad(digit)}
                    className="w-14 h-14 bg-white/8 hover:bg-white/15 rounded-xl text-xl font-bold text-white transition-colors border border-white/5"
                    whileTap={{ scale: 0.9 }}
                  >
                    {digit}
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => handleNumpad('0')}
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
                  onClick={() => handleSubmit(false)}
                  className="w-14 h-14 bg-green-500/20 hover:bg-green-500/30 rounded-xl text-sm font-bold text-green-300 transition-colors border border-green-500/10"
                  whileTap={{ scale: 0.9 }}
                >
                  GO
                </motion.button>
              </div>

              {problem.hint && (
                <p className="text-white/20 text-xs mt-4">Hint: {problem.hint}</p>
              )}
            </motion.div>
          )}

          {feedback === 'correct' && (
            <motion.div
              key="correct"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-400">Correct!</h3>
            </motion.div>
          )}

          {feedback === 'wrong' && (
            <motion.div
              key="wrong"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-yellow-400">~</span>
              </div>
              <h3 className="text-2xl font-bold text-yellow-400">Not quite!</h3>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Score tracker */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: QUIZ_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < currentIndex
                  ? i < score
                    ? 'bg-green-400'
                    : 'bg-red-400/60'
                  : i === currentIndex
                    ? 'bg-white/60 scale-125'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
