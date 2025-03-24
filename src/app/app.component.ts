import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TextInputComponent } from './components/text-input/text-input.component';
import { WordDisplayComponent } from './components/word-display/word-display.component';
import { CompletionMessageComponent } from './components/completion-message/completion-message.component';
import { TextProcessingService } from './services/text-processing.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TextInputComponent,
    WordDisplayComponent,
    CompletionMessageComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'type-to-unlock';
  
  constructor(public textService: TextProcessingService) {}
  
  startTypingChallenge(text: string) {
    this.textService.startProcessing(text);
  }
}