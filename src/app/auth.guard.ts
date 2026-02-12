import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userStatus = localStorage.getItem('userStatus'); // 登入時狀態
  const role = localStorage.getItem('user_role');

  // 從 localStorage 取得我們存入的 session (Base64 過的 email)
  const session = localStorage.getItem('user_id');

  // 1. 檢查是否登入
  if (!session) {
    // 未登入，強制導向登入頁面
    // 可以順便把原本想去的網址傳過去，登入後再跳回來
    router.navigate(['/gogobuy/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // 2. 獲取當前路由要求的角色 app.routes 的 data
  const expectedRole = route.data['expectedRole'];

  // 如果路由有設定權限需求
  if (expectedRole) {
    if (role !== expectedRole) {
      const redirectPath = role === 'admin' ? '/admin-dashboard' : '/gogobuy';
      router.navigate([redirectPath]);
      return false;
    }
  }

  return true; // 通過檢查

};
