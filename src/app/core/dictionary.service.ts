import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { DictionaryEntry } from './models';

/**
 * Frontend client for `GET /api/dictionary` (spec-04) with an in-memory
 * cache. `null` means "no entry found" and is cached too so the UI can
 * show the fallback message without hammering the backend.
 */
@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly cache = new Map<string, DictionaryEntry | null>();
  private readonly inflight = new Map<string, Observable<DictionaryEntry | null>>();

  constructor(private readonly http: HttpClient) {}

  /** Meaning + IPA for a word or multi-word selection. */
  lookup(term: string): Observable<DictionaryEntry | null> {
    const key = term.trim().toLowerCase();
    if (!key) {
      return of(null);
    }
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return of(cached);
    }
    const pending = this.inflight.get(key);
    if (pending) {
      return pending;
    }

    const request$ = this.http
      .get<DictionaryEntry>('/api/dictionary', { params: { term } })
      .pipe(
        map((entry) => ({ ...entry, term: entry.term || term })),
        tap((entry) => this.cache.set(key, entry)),
        catchError(() => {
          this.cache.set(key, null);
          return of(null);
        }),
      );

    this.inflight.set(key, request$);
    return request$.pipe(
      tap({
        complete: () => this.inflight.delete(key),
        unsubscribe: () => this.inflight.delete(key),
      }),
    );
  }
}
