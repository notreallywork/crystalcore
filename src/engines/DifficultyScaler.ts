import type { MathProblem, Profile, RaceSession } from '@/types';

interface SessionResults {
  gatesAttempted: number;
  correctAnswers: number;
  avgTime: number;
}

export class DifficultyScaler {
  /**
   * End-of-race difficulty adjustment for the persistent profile.
   * Bumps up on high accuracy, drops on low accuracy.
   */
  static adjustDifficulty(profile: Profile, sessionResults: SessionResults): number {
    const accuracy = sessionResults.gatesAttempted > 0
      ? sessionResults.correctAnswers / sessionResults.gatesAttempted
      : 0.5;

    let newDifficulty = profile.difficulty;

    if (accuracy > 0.8 && profile.difficulty < 5) {
      newDifficulty = profile.difficulty + 1;
    } else if (accuracy < 0.4 && profile.difficulty > 1) {
      newDifficulty = profile.difficulty - 1;
    }

    return newDifficulty;
  }

  /**
   * Returns the effective difficulty for problem selection.
   * Uses in-session adaptive difficulty if available, otherwise profile difficulty.
   */
  static getEffectiveDifficulty(profile: Profile, session: RaceSession | null): number {
    if (session) {
      return session.sessionDifficulty;
    }
    return profile.difficulty;
  }

  /**
   * Filter templates to those at or below the given difficulty,
   * weighted toward the player's current level.
   * At difficulty 1: only level 1 templates.
   * At difficulty 3: levels 1-3, but heavily favoring level 2-3.
   * At difficulty 5: all levels, favoring 4-5.
   */
  static selectProblemForDifficulty(templates: MathProblem[], difficulty: number): MathProblem {
    // Filter to eligible templates (level <= difficulty, or no level set)
    const eligible = templates.filter((t) => (t.level ?? 1) <= difficulty);
    if (eligible.length === 0) {
      // Fallback: pick from all templates
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Weight toward higher-level problems near the player's current difficulty
    const weighted: MathProblem[] = [];
    for (const t of eligible) {
      const level = t.level ?? 1;
      // Problems at or near the player's difficulty get more weight
      // Level == difficulty: weight 4, one below: weight 2, others: weight 1
      let weight = 1;
      if (level === difficulty) weight = 4;
      else if (level === difficulty - 1) weight = 2;
      for (let i = 0; i < weight; i++) {
        weighted.push(t);
      }
    }

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  /**
   * Adjust solve time based on difficulty.
   * Higher difficulty = less time to answer.
   */
  static getSolveTime(difficulty: number, baseTime: number): number {
    // Reduce time by 0.5s per difficulty level above 1
    const timeReduction = (difficulty - 1) * 0.5;
    return Math.max(5, baseTime - timeReduction);
  }

  /**
   * Get shard reward multiplier for difficulty.
   * Higher difficulty = more shards.
   */
  static getRewardMultiplier(difficulty: number): number {
    return 1 + (difficulty - 1) * 0.25;
  }
}
