import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // 檢查是否為外部地圖 API 請求
  const isMapApi = req.url.includes('openstreetmap.org') || req.url.includes('maps.co');

  // 根據是否為地圖請求來決定 clone 方式
  const authReq = isMapApi
    ? req.clone({ withCredentials: false }) // 地圖 API 不帶憑證
    : req.clone({ withCredentials: true });  // 你的後端請求維持原樣

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 如果是地圖 API 報錯，不執行跳轉登入的邏輯
      if (isMapApi) return throwError(() => error);

      if (error.status == 401) {
        localStorage.removeItem('user_id');
        router.navigate(['/login']);
      } else if (error.status == 403) {
        // 清除前端紀錄 (比照 AuthService.logout)
        localStorage.clear();

        Swal.fire({
          title: "帳號權限異常或已被停權",
          icon: "error",
          showConfirmButton: false,
          timer: 3000,
        }).then(() => {
          // 強制跳轉至登入頁面 (使用 window.location.href 確保狀態重置)
          window.location.href = '/gogobuy/login?reason=suspended';
        });
      }
      return throwError(() => error);
    })
  );
};
