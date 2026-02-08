import type { MathProblem } from '@/types';

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

  static generateProblemFromTemplate(template: MathProblem): MathProblem {
    // If no variables, return as-is
    if (!template.variables) {
      return template;
    }
    
    // Replace variables with random values
    let problemText = template.problemText || '';
    const values: Record<string, number> = {};
    
    Object.entries(template.variables).forEach(([key, options]) => {
      const value = options[Math.floor(Math.random() * options.length)];
      values[key] = value;
      problemText = problemText.replace(new RegExp(`{${key}}`, 'g'), value.toString());
    });
    
    // Calculate the answer based on validation expression
    let target = 0;
    if (typeof template.validation === 'string') {
      // Simple expression evaluation
      const expr = template.validation
        .replace(/A/g, values['A']?.toString() || '0')
        .replace(/B/g, values['B']?.toString() || '0');
      
      try {
        // Safe evaluation for simple math
        target = Function(`"use strict"; return (${expr})`)();
      } catch {
        target = 0;
      }
    }
    
    return {
      ...template,
      problemText,
      validation: { target, tolerance: 0 },
    };
  }

  static getRandomProblem(templates: MathProblem[]): MathProblem {
    // Filter templates by difficulty range if needed
    const availableTemplates = templates;
    
    if (availableTemplates.length === 0) {
      throw new Error('No math problem templates available');
    }
    
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    return this.generateProblemFromTemplate(template);
  }
}
