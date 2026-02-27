export type MemoryTier = 'fleeting' | 'short_term' | 'long_term';

export interface MemoryEntry {
  id: string;
  content: string;
  importance: number;
  accessCount: number;
  createdAt: number;
  lastAccessed: number;
  tags: string[];
  associations: Record<string, number>; // memoryId -> link strength
  source: MemoryTier;
}

export function createMemoryEntry(
  id: string,
  content: string,
  importance: number = 0.5,
  tags: string[] = [],
  source: MemoryTier = 'fleeting'
): MemoryEntry {
  const now = Date.now();
  return {
    id,
    content,
    importance: Math.max(0, Math.min(1, importance)),
    accessCount: 0,
    createdAt: now,
    lastAccessed: now,
    tags,
    associations: {},
    source,
  };
}

export function calculateRelevance(entry: MemoryEntry, now: number = Date.now()): number {
  const daysSinceAccess = (now - entry.lastAccessed) / (1000 * 60 * 60 * 24);
  return entry.importance * Math.pow(entry.accessCount / (1 + daysSinceAccess), 0.5);
}
