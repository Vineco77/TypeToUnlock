import { TypingEngine } from './typing.engine';

describe('TypingEngine', () => {
  it('should expose one slot per target character (R3.1)', () => {
    const engine = new TypingEngine('with');
    expect(engine.state().length).toBe(4);
    expect(engine.state().chars.length).toBe(0);
  });

  it('accepts a correct word and marks it correct (CA3.2)', () => {
    const engine = new TypingEngine('with');
    'with'.split('').forEach((c) => engine.type(c));
    const state = engine.state();
    expect(state.status).toBe('correct');
    expect(state.chars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('is case-insensitive (CA3.2)', () => {
    const engine = new TypingEngine('with');
    'WITH'.split('').forEach((c) => engine.type(c));
    expect(engine.state().status).toBe('correct');
  });

  it('marks only divergent characters as wrong and locks (CA3.1)', () => {
    const engine = new TypingEngine('with');
    'wifi'.split('').forEach((c) => engine.type(c));
    const state = engine.state();
    expect(state.status).toBe('wrong');
    expect(state.locked).toBe(true);
    expect(state.chars.map((c) => c.status)).toEqual([
      'correct',
      'correct',
      'wrong',
      'wrong',
    ]);
  });

  it('ignores extra keys once locked (CA3.6)', () => {
    const engine = new TypingEngine('with');
    'wifi'.split('').forEach((c) => engine.type(c));
    engine.type('x');
    expect(engine.state().chars.length).toBe(4);
  });

  it('unlocks after backspace and allows correction (CA3.1)', () => {
    const engine = new TypingEngine('with');
    'wifi'.split('').forEach((c) => engine.type(c));
    engine.backspace();
    engine.backspace();
    engine.type('t');
    engine.type('h');
    const state = engine.state();
    expect(state.status).toBe('correct');
    expect(state.locked).toBe(false);
  });

  it('never marks a word correct before full length', () => {
    const engine = new TypingEngine('with');
    engine.type('w');
    engine.type('i');
    expect(engine.state().status).toBe('typing');
  });

  it('ignores punctuation typed by the user (R3.3)', () => {
    const engine = new TypingEngine('customers');
    engine.type(',');
    expect(engine.state().chars.length).toBe(0);
  });

  it('normalizes accented characters (R3.3)', () => {
    const engine = new TypingEngine('cafe');
    'café'.split('').forEach((c) => engine.type(c));
    expect(engine.state().status).toBe('correct');
  });

  it('reveal shows the remaining characters without finishing the word (R3.8)', () => {
    const engine = new TypingEngine('with');
    engine.type('w');
    const state = engine.reveal();
    // Not finished: the user must still type the word.
    expect(state.status).toBe('typing');
    expect(engine.isFinished).toBeFalse();
    // Ghost preview of the remaining target characters.
    expect(state.preview).toEqual(['i', 't', 'h']);
    expect(state.chars.map((c) => c.char).join('')).toBe('w');
  });

  it('a revealed word still must be typed correctly to advance (R3.8)', () => {
    const engine = new TypingEngine('with');
    engine.reveal();
    'wit'.split('').forEach((c) => engine.type(c));
    // Typing a divergent final char is still evaluated positionally.
    expect(engine.type('x').status).toBe('wrong');
    engine.backspace();
    engine.type('h');
    const state = engine.state();
    expect(state.status).toBe('correct');
    expect(engine.isFinished).toBeTrue();
  });

  it('reveal with no typed characters previews the whole word', () => {
    const engine = new TypingEngine('home');
    const state = engine.reveal();
    expect(state.preview).toEqual(['h', 'o', 'm', 'e']);
    expect(state.chars.length).toBe(0);
  });

  it('hides the reveal preview without changing typed character statuses', () => {
    const engine = new TypingEngine('with');
    engine.type('w');
    engine.reveal();
    engine.type('x');
    expect(engine.state().chars[0].status).toBe('correct');
    expect(engine.state().chars[1].status).toBe('wrong');
    expect(engine.hideReveal().preview).toBeNull();
    expect(engine.state().chars.map((c) => c.status)).toEqual([
      'correct',
      'wrong',
    ]);
  });

  it('preview disappears once the word is complete', () => {
    const engine = new TypingEngine('with');
    engine.reveal();
    'with'.split('').forEach((c) => engine.type(c));
    expect(engine.state().preview).toBeNull();
  });

  it('ignores typing after the word is finished', () => {
    const engine = new TypingEngine('with');
    'with'.split('').forEach((c) => engine.type(c));
    engine.type('s');
    expect(engine.state().chars.length).toBe(4);
  });
});
