import { ReasoningEngine, ReasoningInput } from './base';
import { ReasoningStep } from '../trace/types';

export class DialecticalSpiral extends ReasoningEngine {
  readonly name = 'DialecticalSpiral';
  readonly description = 'Thesis-antithesis-synthesis with convergence for architecture decisions';

  private syntheses: ReasoningStep[] = [];
  private convergenceHistory: number[] = [];

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.syntheses = [];
    this.convergenceHistory = [];
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    const dag = this.getDAG();
    const parentId = iteration > 0 ? this.syntheses[iteration - 1]?.id || null : null;

    // Thesis: propose a position
    const thesis = dag.addStep(
      'thesis',
      this.generateThesis(input.query, iteration, parentId ? this.syntheses[iteration - 1].content : null),
      parentId,
      0.6 + iteration * 0.05,
      { iteration, role: 'thesis' }
    );

    // Antithesis: counter-argument
    const antithesis = dag.addStep(
      'antithesis',
      this.generateAntithesis(thesis.content, iteration),
      thesis.id,
      0.6 + iteration * 0.05,
      { iteration, role: 'antithesis' }
    );

    // Synthesis: reconcile
    const synthesis = dag.addStep(
      'synthesis',
      this.generateSynthesis(thesis.content, antithesis.content, iteration),
      antithesis.id,
      0.7 + iteration * 0.05,
      { iteration, role: 'synthesis' }
    );

    this.syntheses.push(synthesis);

    // Check convergence
    if (this.syntheses.length >= 2) {
      const prev = this.syntheses[this.syntheses.length - 2].content;
      const curr = synthesis.content;
      const convergence = this.measureConvergence(prev, curr);
      this.convergenceHistory.push(convergence);

      if (convergence > 0.85) return false; // Converged
    }

    return true;
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();
    const finalSynthesis = this.syntheses[this.syntheses.length - 1];

    const convergence = this.convergenceHistory.length > 0
      ? this.convergenceHistory[this.convergenceHistory.length - 1]
      : 0.5;

    dag.setConvergenceScore(convergence);

    const answer = dag.addStep(
      'conclusion',
      `After ${this.syntheses.length} dialectical rounds on "${input.query}":\n\n` +
      `Final position: ${finalSynthesis.content}\n\n` +
      `Convergence: ${(convergence * 100).toFixed(0)}%\n` +
      `Rounds: ${this.syntheses.length}`,
      finalSynthesis.id,
      0.9,
      { convergence, rounds: this.syntheses.length }
    );

    return answer.content;
  }

  private generateThesis(query: string, iteration: number, previousSynthesis: string | null): string {
    if (iteration === 0) {
      return `Initial position on "${query}": The straightforward approach would prioritize simplicity, ` +
        `using well-established patterns and minimal complexity. Focus on the most common use case first.`;
    }
    return `Refined thesis (round ${iteration + 1}): Building on "${previousSynthesis?.substring(0, 100)}...", ` +
      `we should emphasize the strengths identified while addressing remaining gaps.`;
  }

  private generateAntithesis(thesis: string, iteration: number): string {
    return `Counter-argument (round ${iteration + 1}): However, the thesis overlooks important considerations. ` +
      `"${thesis.substring(0, 80)}..." fails to account for edge cases, scalability concerns, ` +
      `and potential maintenance burden. An alternative approach would prioritize robustness and extensibility.`;
  }

  private generateSynthesis(thesis: string, antithesis: string, iteration: number): string {
    return `Synthesis (round ${iteration + 1}): Integrating the thesis's focus on simplicity with the ` +
      `antithesis's concerns about robustness, the optimal approach balances both. ` +
      `Key insight: start simple but design extension points for future complexity. ` +
      `Specifically, address the core use case with clean abstractions that can accommodate the edge cases identified.`;
  }

  private measureConvergence(prev: string, curr: string): number {
    // Simple word overlap as convergence proxy
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    const currWords = new Set(curr.toLowerCase().split(/\s+/));

    let overlap = 0;
    for (const w of prevWords) {
      if (currWords.has(w)) overlap++;
    }

    return overlap / Math.max(prevWords.size, currWords.size);
  }

  protected getDefaultIterations(): number {
    return 4;
  }
}
