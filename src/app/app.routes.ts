import { ProblemsComponent } from './terms/problems/problems.component';
import { PrivacyPolicyComponent } from './terms/privacy-policy/privacy-policy.component';
import { ConditionsComponent } from './terms/conditions/conditions.component';
import { Routes } from '@angular/router';
import { GogoBuyComponent } from './gogo-buy/gogo-buy.component';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './terms/page-not-found/page-not-found.component';

export const routes: Routes = [
  { path: 'gogobuy', component: GogoBuyComponent },
  { path: '', redirectTo: '/gogobuy', pathMatch: 'full' },

  // 條款頁面 ------------------------------------------------------------------
  { path: 'problems', component: ProblemsComponent },
  { path: 'privacyPolicy', component: PrivacyPolicyComponent },
  { path: 'conditions', component: ConditionsComponent },
  // --------------------------------------------------------------------------


  { path: '**', component: PageNotFoundComponent }
];
