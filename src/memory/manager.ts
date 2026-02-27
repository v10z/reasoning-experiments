import { MemoryEntry } from './types';
import { FleetingMemory } from './fleeting';
import { ShortTermMemory } from './short-term';
import { LongTermMemory } from './long-term';
import { HebbianNetwork } from './hebbian';
import { jaccardSimilarity } from '../utils/similarity';

export interface MemoryManagerConfig {
  storagePath: string;
  shortTermMaxSize: number;
}

const DEFAULT_CONFIG: MemoryManagerConfig = {
  storagePath: '',
  shortTermMaxSize: 50,
};

export class MemoryManager {
  private fleeting: FleetingMemory;
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  private recentlyRecalled: string[] = [];

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.fleeting = new FleetingMemory();
    this.shortTerm = new ShortTermMemory({ maxSize: cfg.shortTermMaxSize });
    this.longTerm = new LongTermMemory({ storagePath: cfg.storagePath });
  }

  async initialize(): Promise<void> {
    await this.longTerm.load();
  }

  remember(content: string, importance: number = 0.5, tags: string[] = []): MemoryEntry {
    if (importance >= 0.7) {
      return this.longTerm.add(content, importance, tags);
    }
    if (importance >= 0.4) {
      return this.shortTerm.add(content, importance, tags);
    }
    return this.fleeting.add(content, importance, tags);
  }

  recall(query: string, limit: number = 10): MemoryEntry[] {
    const longTermResults = this.longTerm.searchWithAssociations(query, limit);
    const shortTermResults = this.shortTerm.search(query, limit);
    const fleetingResults = this.fleeting.search(query);

    // Merge and deduplicate by id
    const seen = new Set<string>();
    const merged: Array<{ entry: MemoryEntry; score: number }> = [];

    const addResults = (entries: MemoryEntry[], tierBoost: number) => {
      for (const entry of entries) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          const similarity = jaccardSimilarity(query, entry.content);
          merged.push({ entry, score: similarity + tierBoost });
        }
      }
    };

    addResults(longTermResults, 0.2);
    addResults(shortTermResults, 0.1);
    addResults(fleetingResults, 0);

    merged.sort((a, b) => b.score - a.score);
    const results = merged.slice(0, limit).map(m => m.entry);

    // Track co-recalls for Hebbian strengthening
    const recalledIds = results.map(e => e.id);
    if (recalledIds.length > 1) {
      this.longTerm.getNetwork().coActivate(recalledIds);
    }
    this.recentlyRecalled = recalledIds;

    return results;
  }

  async consolidate(): Promise<number> {
    const promoted = this.shortTerm.compress();
    for (const entry of promoted) {
      this.longTerm.promote(entry);
    }

    this.longTerm.getNetwork().decay();
    const pruned = this.longTerm.prune();

    this.fleeting.clear();

    await this.longTerm.save();

    return promoted.length;
  }

  getFleeting(): FleetingMemory {
    return this.fleeting;
  }

  getShortTerm(): ShortTermMemory {
    return this.shortTerm;
  }

  getLongTerm(): LongTermMemory {
    return this.longTerm;
  }

  async save(): Promise<void> {
    await this.longTerm.save();
  }

  getStats(): { fleeting: number; shortTerm: number; longTerm: number } {
    return {
      fleeting: this.fleeting.size(),
      shortTerm: this.shortTerm.size(),
      longTerm: this.longTerm.size(),
    };
  }
}
