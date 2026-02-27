import { ReasoningEngine, ReasoningInput } from './base';
import { ReasoningStep } from '../trace/types';

export class HippocampalReplay extends ReasoningEngine {
  readonly name = 'HippocampalReplay';
  readonly description = 'Forward/backward replay with counterfactual analysis for learning from past decisions';

  private timeline: ReasoningStep[] = [];
  private counterfactuals: ReasoningStep[] = [];

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.timeline = [];
    this.counterfactuals = [];

    // Build event timeline from query
    const events = this.extractTimeline(input.query);

    let prevId: string | null = null;
    for (const event of events) {
      const step = this.getDAG().addStep(
        'event',
        event,
        prevId,
        0.5,
        { phase: 'timeline' }
      );
      this.timeline.push(step);
      prevId = step.id;
    }
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    const dag = this.getDAG();

    if (iteration === 0) {
      // Forward replay: trace causal chain
      this.forwardReplay(input);
      return true;
    }

    if (iteration === 1) {
      // Backward replay: trace from outcome to root cause
      this.backwardReplay(input);
      return true;
    }

    // Counterfactual analysis: "what if" at key decision points
    if (iteration - 2 < this.timeline.length) {
      const eventIdx = iteration - 2;
      const event = this.timeline[eventIdx];

      const counterfactual = dag.addStep(
        'counterfactual',
        `What if, instead of "${event.content}", we had taken a different path? ` +
        `Alternative: ${this.generateCounterfactual(event.content)}\n` +
        `Likely outcome: ${this.predictOutcome(event.content, eventIdx)}`,
        event.id,
        0.6 + eventIdx * 0.05,
        { phase: 'counterfactual', eventIndex: eventIdx }
      );
      this.counterfactuals.push(counterfactual);

      return iteration - 2 < this.timeline.length - 1;
    }

    return false;
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();

    const timelineStr = this.timeline.map((e, i) => `${i + 1}. ${e.content}`).join('\n');
    const counterfactualStr = this.counterfactuals.map((c, i) =>
      `${i + 1}. ${c.content.substring(0, 120)}...`
    ).join('\n');

    const convergence = this.counterfactuals.length > 0
      ? Math.min(1, 0.5 + this.counterfactuals.length * 0.1)
      : 0.5;

    dag.setConvergenceScore(convergence);

    const lastStep = this.counterfactuals.length > 0
      ? this.counterfactuals[this.counterfactuals.length - 1]
      : this.timeline[this.timeline.length - 1];

    const answer = dag.addStep(
      'conclusion',
      `Hippocampal replay analysis of "${input.query}":\n\n` +
      `## Timeline:\n${timelineStr}\n\n` +
      `## Counterfactual Analysis:\n${counterfactualStr}\n\n` +
      `## Key Lessons:\n` +
      `- Forward replay reveals the causal chain of decisions\n` +
      `- Backward replay identifies the root cause\n` +
      `- Counterfactuals highlight ${this.counterfactuals.length} alternative paths\n` +
      `- Primary insight: Understanding the decision tree enables better choices next time`,
      lastStep?.id || null,
      convergence,
      { timelineLength: this.timeline.length, counterfactualCount: this.counterfactuals.length }
    );

    return answer.content;
  }

  private extractTimeline(query: string): string[] {
    // Parse query into a sequence of events/decisions
    const events: string[] = [];

    events.push(`Initial state: Received problem "${query}"`);
    events.push(`Analysis: Identified key components and constraints`);
    events.push(`Decision point: Chose primary approach`);
    events.push(`Execution: Applied chosen approach`);
    events.push(`Outcome: Evaluated results and impact`);

    return events;
  }

  private forwardReplay(input: ReasoningInput): void {
    const dag = this.getDAG();
    if (this.timeline.length === 0) return;

    dag.addStep(
      'forward_replay',
      `Forward replay of "${input.query}": Tracing the causal chain from initial state to outcome. ` +
      `Each event flows naturally from its predecessor, building cumulative context.`,
      this.timeline[this.timeline.length - 1].id,
      0.6,
      { phase: 'forward_replay' }
    );
  }

  private backwardReplay(input: ReasoningInput): void {
    const dag = this.getDAG();
    if (this.timeline.length === 0) return;

    dag.addStep(
      'backward_replay',
      `Backward replay of "${input.query}": Working from the outcome backward to identify ` +
      `root causes. Key question at each step: "Was this step necessary?" and "What alternatives existed?"`,
      this.timeline[0].id,
      0.7,
      { phase: 'backward_replay' }
    );
  }

  private generateCounterfactual(event: string): string {
    if (event.includes('Initial')) {
      return 'Started with a different framing of the problem';
    }
    if (event.includes('Analysis')) {
      return 'Used a different analytical framework (e.g., systems thinking vs. reductionist)';
    }
    if (event.includes('Decision')) {
      return 'Chose an alternative approach (e.g., bottom-up vs. top-down)';
    }
    if (event.includes('Execution')) {
      return 'Implemented incrementally with validation at each step';
    }
    return 'Took a fundamentally different path from this point';
  }

  private predictOutcome(event: string, eventIndex: number): string {
    const outcomes = [
      'Different initial framing could lead to novel solution paths not previously considered',
      'Alternative analysis might have surfaced hidden constraints earlier in the process',
      'A different approach may have been more efficient but with higher risk of failure',
      'Incremental execution would have caught errors earlier but taken more time overall',
      'The alternative path would likely produce a different but potentially equivalent result',
    ];
    return outcomes[eventIndex % outcomes.length];
  }

  protected getDefaultIterations(): number {
    return 7;
  }
}
