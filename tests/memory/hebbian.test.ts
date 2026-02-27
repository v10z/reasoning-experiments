import { HebbianNetwork } from '../../src/memory/hebbian';

describe('HebbianNetwork', () => {
  let network: HebbianNetwork;

  beforeEach(() => {
    network = new HebbianNetwork(0.1, 1.0);
  });

  test('strengthen creates bidirectional association', () => {
    network.strengthen('a', 'b', 0.3);
    expect(network.getStrength('a', 'b')).toBeCloseTo(0.3);
    expect(network.getStrength('b', 'a')).toBeCloseTo(0.3);
  });

  test('strengthen accumulates', () => {
    network.strengthen('a', 'b', 0.3);
    network.strengthen('a', 'b', 0.3);
    expect(network.getStrength('a', 'b')).toBeCloseTo(0.6);
  });

  test('strengthen respects maxStrength', () => {
    network.strengthen('a', 'b', 0.8);
    network.strengthen('a', 'b', 0.8);
    expect(network.getStrength('a', 'b')).toBe(1.0);
  });

  test('getStrength returns 0 for unknown nodes', () => {
    expect(network.getStrength('x', 'y')).toBe(0);
  });

  test('getAssociations returns all associations for a node', () => {
    network.strengthen('a', 'b', 0.3);
    network.strengthen('a', 'c', 0.5);

    const assocs = network.getAssociations('a');
    expect(assocs.size).toBe(2);
    expect(assocs.get('b')).toBeCloseTo(0.3);
    expect(assocs.get('c')).toBeCloseTo(0.5);
  });

  test('getStrongestAssociations returns sorted associations', () => {
    network.strengthen('a', 'b', 0.3);
    network.strengthen('a', 'c', 0.5);
    network.strengthen('a', 'd', 0.1);

    const strongest = network.getStrongestAssociations('a', 2);
    expect(strongest).toHaveLength(2);
    expect(strongest[0].id).toBe('c');
    expect(strongest[1].id).toBe('b');
  });

  test('decay reduces all strengths', () => {
    network.strengthen('a', 'b', 0.5);
    network.decay();
    expect(network.getStrength('a', 'b')).toBeCloseTo(0.45);
  });

  test('decay removes very weak associations', () => {
    network.strengthen('a', 'b', 0.005);
    network.decay();
    expect(network.getStrength('a', 'b')).toBe(0);
  });

  test('coActivate strengthens all pairs', () => {
    network.coActivate(['a', 'b', 'c']);
    expect(network.getStrength('a', 'b')).toBeGreaterThan(0);
    expect(network.getStrength('a', 'c')).toBeGreaterThan(0);
    expect(network.getStrength('b', 'c')).toBeGreaterThan(0);
  });

  test('removeNode removes node and its associations', () => {
    network.strengthen('a', 'b', 0.5);
    network.strengthen('a', 'c', 0.3);
    network.removeNode('a');
    expect(network.getStrength('a', 'b')).toBe(0);
    expect(network.getStrength('b', 'a')).toBe(0);
    expect(network.size()).toBe(2); // b and c still exist
  });

  test('toJSON and fromJSON round-trip', () => {
    network.strengthen('a', 'b', 0.5);
    network.strengthen('a', 'c', 0.3);

    const json = network.toJSON();
    const restored = HebbianNetwork.fromJSON(json);

    expect(restored.getStrength('a', 'b')).toBeCloseTo(0.5);
    expect(restored.getStrength('a', 'c')).toBeCloseTo(0.3);
  });

  test('size returns node count', () => {
    expect(network.size()).toBe(0);
    network.strengthen('a', 'b');
    expect(network.size()).toBe(2);
    network.strengthen('a', 'c');
    expect(network.size()).toBe(3);
  });
});
