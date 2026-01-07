import { Routes } from '@angular/router';
import { GogoBuyComponent } from './gogo-buy/gogo-buy.component';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

export const routes: Routes = [
  { path: 'gogobuy', component: GogoBuyComponent },
  { path: '', redirectTo: '/gogobuy', pathMatch: 'full' },
  { path: '404', component: PageNotFoundComponent },
  { path: '**', component: PageNotFoundComponent }
];
