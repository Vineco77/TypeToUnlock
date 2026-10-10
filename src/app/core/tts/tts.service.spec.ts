import { SpeechSynthesisTts, NullTts, ttsServiceFactory } from './tts.service';

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: unknown;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

describe('TtsService', () => {
  let calls: { speak: FakeUtterance[]; cancel: number };

  beforeEach(() => {
    calls = { speak: [], cancel: 0 };
    const fakeSynthesis = {
      speak(utterance: FakeUtterance) {
        calls.speak.push(utterance);
      },
      cancel() {
        calls.cancel += 1;
      },
      getVoices() {
        return [];
      },
    };
    // window.speechSynthesis is a getter-only accessor in Chrome: define it.
    Object.defineProperty(window, 'speechSynthesis', {
      value: fakeSynthesis,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: class {
        text = '';
        lang = '';
        rate = 1;
        voice: unknown = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      configurable: true,
    });
  });

  it('speaks with en-US language (CA2.4 — free local TTS)', () => {
    const tts = new SpeechSynthesisTts('browser' as unknown as object);
    tts.speak('Hello there');
    expect(calls.speak.length).toBe(1);
    expect(calls.speak[0].text).toBe('Hello there');
    expect(calls.speak[0].lang).toBe('en-US');
  });

  it('restart cancels current playback before speaking (CA2.2)', () => {
    const tts = new SpeechSynthesisTts('browser' as unknown as object);
    tts.restart('The whole sentence');
    expect(calls.cancel).toBe(1);
    expect(calls.speak.length).toBe(1);
    expect(calls.speak[0].text).toBe('The whole sentence');
  });

  it('restart always cancels, even when not playing (CA2.1)', () => {
    const tts = new SpeechSynthesisTts('browser' as unknown as object);
    tts.restart('Again');
    tts.restart('And again');
    expect(calls.cancel).toBe(2);
    expect(calls.speak.length).toBe(2);
  });

  it('ignores empty text', () => {
    const tts = new SpeechSynthesisTts('browser' as unknown as object);
    tts.speak('   ');
    expect(calls.speak.length).toBe(0);
  });

  it('factory returns a no-op implementation when unsupported (CA2.3)', () => {
    const service = ttsServiceFactory('server' as unknown as object);
    expect(service instanceof NullTts).toBeTrue();
    expect(service.supported).toBeFalse();
    expect(() => service.restart('anything')).not.toThrow();
  });
});
