import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userStatus = localStorage.getItem('userStatus'); // 登入時狀態

  // 從 localStorage 取得我們存入的 session (Base64 過的 email)
  const session = localStorage.getItem('user_id');



  // 判斷是否存在
  if (session) {
    // 已登入，准許通過路由
    return true;
  } else {
    // 未登入，強制導向登入頁面
    // 可以順便把原本想去的網址傳過去，登入後再跳回來
    router.navigate(['/gogobuy/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
