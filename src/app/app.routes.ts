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
import { StoreComponent } from './stores/store/store.component';
import { PersonInfoEditComponent } from './account/person-info-edit/person-info-edit.component';
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { WishesComponent } from './wish/wishes/wishes.component';
import { NotificationsComponent } from './account/notifications/notifications.component';
import { StoreUpsertComponent } from './stores/store-upsert/store-upsert.component';
import { StoreInfoComponent } from './stores/store-info/store-info.component';

// export const routes: Routes = [
//   // 首頁
//   { path: 'gogobuy', component: GogoBuyComponent, title: 'GoGoBuy | 首頁' },
//   { path: '', redirectTo: '/gogobuy', pathMatch: 'full' },
//   { path: 'orders', component: OrdersComponent, title: '我的訂單', canActivate: [authGuard], },

//   // 登入/註冊
//   { path: 'login', component: LoginComponent },
//   { path: 'auth-callback', component: AuthCallbackComponent },

//   // 用戶資料頁面
//   { path: 'personInfo', component: PersonInfoComponent,canActivate: [authGuard], },
//   { path: 'personinfoedit', component: PersonInfoEditComponent },

//   // 願望清單
//   { path: 'wishes', component: WishesComponent },

//   // 通知頁面
//   { path: 'notifications', component: NotificationsComponent },

//   // 條款頁面 ------------------------------------------------------------------
//   { path: 'problems', component: ProblemsComponent },
//   { path: 'privacyPolicy', component: PrivacyPolicyComponent },
//   { path: 'conditions', component: ConditionsComponent },
//   // --------------------------------------------------------------------------

//   //創立店家與品項
//   { path: 'store', component: StoreComponent },
//   { path: 'store_upsert', component: StoreUpsertComponent },

//   // 錯誤/失效網址
//   { path: '404', component: PageNotFoundComponent },
//   { path: '**', component: PageNotFoundComponent }
// ];


// 待確認
export const routes: Routes = [
  // 1. 公開頁面與首頁
  {
    path: 'gogobuy',
    title: 'GoGoBuy | 首頁',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: GogoBuyComponent, data: { breadcrumb: '首頁' } },
      { path: 'login', component: LoginComponent, title: '登入', data: { breadcrumb: '登入' } },
    ]
  },

  // 2. 會員中心
  {
    path: 'user',
    data: { breadcrumb: '會員中心' },
    children: [
      { path: 'profile', component: PersonInfoComponent, title: '個人資料', data: { breadcrumb: '個人資料' }, canActivate: [authGuard], },
      { path: 'profile/edit', component: PersonInfoEditComponent, title: '修改個人資料', data: { breadcrumb: '修改個人資料' } },
      { path: 'orders', component: OrdersComponent, title: '我的訂單', data: { breadcrumb: '訂單紀錄' }, canActivate: [authGuard] },
      { path: 'wishes', component: WishesComponent, title: '願望清單', data: { breadcrumb: '許願池' } },
      { path: 'notifications', component: NotificationsComponent, title: '通知中心', data: { breadcrumb: '通知' } },
    ]
  },

  // 3. 店家/管理頁面
  {
    path: 'management',
    data: { breadcrumb: '後台管理' },
    children: [
      { path: 'store', component: StoreComponent, title: '店家管理', data: { breadcrumb: '我的店家' } },
      { path: 'store_upsert', component: StoreUpsertComponent, title: '創建店家', data: { breadcrumb: '創建店家' } },
      { path: 'store_info/:id', component: StoreInfoComponent, title: '店家資訊', data: { breadcrumb: '店家資訊' } },
      // 未來可以擴充例如：{ path: 'menu-edit', component: MenuEditComponent }
    ]
  },

  // 4. 條款與幫助頁面
  {
    path: 'support',
    data: { breadcrumb: '幫助中心' },
    children: [
      { path: 'faq', component: ProblemsComponent, title: '常見問題', data: { breadcrumb: 'FAQ' } },
      { path: 'privacy', component: PrivacyPolicyComponent, title: '隱私權政策', data: { breadcrumb: '隱私權' } },
      { path: 'conditions', component: ConditionsComponent, title: '服務條款', data: { breadcrumb: '服務條款' } },
    ]
  },

  // 5.GOOGLE登入跳轉頁面
  { path: 'auth-callback', component: AuthCallbackComponent },

  // 6. 錯誤處理
  { path: '', redirectTo: 'gogobuy', pathMatch: 'full' },
  { path: '404', component: PageNotFoundComponent, title: '頁面不存在' },
  { path: '**', redirectTo: '/404' }
];
