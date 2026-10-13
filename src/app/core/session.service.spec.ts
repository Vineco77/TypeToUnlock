import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SessionService, toBaseWord } from './session.service';
import { SentenceSplitterService } from './sentence-splitter.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    window.sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        SentenceSplitterService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('creates a session split into sentences (CA1.1)', () => {
    expect(service.createSession('One sentence. Two sentence!')).toBeTrue();
    expect(service.totalSentences()).toBe(2);
    expect(service.session()?.currentSentence).toBe(0);
  });

  it('defaults the difficulty to normal (spec-07)', () => {
    service.createSession('One sentence.');
    expect(service.difficulty()).toBe('normal');
    expect(service.isEasy()).toBeFalse();
  });

  it('creates an easy session and persists the difficulty (spec-07)', () => {
    expect(service.createSession('One sentence.', 'easy')).toBeTrue();
    expect(service.isEasy()).toBeTrue();

    const restored = new SessionService(
      new SentenceSplitterService(),
      'browser' as unknown as object,
    );
    expect(restored.difficulty()).toBe('easy');
  });

  it('restores legacy sessions without a difficulty as normal (spec-07)', () => {
    const legacy = {
      sentences: [
        {
          text: 'Legacy sentence.',
          words: [{ text: 'Legacy', base: 'legacy', status: 'pending' }],
          errorCount: 0,
          revealCount: 0,
        },
      ],
      currentSentence: 0,
      totalErrors: 0,
      totalReveals: 0,
      startedAt: 0,
    };
    window.sessionStorage.setItem(
      'type-to-unlock.session',
      JSON.stringify(legacy),
    );
    const restored = new SessionService(
      new SentenceSplitterService(),
      'browser' as unknown as object,
    );
    expect(restored.difficulty()).toBe('normal');
    expect(restored.isEasy()).toBeFalse();
  });

  it('tokenizes words and strips punctuation from the base form (CA3.3)', () => {
    service.createSession('Hello, world!');
    const sentence = service.currentSentence()!;
    expect(sentence.words.map((w) => w.base)).toEqual(['hello', 'world']);
  });

  it('rejects texts without practice words', () => {
    expect(service.createSession('   ...  ')).toBeFalse();
    expect(service.hasSession()).toBeFalse();
  });

  it('persists and restores the session from sessionStorage (CA1.2)', () => {
    service.createSession('Only one sentence here.');
    service.markCorrect();

    const restored = new SessionService(
      new SentenceSplitterService(),
      'browser' as unknown as object,
    );
    expect(restored.hasSession()).toBeTrue();
    expect(restored.currentSentence()?.words[0].status).toBe('correct');
    expect(restored.currentWordIndex()).toBe(1);
  });

  it('tracks correct, shown answers and error stats', () => {
    service.createSession('Two words here.');
    service.markCorrect(); // "Two"
    service.recordError();
    service.markRevealed(); // answer shown for "words" (stays pending)
    expect(service.currentWordIndex()).toBe(1); // no advance
    service.markCorrect(); // "words" typed
    service.markCorrect(); // "here" typed

    const session = service.session()!;
    expect(session.totalErrors).toBe(1);
    expect(session.totalReveals).toBe(1);
    expect(session.sentences[0].words.map((w) => w.status)).toEqual([
      'correct',
      'correct',
      'correct',
    ]);
    expect(session.sentences[0].words[1].answerShown).toBeTrue();
    expect(service.isCurrentSentenceComplete()).toBeTrue();
  });

  it('advances sentences and reports the last one (CA1.4)', () => {
    service.createSession('First. Second.');
    expect(service.isLastSentence()).toBeFalse();
    expect(service.advanceSentence()).toBeTrue();
    expect(service.isLastSentence()).toBeTrue();
    expect(service.advanceSentence()).toBeFalse();
  });

  it('goToSentence jumps to a valid index and rejects invalid ones', () => {
    service.createSession('One. Two. Three.');
    expect(service.goToSentence(2)).toBeTrue();
    expect(service.session()?.currentSentence).toBe(2);
    expect(service.goToSentence(7)).toBeFalse();
  });

  it('clear removes the session and the storage (CA1.2)', () => {
    service.createSession('Some sentence.');
    service.clear();
    expect(service.hasSession()).toBeFalse();
    expect(window.sessionStorage.length).toBe(0);
  });

  describe('toBaseWord', () => {
    it('lowercases, strips punctuation and accents', () => {
      expect(toBaseWord('Customers,')).toBe('customers');
      expect(toBaseWord('CAFÉ!')).toBe('cafe');
      expect(toBaseWord("don't")).toBe('dont');
    });
  });
});
