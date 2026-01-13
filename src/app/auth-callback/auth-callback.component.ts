// auth-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../@service/auth.service'; // 引用你的 Service
import { HttpService } from '../@service/http.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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
          // 存入 AuthService (內部會執行 localStorage.setItem('user', ...))
          this.authService.setUser(formattedUser);
          localStorage.setItem('user_info', JSON.stringify(formattedUser));
          localStorage.setItem('user_id', formattedUser.id);
          localStorage.setItem('user_nickname', formattedUser.nickname);
          localStorage.setItem('user_avatar_url', formattedUser.avatar_url);
          localStorage.setItem('user_email', formattedUser.email);
          if (formattedUser.id) {
            this.authService.setUser(formattedUser);
            Swal.fire({
              title: `Google 登入成功，歡迎 ${res.nickname}!`,
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.router.navigate(['/gogobuy']);
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
