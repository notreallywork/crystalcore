import { motion } from 'framer-motion';

interface ShardCounterProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function ShardCounter({ count, size = 'md', animated = true }: ShardCounterProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={animated ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        <svg
          className={`${iconSizes[size]} text-yellow-400`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
        </svg>
      </motion.div>
      <motion.span
        className={`${sizeClasses[size]} font-bold text-yellow-400`}
        key={count}
        initial={animated ? { scale: 1.2 } : {}}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {count.toLocaleString()}
      </motion.span>
    </div>
  );
}
