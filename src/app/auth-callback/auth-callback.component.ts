import { Component, OnInit } from '@angular/core';
import { AuthService } from '../@service/auth.service';
import { HttpService } from '../@service/http.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

/**
 * Google OAuth Callback 頁面
 * 用途：
 * 使用者完成 Google 登入後會跳轉到這裡
 * 前端在此呼叫後端 API 取得使用者資料
 * 存入 AuthService / localStorage 後導回原頁面
 */
@Component({ selector: 'app-auth-callback', template: '<p>正在同步 Google 資料...</p>' })
export class AuthCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private http: HttpService,
    private router: Router
  ) { }

  ngOnInit() {

    // 呼叫後端拿 Google 資料的 API
    this.http.getApi('http://localhost:8080/gogobuy/user/oauth').subscribe({
      next: (res: any) => {
        const formattedUser = {
          id: res.id || res.userId || res.sub,
          nickname: res.nickname,
          email: res.email,
          avatar_url: res.avatar_url || res.avatarUrl,
          times_remaining: res.timesRemaining || 0,
          phone: res.phone || '',
          carrier: res.carrier || null,
          exp: res.exp || 0,
          role: res.role || 'user'
        };
        if (res) {

          // 存入 localStorage（供其他頁面快速取用）
          this.authService.setUser(formattedUser);
          localStorage.setItem('user_info', JSON.stringify(formattedUser));
          localStorage.setItem('user_id', formattedUser.id);
          localStorage.setItem('user_avatar_url', formattedUser.avatar_url);
          localStorage.setItem('user_email', formattedUser.email);
          if (formattedUser.id) {
            Swal.fire({
              toast: true,
              position: 'top',
              icon: 'success',
              title: `歡迎回來!`,
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });

            // 刷新使用者狀態
            this.authService.refreshUser();
            const savedUrl = sessionStorage.getItem('google_return_url') || '/gogobuy';
            setTimeout(() => {
              this.router.navigateByUrl(savedUrl);
              // 跳轉完後立刻刪除，
              sessionStorage.removeItem('google_return_url');
            }, 500);
          } else {
            console.error('抓不到 ID，請檢查後端回傳格式');
            Swal.fire('登入異常', '無法取得用戶識別碼', 'error');
          }
        }
      },
      error: (err: { message: string | undefined; }) => {
        Swal.fire('Google 登入失敗', err.message, 'error');
        this.router.navigate(['/login']);
      }
    });
  }
}
