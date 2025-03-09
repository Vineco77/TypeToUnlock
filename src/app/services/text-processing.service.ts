import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextProcessingService {
  // Array com todas as palavras do texto
  private words: string[] = [];
  
  // Índice da palavra atual
  private currentWordIndex: number = 0;
  
  // Flags para controlar o estado
  isProcessing: boolean = false;
  isCompleted: boolean = false;
  
  constructor() { }
  
  // Inicia o processamento do texto
  startProcessing(text: string) {
    // Divide o texto em palavras e remove espaços em branco
    this.words = text.split(/\s+/).filter(word => word.trim() !== '');
    this.currentWordIndex = 0;
    this.isProcessing = true;
    this.isCompleted = false;
  }
  
  // Retorna a palavra atual que o usuário deve digitar
  getCurrentWord(): string {
    if (this.currentWordIndex < this.words.length) {
      return this.words[this.currentWordIndex];
    }
    return '';
  }
  
  // Verifica se a palavra digitada está correta
  checkWord(typedWord: string): boolean {
    // Compara a palavra digitada com a palavra atual (ignorando maiúsculas/minúsculas)
    const isCorrect = typedWord.trim().toLowerCase() === this.getCurrentWord().toLowerCase();
    
    // Se estiver correta, avança para a próxima palavra
    if (isCorrect) {
      this.moveToNextWord();
    }
    
    return isCorrect;
  }
  
  // Avança para a próxima palavra
  private moveToNextWord() {
    this.currentWordIndex++;
    
    // Verifica se todas as palavras foram digitadas
    if (this.currentWordIndex >= this.words.length) {
      this.isCompleted = true;
    }
  }
  
  // Retorna o progresso atual
  getProgress(): number {
    if (this.words.length === 0) return 0;
    return (this.currentWordIndex / this.words.length) * 100;
  }
  
  // Retorna o número total de palavras
  getTotalWords(): number {
    return this.words.length;
  }
  
  // Retorna o número de palavras completadas
  getCompletedWords(): number {
    return this.currentWordIndex;
  }
  
  // Reinicia o desafio
  reset() {
    this.isProcessing = false;
    this.isCompleted = false;
    this.words = [];
    this.currentWordIndex = 0;
  }
}