import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextProcessingService } from '../../services/text-processing.service';

@Component({
  selector: 'app-word-display',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './word-display.component.html',
  styleUrl: './word-display.component.css'
})
export class WordDisplayComponent {
  typedWord: string = '';
  showError: boolean = false;
  
  constructor(public textService: TextProcessingService) { }
  
  // Verifica a palavra quando o usuário pressiona Enter
  checkWord() {
    if (this.typedWord.trim()) {
      const isCorrect = this.textService.checkWord(this.typedWord);
      
      if (isCorrect) {
        // Limpa o campo se estiver correto
        this.typedWord = '';
        this.showError = false;
      } else {
        // Mostra o erro visual
        this.showError = true;
        
        // Remove o erro visual após 1 segundo
        setTimeout(() => {
          this.showError = false;
        }, 1000);
      }
    }
  }
  
  // Método para capturar o evento de teclado (Enter)
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.checkWord();
    }
  }
}