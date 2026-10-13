import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { Difficulty } from '../../core/models';

/** Home page: pick a difficulty and submit an English text to start the
 * challenge (spec-01, spec-07). */
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
  /** Selected before starting; a new session always starts on Normal. */
  difficulty: Difficulty = 'normal';

  constructor(
    private readonly session: SessionService,
    private readonly router: Router,
  ) {}

  setDifficulty(level: Difficulty): void {
    this.difficulty = level;
  }

  submitText(): void {
    const text = this.inputText.trim();
    if (!text) {
      this.error = 'Enter an English text to practice.';
      return;
    }
    if (this.session.createSession(text, this.difficulty)) {
      this.error = '';
      this.router.navigate(['/practice']);
    } else {
      this.error = 'Could not extract any practice sentence from this text.';
    }
  }
}
