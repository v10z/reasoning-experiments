import { ReasoningEngine, ReasoningInput } from './base';
import { ReasoningStep } from '../trace/types';

export class SimulatedAnnealing extends ReasoningEngine {
  readonly name = 'SimulatedAnnealing';
  readonly description = 'Temperature-based exploration/convergence for debugging and hypothesis testing';

  private currentBest: ReasoningStep | null = null;
  private currentBestScore: number = 0;
  private temperature: number = 1.0;
  private coolingRate: number = 0.3;
  private hypotheses: ReasoningStep[] = [];

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.currentBest = null;
    this.currentBestScore = 0;
    this.temperature = 1.0;
    this.coolingRate = 0.3;
    this.hypotheses = [];

    // Generate initial hypotheses
    const initialHypotheses = this.generateHypotheses(input.query);

    for (const hyp of initialHypotheses) {
      const score = this.scoreHypothesis(hyp, input.query);
      const step = this.getDAG().addStep(
        'hypothesis',
        hyp,
        null,
        score,
        { temperature: this.temperature, phase: 'exploration' }
      );
      this.hypotheses.push(step);

      if (score > this.currentBestScore) {
        this.currentBestScore = score;
        this.currentBest = step;
      }
    }
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    this.temperature *= (1 - this.coolingRate);
    const dag = this.getDAG();

    if (this.temperature < 0.05) return false;

    // Generate neighbor hypothesis (perturbation of current best)
    const neighbor = this.perturb(this.currentBest!.content, iteration);
    const neighborScore = this.scoreHypothesis(neighbor, input.query);

    const phase = this.temperature > 0.5 ? 'exploration' : 'convergence';
    const step = dag.addStep(
      'hypothesis',
      neighbor,
      this.currentBest!.id,
      neighborScore,
      { temperature: this.temperature, phase, iteration }
    );

    // Accept or reject based on temperature
    const delta = neighborScore - this.currentBestScore;
    const acceptProbability = delta > 0 ? 1 : Math.exp(delta / this.temperature);

    if (Math.random() < acceptProbability) {
      this.currentBest = step;
      this.currentBestScore = neighborScore;

      dag.addStep(
        'acceptance',
        `Accepted: score=${neighborScore.toFixed(2)}, delta=${delta.toFixed(2)}, temp=${this.temperature.toFixed(2)}`,
        step.id,
        neighborScore,
        { accepted: true, delta, temperature: this.temperature }
      );
    } else {
      dag.addStep(
        'rejection',
        `Rejected: score=${neighborScore.toFixed(2)}, delta=${delta.toFixed(2)}, temp=${this.temperature.toFixed(2)}`,
        step.id,
        neighborScore,
        { accepted: false, delta, temperature: this.temperature }
      );
    }

    return true;
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();

    const answer = dag.addStep(
      'conclusion',
      `Simulated annealing analysis of "${input.query}":\n\n` +
      `Best hypothesis (score: ${this.currentBestScore.toFixed(2)}): ${this.currentBest!.content}\n\n` +
      `Exploration covered ${this.hypotheses.length} initial hypotheses, ` +
      `refined through ${dag.getStepCount()} total steps.\n` +
      `Final temperature: ${this.temperature.toFixed(3)}`,
      this.currentBest!.id,
      this.currentBestScore,
      { finalTemperature: this.temperature, totalHypotheses: this.hypotheses.length }
    );

    dag.setConvergenceScore(1 - this.temperature);

    return answer.content;
  }

  private generateHypotheses(query: string): string[] {
    const keywords = query.toLowerCase().split(/\s+/);

    const hypotheses = [
      `The issue in "${query}" is likely caused by incorrect input handling or validation`,
      `The root cause may be a state management issue or race condition in the system`,
      `This could be a configuration or environment mismatch causing unexpected behavior`,
      `The problem might stem from an incorrect assumption about data types or formats`,
    ];

    if (keywords.some(k => ['error', 'bug', 'fail', 'crash', 'broken'].includes(k))) {
      hypotheses.push(`Check error handling paths and edge cases for null/undefined values`);
    }

    if (keywords.some(k => ['slow', 'performance', 'timeout'].includes(k))) {
      hypotheses.push(`Performance bottleneck in data processing or unnecessary re-computation`);
    }

    return hypotheses;
  }

  private perturb(current: string, iteration: number): string {
    const refinements = [
      `Refining: ${current} — focusing on the specific conditions that trigger the issue`,
      `Alternative angle: ${current} — considering upstream dependencies and data flow`,
      `Narrowing scope: ${current} — isolating the exact component or module involved`,
      `Root cause analysis: ${current} — tracing the causal chain from symptom to source`,
    ];
    return refinements[iteration % refinements.length];
  }

  private scoreHypothesis(hypothesis: string, query: string): number {
    // Score based on specificity, relevance, and actionability
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const hypWords = hypothesis.toLowerCase().split(/\s+/);

    let relevance = 0;
    for (const w of hypWords) {
      if (queryWords.has(w)) relevance++;
    }

    const specificity = Math.min(1, hypothesis.length / 200);
    const normalizedRelevance = Math.min(1, relevance / Math.max(1, queryWords.size));

    return (normalizedRelevance * 0.6 + specificity * 0.4);
  }

  protected getDefaultIterations(): number {
    return 8;
  }
}
