import { ReasoningEngine, ReasoningInput } from './base';
import { ReasoningStep } from '../trace/types';

export class MetaCognitiveLoop extends ReasoningEngine {
  readonly name = 'MetaCognitiveLoop';
  readonly description = 'Self-reflective reasoning that monitors and adjusts its own thinking process';

  private currentApproach: ReasoningStep | null = null;
  private reflections: ReasoningStep[] = [];
  private stuckCount: number = 0;

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.reflections = [];
    this.stuckCount = 0;

    // Initial approach
    this.currentApproach = this.getDAG().addStep(
      'approach',
      `Initial approach to "${input.query}": Analyze the problem systematically by identifying known constraints, unknowns, and potential solution paths.`,
      null,
      0.5,
      { phase: 'initial', confidence: 0.5 }
    );
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    const dag = this.getDAG();

    // Step 1: Execute current approach
    const execution = dag.addStep(
      'execution',
      this.executeApproach(this.currentApproach!.content, iteration),
      this.currentApproach!.id,
      0.5 + iteration * 0.1,
      { iteration, phase: 'execution' }
    );

    // Step 2: Monitor — evaluate how well the approach is working
    const monitoring = dag.addStep(
      'monitoring',
      this.monitorProgress(execution.content, iteration),
      execution.id,
      0.6,
      { iteration, phase: 'monitoring' }
    );

    // Step 3: Reflect — assess whether to continue, adjust, or pivot
    const confidence = this.assessConfidence(iteration);
    const reflection = dag.addStep(
      'reflection',
      this.reflect(monitoring.content, confidence, iteration),
      monitoring.id,
      confidence,
      { iteration, phase: 'reflection', confidence }
    );
    this.reflections.push(reflection);

    // Step 4: Adapt if confidence is low
    if (confidence < 0.4) {
      this.stuckCount++;
      const pivot = dag.addStep(
        'pivot',
        this.generatePivot(input.query, this.stuckCount),
        reflection.id,
        0.5,
        { iteration, phase: 'pivot', stuckCount: this.stuckCount }
      );
      this.currentApproach = pivot;
    } else {
      this.stuckCount = 0;
      // Refine current approach
      const refinement = dag.addStep(
        'refinement',
        `Refined approach: ${execution.content} — confidence ${(confidence * 100).toFixed(0)}%, continuing with adjustments.`,
        reflection.id,
        confidence,
        { iteration, phase: 'refinement' }
      );
      this.currentApproach = refinement;
    }

    return confidence < 0.9;
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();
    const totalReflections = this.reflections.length;
    const pivots = this.reflections.filter(r => (r.metadata.confidence as number) < 0.4).length;

    const finalConfidence = this.reflections.length > 0
      ? (this.reflections[this.reflections.length - 1].metadata.confidence as number)
      : 0.5;

    dag.setConvergenceScore(finalConfidence);

    const answer = dag.addStep(
      'conclusion',
      `Meta-cognitive analysis of "${input.query}":\n\n` +
      `Final approach: ${this.currentApproach!.content}\n\n` +
      `Process: ${totalReflections} reflection cycles, ${pivots} strategy pivots\n` +
      `Final confidence: ${(finalConfidence * 100).toFixed(0)}%\n\n` +
      `Key insight: Self-monitoring revealed that ` +
      (pivots > 0
        ? `the initial approach needed ${pivots} adjustment(s) before converging on a viable solution.`
        : `the initial approach was sound and refined through progressive iterations.`),
      this.currentApproach!.id,
      finalConfidence,
      { totalReflections, pivots, finalConfidence }
    );

    return answer.content;
  }

  private executeApproach(approach: string, iteration: number): string {
    return `Executing (step ${iteration + 1}): ${approach} — ` +
      `Working through the problem by examining each component and testing assumptions.`;
  }

  private monitorProgress(execution: string, iteration: number): string {
    return `Progress check (step ${iteration + 1}): ` +
      `Evaluating whether the current line of reasoning is productive. ` +
      `Checking for circular reasoning, overlooked constraints, and confirmation bias.`;
  }

  private assessConfidence(iteration: number): number {
    // Confidence generally increases with iterations but can dip
    const baseConfidence = Math.min(0.9, 0.3 + iteration * 0.15);
    // Simulate occasional drops when stuck
    if (this.stuckCount > 0) {
      return Math.max(0.2, baseConfidence - this.stuckCount * 0.2);
    }
    return baseConfidence;
  }

  private reflect(monitoring: string, confidence: number, iteration: number): string {
    if (confidence > 0.7) {
      return `Reflection: The current approach is productive (confidence: ${(confidence * 100).toFixed(0)}%). ` +
        `The reasoning is converging on a clear answer. Continue refining.`;
    }
    if (confidence > 0.4) {
      return `Reflection: Making progress but some uncertainty remains (confidence: ${(confidence * 100).toFixed(0)}%). ` +
        `Consider alternative perspectives or additional constraints.`;
    }
    return `Reflection: The current approach may be stuck (confidence: ${(confidence * 100).toFixed(0)}%). ` +
      `Need to pivot — try a different angle or break the problem down differently.`;
  }

  private generatePivot(query: string, stuckCount: number): string {
    const strategies = [
      `Pivot: Inverting the problem — instead of solving "${query}" directly, consider what would make it impossible and work backward.`,
      `Pivot: Simplifying — reduce "${query}" to its minimal essential version and solve that first.`,
      `Pivot: Analogical reasoning — find a similar, already-solved problem and adapt the solution.`,
      `Pivot: Constraint relaxation — temporarily remove constraints to find the solution space, then re-add them.`,
    ];
    return strategies[(stuckCount - 1) % strategies.length];
  }

  protected getDefaultIterations(): number {
    return 5;
  }
}
