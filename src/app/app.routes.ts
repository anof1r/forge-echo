import { Routes } from '@angular/router';
import { LibraryPage } from './features/library/library-page';
import { StagePage } from './features/stage/stage-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'stage' },
  { path: 'stage', component: StagePage },
  { path: 'library', component: LibraryPage },
];
