import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.css'
})
export class TextInputComponent {
  inputText: string = '';
  
  // EventEmitter para enviar o texto para o componente pai
  @Output() textSubmitted = new EventEmitter<string>();
  
  // Método chamado quando o usuário submete o formulário
  submitText() {
    if (this.inputText.trim()) {
      this.textSubmitted.emit(this.inputText.trim());
    }
  }
}