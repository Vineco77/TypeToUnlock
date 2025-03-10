import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextProcessingService } from '../../services/text-processing.service';

@Component({
  selector: 'app-completion-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completion-message.component.html',
  styleUrl: './completion-message.component.css'
})
export class CompletionMessageComponent {
  constructor(public textService: TextProcessingService) { }
}