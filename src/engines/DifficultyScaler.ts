import type { Profile } from '@/types';

interface SessionResults {
  gatesAttempted: number;
  correctAnswers: number;
  avgTime: number;
}

export class DifficultyScaler {
  static adjustDifficulty(profile: Profile, sessionResults: SessionResults): number {
    const accuracy = sessionResults.gatesAttempted > 0
      ? sessionResults.correctAnswers / sessionResults.gatesAttempted
      : 0.5;

    let newDifficulty = profile.difficulty;

    // Increase difficulty if accuracy is high
    if (accuracy > 0.8 && profile.difficulty < 5) {
      newDifficulty = profile.difficulty + 1;
    }
    // Decrease difficulty if accuracy is low
    else if (accuracy < 0.4 && profile.difficulty > 1) {
      newDifficulty = profile.difficulty - 1;
    }

    return newDifficulty;
  }

  static getVariableRange(difficulty: number, baseRange: number[]): number[] {
    // Adjust number ranges based on difficulty
    const multiplier = 1 + (difficulty - 1) * 0.2;
    return baseRange.map(n => Math.floor(n * multiplier));
  }

  static getSolveTime(difficulty: number, baseTime: number): number {
    // Adjust solve time based on difficulty
    const timeReduction = (difficulty - 1) * 0.5;
    return Math.max(5, baseTime - timeReduction);
  }
}
