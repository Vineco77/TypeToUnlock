import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { PracticePageComponent } from './pages/practice/practice-page.component';
import { ResultPageComponent } from './pages/result/result-page.component';
import { SummaryPageComponent } from './pages/summary/summary-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'TypeToUnlock' },
  { path: 'practice', component: PracticePageComponent, title: 'Practice — TypeToUnlock' },
  { path: 'result', component: ResultPageComponent, title: 'Analysis — TypeToUnlock' },
  { path: 'summary', component: SummaryPageComponent, title: 'Summary — TypeToUnlock' },
  { path: '**', redirectTo: '' },
];
