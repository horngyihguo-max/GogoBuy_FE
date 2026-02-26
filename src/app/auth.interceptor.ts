import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import Swal from 'sweetalert2';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
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
