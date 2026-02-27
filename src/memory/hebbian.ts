export class HebbianNetwork {
  // associations[a][b] = strength of link from a to b
  private associations: Map<string, Map<string, number>> = new Map();
  private decayRate: number;
  private maxStrength: number;

  constructor(decayRate: number = 0.05, maxStrength: number = 1.0) {
    this.decayRate = decayRate;
    this.maxStrength = maxStrength;
  }

  strengthen(idA: string, idB: string, amount: number = 0.1): void {
    this.ensureNode(idA);
    this.ensureNode(idB);

    const currentAB = this.associations.get(idA)!.get(idB) || 0;
    const currentBA = this.associations.get(idB)!.get(idA) || 0;

    this.associations.get(idA)!.set(idB, Math.min(this.maxStrength, currentAB + amount));
    this.associations.get(idB)!.set(idA, Math.min(this.maxStrength, currentBA + amount));
  }

  getStrength(idA: string, idB: string): number {
    return this.associations.get(idA)?.get(idB) || 0;
  }

  getAssociations(id: string): Map<string, number> {
    return new Map(this.associations.get(id) || []);
  }

  getStrongestAssociations(id: string, limit: number = 5): Array<{ id: string; strength: number }> {
    const assocs = this.associations.get(id);
    if (!assocs) return [];

    return Array.from(assocs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([assocId, strength]) => ({ id: assocId, strength }));
  }

  decay(): void {
    for (const [, links] of this.associations) {
      for (const [targetId, strength] of links) {
        const newStrength = strength * (1 - this.decayRate);
        if (newStrength < 0.01) {
          links.delete(targetId);
        } else {
          links.set(targetId, newStrength);
        }
      }
    }
  }

  coActivate(ids: string[]): void {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        this.strengthen(ids[i], ids[j]);
      }
    }
  }

  removeNode(id: string): void {
    this.associations.delete(id);
    for (const [, links] of this.associations) {
      links.delete(id);
    }
  }

  private ensureNode(id: string): void {
    if (!this.associations.has(id)) {
      this.associations.set(id, new Map());
    }
  }

  size(): number {
    return this.associations.size;
  }

  toJSON(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [id, links] of this.associations) {
      result[id] = Object.fromEntries(links);
    }
    return result;
  }

  static fromJSON(data: Record<string, Record<string, number>>, decayRate?: number, maxStrength?: number): HebbianNetwork {
    const network = new HebbianNetwork(decayRate, maxStrength);
    for (const [id, links] of Object.entries(data)) {
      network.associations.set(id, new Map(Object.entries(links)));
    }
    return network;
  }
}
