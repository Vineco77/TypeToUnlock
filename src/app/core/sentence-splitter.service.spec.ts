import { SentenceSplitterService } from './sentence-splitter.service';

describe('SentenceSplitterService', () => {
  let service: SentenceSplitterService;

  beforeEach(() => {
    service = new SentenceSplitterService();
  });

  it('splits on sentence terminators keeping them attached (CA1.1)', () => {
    expect(service.splitIntoSentences('Hello there. How are you? Fine!')).toEqual([
      'Hello there.',
      'How are you?',
      'Fine!',
    ]);
  });

  it('splits on line breaks', () => {
    expect(service.splitIntoSentences('First line\nSecond line')).toEqual([
      'First line',
      'Second line',
    ]);
  });

  it('handles text without punctuation as a single sentence', () => {
    expect(service.splitIntoSentences('just one phrase')).toEqual(['just one phrase']);
  });

  it('discards empty fragments and extra whitespace', () => {
    expect(service.splitIntoSentences('  One.   \n\n  Two.  ')).toEqual(['One.', 'Two.']);
  });

  it('returns an empty list for empty text', () => {
    expect(service.splitIntoSentences('   ')).toEqual([]);
    expect(service.splitIntoSentences('')).toEqual([]);
  });

  it('normalizes windows line endings', () => {
    expect(service.splitIntoSentences('One.\r\nTwo.')).toEqual(['One.', 'Two.']);
  });
});
