import { LoginComponent } from './account/login/login.component';
import { ProblemsComponent } from './terms/problems/problems.component';
import { PrivacyPolicyComponent } from './terms/privacy-policy/privacy-policy.component';
import { ConditionsComponent } from './terms/conditions/conditions.component';
import { Routes } from '@angular/router';
import { GogoBuyComponent } from './gogo-buy/gogo-buy.component';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './terms/page-not-found/page-not-found.component';
import { OrdersComponent } from './orders/orders.component';
import { StoreComponent } from './stores/store/store.component';
import { StoreUpsertComponent } from './stores/store-upsert/store-upsert.component';

export const routes: Routes = [
  // 首頁
  { path: 'gogobuy', component: GogoBuyComponent },
  { path: '', redirectTo: '/gogobuy', pathMatch: 'full' },
  { path: '404', component: PageNotFoundComponent },
  { path: 'orders', component: OrdersComponent },
  // 登入/註冊
  { path: 'login', component: LoginComponent },

  // 條款頁面 ------------------------------------------------------------------
  { path: 'problems', component: ProblemsComponent },
  { path: 'privacyPolicy', component: PrivacyPolicyComponent },
  { path: 'conditions', component: ConditionsComponent },
  // --------------------------------------------------------------------------

  //創立店家與品項
  { path: 'store', component: StoreComponent },
  { path: 'store_upsert', component: StoreUpsertComponent },
  // 錯誤/失效網址
  { path: '**', component: PageNotFoundComponent }
];
