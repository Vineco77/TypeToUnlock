import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextProcessingService {
  private words: string[] = [];
  
  private currentWordIndex: number = 0;
  
  isProcessing: boolean = false;
  isCompleted: boolean = false;
  
  constructor() { }
  
  startProcessing(text: string) {
    this.words = text.split(/\s+/).filter(word => word.trim() !== '');
    this.currentWordIndex = 0;
    this.isProcessing = true;
    this.isCompleted = false;
  }
  
  getCurrentWord(): string {
    if (this.currentWordIndex < this.words.length) {
      return this.words[this.currentWordIndex];
    }
    return '';
  }
  
  checkWord(typedWord: string): boolean {
    const isCorrect = typedWord.trim().toLowerCase() === this.getCurrentWord().toLowerCase();
    
    if (isCorrect) {
      this.moveToNextWord();
    }
    
    return isCorrect;
  }
  
  private moveToNextWord() {
    this.currentWordIndex++;
    
    if (this.currentWordIndex >= this.words.length) {
      this.isCompleted = true;
    }
  }
  
  getProgress(): number {
    if (this.words.length === 0) return 0;
    return (this.currentWordIndex / this.words.length) * 100;
  }
  
  getTotalWords(): number {
    return this.words.length;
  }
  
  getCompletedWords(): number {
    return this.currentWordIndex;
  }
  
  reset() {
    this.isProcessing = false;
    this.isCompleted = false;
    this.words = [];
    this.currentWordIndex = 0;
  }
}