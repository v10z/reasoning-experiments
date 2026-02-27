import { MemoryEntry, createMemoryEntry } from './types';
import { generateId } from '../utils/id';

export class FleetingMemory {
  private store: Map<string, MemoryEntry> = new Map();

  add(content: string, importance: number = 0.5, tags: string[] = []): MemoryEntry {
    const id = generateId();
    const entry = createMemoryEntry(id, content, importance, tags, 'fleeting');
    this.store.set(id, entry);
    return entry;
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.store.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  search(query: string): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    const results: MemoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.content.toLowerCase().includes(queryLower) ||
          entry.tags.some(t => t.toLowerCase().includes(queryLower))) {
        results.push(entry);
      }
    }
    return results;
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.store.values());
  }

  remove(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
