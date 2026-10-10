import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { SentenceSession } from '../../core/models';

/** Final summary (spec-01 R4.5): all sentences with stats and review links. */
@Component({
  selector: 'app-summary-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-page.component.html',
  styleUrl: './summary-page.component.css',
})
export class SummaryPageComponent {
  constructor(
    public readonly session: SessionService,
    private readonly router: Router,
  ) {}

  get sentences(): SentenceSession[] {
    return this.session.session()?.sentences ?? [];
  }

  get totalWords(): number {
    return this.sentences.reduce((sum, s) => sum + s.words.length, 0);
  }

  review(index: number): void {
    if (this.session.goToSentence(index)) {
      this.router.navigate(['/result']);
    }
  }

  startOver(): void {
    this.session.clear();
    this.router.navigate(['/']);
  }
}
