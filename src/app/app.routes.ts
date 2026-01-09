import { LoginComponent } from './account/login/login.component';
import { ProblemsComponent } from './terms/problems/problems.component';
import { PrivacyPolicyComponent } from './terms/privacy-policy/privacy-policy.component';
import { ConditionsComponent } from './terms/conditions/conditions.component';
import { Routes } from '@angular/router';
import { GogoBuyComponent } from './gogo-buy/gogo-buy.component';
import { PageNotFoundComponent } from './terms/page-not-found/page-not-found.component';
import { OrdersComponent } from './orders/orders.component';
import { PersonInfoComponent } from './account/person-info/person-info.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  // 首頁
  { path: 'gogobuy', component: GogoBuyComponent },
  { path: '', redirectTo: '/gogobuy', pathMatch: 'full' },

  // 登入/註冊
  { path: 'login', component: LoginComponent },

  // 用戶資料頁面
  { path: 'personInfo', component: PersonInfoComponent, canActivate: [authGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard]  },

  // 條款頁面 ------------------------------------------------------------------
  { path: 'problems', component: ProblemsComponent },
  { path: 'privacyPolicy', component: PrivacyPolicyComponent },
  { path: 'conditions', component: ConditionsComponent },
  // --------------------------------------------------------------------------

  // 錯誤/失效網址
  { path: '404', component: PageNotFoundComponent },
  { path: '**', component: PageNotFoundComponent }
];
