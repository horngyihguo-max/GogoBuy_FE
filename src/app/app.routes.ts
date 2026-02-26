import { Component } from '@angular/core';
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
import { CartPageComponent } from './account/cart-page/cart-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StoreListComponent } from './stores/store-list/store-list.component';
import { OrderInfoComponent } from './order-info/order-info.component';
import { GroupEventComponent } from './groupbuy-event/group-event/group-event.component';
import { FollowGroupComponent } from './groupbuy-event/follow-group/follow-group.component';
import { MyStoresComponent } from './account/my-stores/my-stores.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { PopularComponent } from './popular/popular.component';

export const routes: Routes = [
  // 1. 公開頁面與首頁
  {
    path: 'gogobuy',
    title: 'GoGoBuy | 首頁',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: GogoBuyComponent, data: { breadcrumb: '首頁' } },
      { path: 'login', component: LoginComponent, title: '登入', data: { breadcrumb: '登入' } },
      { path: 'list', component: StoreListComponent, title: '找附近', data: { breadcrumb: '找附近' } },
      { path: 'popular', component: PopularComponent, title: '熱門團購', data: { breadcrumb: '熱門團購' } },
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
      { path: 'orders/info', component: OrderInfoComponent, title: '訂單詳情', data: { breadcrumb: '訂單詳情' } },
      { path: 'wishes', component: WishesComponent, title: '願望清單', data: { breadcrumb: '許願池' } },
      { path: 'notifications', component: NotificationsComponent, title: '通知中心', data: { breadcrumb: '通知' } },
      { path: 'cart', component: CartPageComponent, title: '購物車', data: { breadcrumb: '購物車' }, canActivate: [authGuard] },
      { path: 'my_store', component: MyStoresComponent, title: '我的店家', data: { breadcrumb: '我的店家' } },
    ]
  },

  // 3. 店家/管理頁面
  {
    path: 'management',
    data: { breadcrumb: '後台管理' },
    children: [
      { path: 'store', component: StoreComponent, title: '店家管理', data: { breadcrumb: '我的店家', expectedRole: 'admin' }, canActivate: [authGuard] },
      { path: 'store/:id', component: StoreComponent, title: '店家管理', data: { breadcrumb: '我的店家', expectedRole: 'admin' }, canActivate: [authGuard] },
      { path: 'store_upsert', component: StoreUpsertComponent, title: '創建店家', data: { breadcrumb: '創建店家', expectedRole: 'admin' }, canActivate: [authGuard] },
      { path: 'store_upsert/:id', component: StoreUpsertComponent, title: '創建店家', data: { breadcrumb: '創建店家', expectedRole: 'admin' }, canActivate: [authGuard] },
      { path: 'store_info/:id', component: StoreInfoComponent, title: '店家資訊', data: { breadcrumb: '店家資訊' } },
    ]
  },

  // 4. 開團/跟團
  {
    path: 'groupbuy-event',
    data: { breadcrumb: '團購活動' },
    children: [
      { path: 'group-event', component: GroupEventComponent, title: '開團資料設定', data: { breadcrumb: '開團' } },
      { path: 'group-follow/:id', component: FollowGroupComponent, title: '跟團店家頁面', data: { breadcrumb: '跟團' } },
    ]
  },

  // 5. 條款與幫助頁面
  {
    path: 'support',
    data: { breadcrumb: '幫助中心' },
    children: [
      { path: 'faq', component: ProblemsComponent, title: '常見問題', data: { breadcrumb: 'FAQ' } },
      { path: 'privacy', component: PrivacyPolicyComponent, title: '隱私權政策', data: { breadcrumb: '隱私權' } },
      { path: 'conditions', component: ConditionsComponent, title: '服務條款', data: { breadcrumb: '服務條款' } },
    ]
  },

  // 6.GOOGLE登入跳轉頁面
  { path: 'auth-callback', component: AuthCallbackComponent },

  // 7. 管理員頁面
  {
    path: 'admin',
    component: DashboardComponent, // 關鍵：這是一個有側邊欄的後台專用版型
    // canActivate: [AdminGuard],       // 關鍵：安全性守衛，防止非管理者直接輸入 URL 進入
    title: '管理後台',
    data: { breadcrumb: '管理後台' },
    //   children: [
    //     {
    //       path: '',
    //       redirectTo: 'dashboard',
    //       pathMatch: 'full'
    //     },
    //     {
    //       path: 'dashboard',
    //       component: DashboardComponent,
    //       data: { breadcrumb: '數據概覽' }
    //     },
    //     {
    //       path: 'users',
    //       // component: UserManagementComponent,
    //       data: { breadcrumb: '會員管理' }
    //     }
    //   ]
  },

  { path: 'active-account', component: VerifyEmailComponent },

  // 8. 錯誤處理
  { path: '', redirectTo: 'gogobuy', pathMatch: 'full' },
  { path: '404', component: PageNotFoundComponent, title: '頁面不存在' },
  { path: '**', redirectTo: '/404' }
];
