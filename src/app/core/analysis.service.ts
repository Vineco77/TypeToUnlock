import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { AnalyzeResponse } from './models';

const STORAGE_KEY = 'type-to-unlock.analysis';

/**
 * Frontend client for `POST /api/analyze` (spec-04). Responses are cached
 * per text (in-memory + sessionStorage) so revisiting a result is instant.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly cache = new Map<string, AnalyzeResponse>();

  constructor(
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    if (isPlatformBrowser(platformId)) {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          for (const [key, value] of Object.entries(
            JSON.parse(raw) as Record<string, AnalyzeResponse>,
          )) {
            this.cache.set(key, value);
          }
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  analyze(text: string): Observable<AnalyzeResponse> {
    const cached = this.cache.get(text);
    if (cached) {
      return of(cached);
    }
    return this.http.post<AnalyzeResponse>('/api/analyze', { text }).pipe(
      tap((response) => this.persist(text, response)),
    );
  }

  private persist(text: string, response: AnalyzeResponse): void {
    this.cache.set(text, response);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(Object.fromEntries(this.cache)),
        );
      } catch {
        // storage full — cache stays in memory only.
      }
    }
  }
}
