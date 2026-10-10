import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';

/** Home page: submit an English text to start the challenge (spec-01). */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  inputText = '';
  error = '';

  constructor(
    private readonly session: SessionService,
    private readonly router: Router,
  ) {}

  submitText(): void {
    const text = this.inputText.trim();
    if (!text) {
      this.error = 'Enter an English text to practice.';
      return;
    }
    if (this.session.createSession(text)) {
      this.error = '';
      this.router.navigate(['/practice']);
    } else {
      this.error = 'Could not extract any practice sentence from this text.';
    }
  }
}
