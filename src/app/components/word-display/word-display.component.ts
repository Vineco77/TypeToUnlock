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
  
  checkWord() {
    if (this.typedWord.trim()) {
      const isCorrect = this.textService.checkWord(this.typedWord);
      
      if (isCorrect) {
        this.typedWord = '';
        this.showError = false;
      } else {
        this.showError = true;
        
        setTimeout(() => {
          this.showError = false;
        }, 1000);
      }
    }
  }
  
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Spacebar' || event.key === ' ') {
      event.preventDefault();
      this.checkWord();
    }
  }
}