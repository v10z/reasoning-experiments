import { ReasoningEngine, ReasoningInput } from './base';
import { ReasoningStep } from '../trace/types';

export class FractalRecursion extends ReasoningEngine {
  readonly name = 'FractalRecursion';
  readonly description = 'Decomposes problems at multiple scales, breaking large tasks into implementable pieces';

  private rootStep: ReasoningStep | null = null;
  private currentLevel: ReasoningStep[] = [];
  private maxDepth: number = 3;

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.maxDepth = input.maxIterations || 3;
    this.rootStep = this.getDAG().addStep(
      'problem',
      `Root problem: ${input.query}`,
      null,
      1.0,
      { level: 0 }
    );
    this.currentLevel = [this.rootStep];
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    if (iteration >= this.maxDepth) return false;

    const nextLevel: ReasoningStep[] = [];

    for (const parent of this.currentLevel) {
      const subproblems = this.decompose(parent.content, iteration + 1);

      for (const sub of subproblems) {
        const step = this.getDAG().addStep(
          'subproblem',
          sub,
          parent.id,
          1.0 / (iteration + 2),
          { level: iteration + 1 }
        );
        nextLevel.push(step);
      }
    }

    this.currentLevel = nextLevel;
    return nextLevel.length > 0 && iteration < this.maxDepth - 1;
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();
    const leaves = dag.getLeaves();
    const depth = dag.getDepth();

    // Build bottom-up synthesis
    const leafSummaries = leaves.map(l => `- ${l.content}`).join('\n');

    const synthesis = this.getDAG().addStep(
      'synthesis',
      `Decomposition of "${input.query}" into ${leaves.length} actionable pieces across ${depth} levels:\n${leafSummaries}`,
      this.rootStep!.id,
      0.9,
      { totalPieces: leaves.length, depth }
    );

    dag.setConvergenceScore(Math.min(1, depth / this.maxDepth));

    return synthesis.content;
  }

  private decompose(problem: string, level: number): string[] {
    // Heuristic decomposition based on problem structure
    const parts: string[] = [];
    const words = problem.toLowerCase().split(/\s+/);

    if (level === 1) {
      // First level: identify major components
      parts.push(`Define requirements for: ${problem}`);
      parts.push(`Identify constraints for: ${problem}`);
      parts.push(`Design approach for: ${problem}`);
    } else if (level === 2) {
      // Second level: break into implementation steps
      if (problem.includes('requirements') || problem.includes('define')) {
        parts.push(`Functional requirements: ${this.extractCore(problem)}`);
        parts.push(`Non-functional requirements: ${this.extractCore(problem)}`);
      } else if (problem.includes('constraints') || problem.includes('identify')) {
        parts.push(`Technical constraints: ${this.extractCore(problem)}`);
        parts.push(`Business constraints: ${this.extractCore(problem)}`);
      } else if (problem.includes('design') || problem.includes('approach')) {
        parts.push(`Architecture decisions: ${this.extractCore(problem)}`);
        parts.push(`Implementation plan: ${this.extractCore(problem)}`);
      } else {
        parts.push(`Analyze: ${problem}`);
        parts.push(`Implement: ${problem}`);
      }
    } else {
      // Deeper levels: atomic tasks
      parts.push(`Execute: ${problem}`);
    }

    return parts;
  }

  private extractCore(text: string): string {
    // Remove prefixes like "Define requirements for:" etc.
    return text.replace(/^(define|identify|design|analyze|implement|execute)\s+\w+\s+(for:\s*)?/i, '').trim() || text;
  }

  protected getDefaultIterations(): number {
    return 3;
  }
}
