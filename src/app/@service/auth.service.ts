import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';
import Swal from 'sweetalert2';
import { HttpService } from './http.service';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 這邊專門放用戶資料相關API和變數
  constructor(
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,) { }
  // TODO 用戶資料 (正式連接時用這個!)
  // user: any = null;

  // 假資料
  user: any = {
    id: '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
    nickname: 'test',
    email: 'test3@gmail.com',
    phone: '0912345678',
    avatar_url: null,
    password: '$2a$10$84XlUdt7tG7sYTMx9XsTl.p9qQEHqyOzE.o1dgPAKBpLxGNPugxCW',
    role: 'user',
    created_at: '2026-01-08 12:02:57',
    exp: 120,
    carrier: null,
    times_remaining: 3,
  };

  // 把最新資料set進user
  setUser(user: any) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user)); // 刷新頁面也不會消失
  }

  loadUserFromStorage() {
    const raw = localStorage.getItem('user');
    this.user = raw ? JSON.parse(raw) : null;
  }

  // 刷新用戶資料
  refreshUser() {
    const id = this.user?.id;
    if (!id) return of(null);

    console.log('模擬刷新用戶資料');
    return;
    // TODO 用id去get用戶資料
    //   return this.http
    //     .get<any>(`/api/user/${id}`)
    //     .pipe(tap((res) => this.setUser(res)));
  }

  // 登入API
  login(payload: any) {
    this.http.postApi('http://localhost:8080/gogobuy/user/login', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code === 200) {
            // 存入偽裝金鑰 (Base64 Email)
            // 如果 res.data 有 User 物件就用 res.data.email，沒有就用表單的 email
            localStorage.setItem('user_session', btoa(payload.email));
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/gogobuy';
            Swal.fire({
              title: '登入成功',
              icon: 'success',
              showConfirmButton: false,
              timer: 1000
            });
            setTimeout(() => {
              this.router.navigateByUrl(returnUrl);
            }, 500);
          } else {
            // 處理後端回傳的錯誤 (如：密碼錯誤)
            Swal.fire({
              title: res.message || '登入失敗',
              icon: 'error',
              showConfirmButton: false,
              timer: 1000
            });
          }
        },
        error: (err: any) => {
          // 處理網路或伺服器崩潰 (HTTP 4xx, 5xx)
          Swal.fire({
            title: '連線伺服器失敗',
            icon: 'error',
            showConfirmButton: false,
            timer: 1000
          });
        },
      });
  }

  // 註冊API
  register(payload: any) {
    // TEST =========================================
    this.http
      .postApi('http://localhost:8080/gogobuy/user/registration', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code === 200) {
            // 存入偽裝金鑰 (Base64 Email)
            // 如果 res.data 有 User 物件就用 res.data.email，沒有就用表單的 email
            localStorage.setItem('user_session', btoa(this.user.email));
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/gogobuy';
            Swal.fire({
              title: '註冊成功',
              icon: 'success',
              timer: 2000,
            });
            setTimeout(() => {
              this.router.navigateByUrl(returnUrl);
            }, 500);
          }
        },
        error: (err: any) => {
          Swal.fire({
            title: err.message || '註冊失敗',
            icon: 'error',
            timer: 2000,
          });
        },
      });
  }

  // 修改用戶資訊
  updateProfile(editInfo: any) {
    // TEST =========================================================
    console.log('auth修改:', JSON.stringify(editInfo, null, 2));
    Swal.fire({
      title: '資料修改成功',
      icon: 'success',
      timer: 2000,
    });
    this.router.navigate(['/personInfo']);
    // TEST =========================================================

    // TODO API POST
    // this.http
    //   .postApi('http://localhost:8080/請改這邊', this.editInfo)
    //   .subscribe({
    //     next: (res: any) => {
    //       Swal.fire({
    //         title: '修改成功',
    //         icon: 'success',
    //         timer: 2000,
    //       });
    //       this.router.navigate(['/personInfo']);
    //     },
    //     error: (err: any) => {
    //       Swal.fire({
    //         title: err.message ?? '修改失敗',
    //         icon: 'error',
    //         timer: 2000,
    //       });
    //     },
    //   });
  }

  // 修改密碼
  changePassword(password: any) {
    console.log('auth收到:' + JSON.stringify(password, null, 2));
    // TEST =========================================
    Swal.fire({
      title: '密碼修改成功',
      icon: 'success',
      timer: 2000,
    });
    this.router.navigate(['/personInfo']);
    // TEST =========================================
    // this.http
    //   .postApi('/api/change-password', password)
    //   .subscribe({
    //     next: (res: any) => {
    //       Swal.fire('密碼修改成功');
    //     },
    //     error: (err) => {
    //       Swal.fire(err?.error?.message ?? '修改失敗');
    //     },
    //   });
  }
}
