import type { MathProblem } from '@/types';
import { DifficultyScaler } from './DifficultyScaler';

const PILE_COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];

export class MathValidator {
  static validateAnswer(problem: MathProblem, answer: number | number[]): boolean {
    if (typeof problem.validation === 'object' && 'target' in problem.validation) {
      // Direct target validation
      const target = problem.validation.target;
      const tolerance = problem.validation.tolerance;

      if (Array.isArray(answer)) {
        // For drag-drop, sum the answer
        const sum = answer.reduce((a, b) => a + b, 0);
        return Math.abs(sum - target) <= tolerance;
      }

      return Math.abs(answer - target) <= tolerance;
    }

    // Expression-based validation (for variable problems)
    if (typeof problem.validation === 'string') {
      // This would evaluate the expression with variables
      // For now, we use the pre-computed target values in the problem
      return false;
    }

    return false;
  }

  private static safeEval(expr: string): number {
    try {
      return Function(`"use strict"; return (${expr})`)();
    } catch {
      return 0;
    }
  }

  private static pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static generateProblemFromTemplate(template: MathProblem): MathProblem {
    // If no variables and no drag-randomization, return as-is
    if (!template.variables && template.interaction !== 'drag') {
      return template;
    }

    // For drag-drop templates, randomize pile sizes if they use variables
    if (template.interaction === 'drag' && template.variables) {
      return this.generateDragProblem(template);
    }

    // For drag-drop without variables but with setup, randomize colors
    if (template.interaction === 'drag' && template.setup) {
      return this.randomizeDragColors(template);
    }

    if (!template.variables) {
      return template;
    }

    // Replace base variables with random values
    let problemText = template.problemText || '';
    const values: Record<string, number> = {};

    Object.entries(template.variables).forEach(([key, options]) => {
      const value = this.pickRandom(options);
      values[key] = value;
    });

    // Compute derived variables from base variables
    if (template.derived) {
      for (const [key, expr] of Object.entries(template.derived)) {
        let evalExpr = expr;
        for (const [varName, val] of Object.entries(values)) {
          evalExpr = evalExpr.replace(new RegExp(`\\b${varName}\\b`, 'g'), val.toString());
        }
        values[key] = this.safeEval(evalExpr);
      }
    }

    // Substitute all variables (base + derived) into problem text
    for (const [key, val] of Object.entries(values)) {
      problemText = problemText.replace(new RegExp(`\\{${key}\\}`, 'g'), val.toString());
    }

    // Calculate the answer based on validation expression
    let target = 0;
    if (typeof template.validation === 'string') {
      let expr = template.validation;
      for (const [key, val] of Object.entries(values)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), val.toString());
      }
      target = this.safeEval(expr);
    }

    return {
      ...template,
      problemText,
      validation: { target, tolerance: 0 },
    };
  }

  private static generateDragProblem(template: MathProblem): MathProblem {
    const vars = template.variables!;
    const pileA = this.pickRandom(vars['A'] || [3]);
    const pileB = this.pickRandom(vars['B'] || [4]);
    const colorA = this.pickRandom(PILE_COLORS);
    let colorB = this.pickRandom(PILE_COLORS);
    while (colorB === colorA) {
      colorB = this.pickRandom(PILE_COLORS);
    }

    return {
      ...template,
      setup: {
        pileA: { count: pileA, color: colorA, shape: 'hex' },
        pileB: { count: pileB, color: colorB, shape: 'hex' },
      },
      validation: { target: pileA + pileB, tolerance: 0 },
    };
  }

  private static randomizeDragColors(template: MathProblem): MathProblem {
    if (!template.setup) return template;
    const colorA = this.pickRandom(PILE_COLORS);
    let colorB = this.pickRandom(PILE_COLORS);
    while (colorB === colorA) {
      colorB = this.pickRandom(PILE_COLORS);
    }
    return {
      ...template,
      setup: {
        pileA: template.setup.pileA ? { ...template.setup.pileA, color: colorA } : undefined,
        pileB: template.setup.pileB ? { ...template.setup.pileB, color: colorB } : undefined,
      },
    };
  }

  static getRandomProblem(templates: MathProblem[], difficulty?: number): MathProblem {
    if (templates.length === 0) {
      throw new Error('No math problem templates available');
    }

    // If difficulty provided, use DifficultyScaler for weighted selection
    if (difficulty !== undefined) {
      const template = DifficultyScaler.selectProblemForDifficulty(templates, difficulty);
      return this.generateProblemFromTemplate(template);
    }

    const template = this.pickRandom(templates);
    return this.generateProblemFromTemplate(template);
  }
}
