import { MemoryEntry, createMemoryEntry, calculateRelevance } from './types';
import { generateId } from '../utils/id';
import { jaccardSimilarity } from '../utils/similarity';

export interface ShortTermConfig {
  maxSize: number;
  compressionThreshold: number;
}

const DEFAULT_CONFIG: ShortTermConfig = {
  maxSize: 50,
  compressionThreshold: 0.8,
};

export class ShortTermMemory {
  private entries: MemoryEntry[] = [];
  private config: ShortTermConfig;

  constructor(config: Partial<ShortTermConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  add(content: string, importance: number = 0.5, tags: string[] = []): MemoryEntry {
    const id = generateId();
    const entry = createMemoryEntry(id, content, importance, tags, 'short_term');
    this.entries.push(entry);

    if (this.entries.length > this.config.maxSize) {
      this.evict();
    }

    return entry;
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.find(e => e.id === id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  search(query: string, limit: number = 10): MemoryEntry[] {
    const scored = this.entries.map(entry => ({
      entry,
      similarity: jaccardSimilarity(query, entry.content),
    }));

    return scored
      .filter(s => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.entry);
  }

  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  private evict(): void {
    const now = Date.now();
    this.entries.sort((a, b) => calculateRelevance(b, now) - calculateRelevance(a, now));
    this.entries = this.entries.slice(0, this.config.maxSize);
  }

  compress(): MemoryEntry[] {
    if (this.entries.length / this.config.maxSize < this.config.compressionThreshold) {
      return [];
    }

    const now = Date.now();
    const sorted = [...this.entries].sort(
      (a, b) => calculateRelevance(b, now) - calculateRelevance(a, now)
    );

    const promotionCandidates = sorted.filter(
      e => e.accessCount >= 3 || e.importance >= 0.7
    );

    // Remove promoted entries from short-term
    const promotedIds = new Set(promotionCandidates.map(e => e.id));
    this.entries = this.entries.filter(e => !promotedIds.has(e.id));

    return promotionCandidates;
  }

  remove(id: string): boolean {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.entries.splice(idx, 1);
    return true;
  }

  clear(): void {
    this.entries = [];
  }

  size(): number {
    return this.entries.length;
  }
}
