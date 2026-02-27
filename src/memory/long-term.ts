import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { MemoryEntry, createMemoryEntry, calculateRelevance } from './types';
import { generateId } from '../utils/id';
import { jaccardSimilarity } from '../utils/similarity';
import { HebbianNetwork } from './hebbian';

export interface LongTermConfig {
  storagePath: string;
  pruneThreshold: number;
  maxEntries: number;
}

const DEFAULT_CONFIG: LongTermConfig = {
  storagePath: '',
  pruneThreshold: 0.01,
  maxEntries: 1000,
};

interface StorageFormat {
  entries: MemoryEntry[];
  associations: Record<string, Record<string, number>>;
  version: number;
}

export class LongTermMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: LongTermConfig;
  private network: HebbianNetwork;
  private dirty: boolean = false;

  constructor(config: Partial<LongTermConfig> = {}, network?: HebbianNetwork) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.network = network || new HebbianNetwork();
  }

  async load(): Promise<void> {
    if (!this.config.storagePath) return;
    try {
      const data = await readFile(this.config.storagePath, 'utf-8');
      const stored: StorageFormat = JSON.parse(data);
      this.entries.clear();
      for (const entry of stored.entries) {
        this.entries.set(entry.id, entry);
      }
      if (stored.associations) {
        this.network = HebbianNetwork.fromJSON(stored.associations);
      }
    } catch {
      // File doesn't exist yet, start fresh
    }
  }

  async save(): Promise<void> {
    if (!this.config.storagePath || !this.dirty) return;
    const stored: StorageFormat = {
      entries: Array.from(this.entries.values()),
      associations: this.network.toJSON(),
      version: 1,
    };
    await mkdir(dirname(this.config.storagePath), { recursive: true });
    await writeFile(this.config.storagePath, JSON.stringify(stored, null, 2), 'utf-8');
    this.dirty = false;
  }

  add(content: string, importance: number = 0.5, tags: string[] = []): MemoryEntry {
    const id = generateId();
    const entry = createMemoryEntry(id, content, importance, tags, 'long_term');
    this.entries.set(id, entry);
    this.dirty = true;
    return entry;
  }

  promote(entry: MemoryEntry): MemoryEntry {
    const promoted: MemoryEntry = {
      ...entry,
      source: 'long_term',
    };
    this.entries.set(promoted.id, promoted);
    this.dirty = true;
    return promoted;
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.dirty = true;
    }
    return entry;
  }

  search(query: string, limit: number = 10): MemoryEntry[] {
    const scored = Array.from(this.entries.values()).map(entry => ({
      entry,
      similarity: jaccardSimilarity(query, entry.content),
    }));

    return scored
      .filter(s => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => {
        s.entry.accessCount++;
        s.entry.lastAccessed = Date.now();
        this.dirty = true;
        return s.entry;
      });
  }

  searchWithAssociations(query: string, limit: number = 10): MemoryEntry[] {
    const directResults = this.search(query, limit);
    const resultIds = new Set(directResults.map(e => e.id));
    const associated: MemoryEntry[] = [];

    for (const entry of directResults) {
      const assocs = this.network.getStrongestAssociations(entry.id, 3);
      for (const { id } of assocs) {
        if (!resultIds.has(id)) {
          const assocEntry = this.entries.get(id);
          if (assocEntry) {
            associated.push(assocEntry);
            resultIds.add(id);
          }
        }
      }
    }

    return [...directResults, ...associated].slice(0, limit);
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, entry] of this.entries) {
      const relevance = calculateRelevance(entry, now);
      if (relevance < this.config.pruneThreshold && entry.accessCount > 0) {
        this.entries.delete(id);
        this.network.removeNode(id);
        pruned++;
      }
    }
    if (pruned > 0) this.dirty = true;
    return pruned;
  }

  getNetwork(): HebbianNetwork {
    return this.network;
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  remove(id: string): boolean {
    const result = this.entries.delete(id);
    if (result) {
      this.network.removeNode(id);
      this.dirty = true;
    }
    return result;
  }

  size(): number {
    return this.entries.size;
  }
}
