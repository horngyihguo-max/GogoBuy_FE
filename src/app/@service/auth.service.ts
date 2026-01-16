import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/internal/operators/tap';
import Swal from 'sweetalert2';
import { HttpService } from './http.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 這邊專門放用戶資料相關API和變數
  constructor(
    private https: HttpService,
    private router: Router,
    private route: ActivatedRoute,) { }
  // TODO 用戶資料 (正式連接時用這個!)
  user: any = null;

  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  user$ = this.userSubject.asObservable();

  private getUserFromStorage() {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  }

  // 把最新頭像資料set進user
  setUser(user: any) {
    const formattedUser = {
      ...user,
      user_avatar_url: user.user_avatar_url || user.avatar_url || user.avatarUrl
    };
    console.log(user.user_avatar_url)
    console.log(user.avatar_url)
    console.log(user.avatarUrl)
    this.user = formattedUser;
    localStorage.setItem('user_info', JSON.stringify(formattedUser));
    this.userSubject.next(formattedUser);
  }

  loadUserFromStorage() {
    const raw = localStorage.getItem('user');
    this.user = raw ? JSON.parse(raw) : null;
  }

  // 刷新用戶資料
  refreshUser() {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      console.warn('刷新失敗：找不到用戶 ID');
      return;
    }
    this.https.getApi(`http://localhost:8080/gogobuy/user/get-user?id=${userId}`).subscribe({
      next: (res: any) => {
        console.log('API 回傳原始資料:', res);
        const userData = res;
        localStorage.setItem('user_avatar_url', res.avatarUrl);
        if (userData && (userData.id || userData.userId)) {
          this.setUser(userData);
        }
      },
      error: (err: any) => {
        console.error('API 請求發生錯誤:', err);
      }
    });
  }

  // 登入API
  login(payload: any) {
    this.https.postApi('http://localhost:8080/gogobuy/user/login', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code == 200) {
            console.log('登入成功，填寫資料：', payload);
            console.log('登入成功，回傳資料：', res);
            this.user = res;
            this.setUser(res);
            localStorage.setItem('user_id', res.id);
            localStorage.setItem('user_email', payload.email);
            this.refreshUser();
            Swal.fire({
              toast: true,
              position: 'top',
              icon: 'success',
              title: `歡迎回來!`,
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/gogobuy';
            setTimeout(() => {
              this.router.navigateByUrl(returnUrl);
            }, 500);
          } else {
            Swal.fire({
              title: res.message || '登入失敗',
              icon: 'error',
              showConfirmButton: false,
              timer: 1000
            });
          }
        },
        error: (err: any) => {
          Swal.fire({
            title: err.message || '連線伺服器失敗',
            icon: 'error',
            showConfirmButton: false,
            timer: 1000
          });
        },
      });
  }

  // 登出API
  logout() {
    this.https.postApi('http://localhost:8080/gogobuy/user/logout', { withCredentials: true })
      .subscribe(() => {
        this.user = null;
        this.userSubject.next(null);
        // 清除前端紀錄
        localStorage.clear();
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: `已登出!`,
          showConfirmButton: false,
          timer: 2000,
        });
        // 回到首頁
        this.router.navigate(['/gogobuy']);
      });
  }

  // 註冊API
  register(payload: any) {
    // TEST =========================================
    this.https
      .postApi('http://localhost:8080/gogobuy/user/registration', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code === 200) {
            localStorage.setItem('user_session', payload.email);
            const returnUrl = '/gogobuy';
            Swal.fire({
              title: '註冊成功，請返回登入頁面輸入註冊資訊登入',
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



  // 修改用戶資訊 (暱稱、大頭貼、載具)
  updateProfile(id: string, updateDto: any) {
    const url = `http://localhost:8080/gogobuy/user/change-profile?id=${id}`;

    return this.https.patchApi(url, updateDto).pipe(
      tap((res: any) => {
        if (res.code === 200) {

          // 取得目前暫存在 localStorage 的完整資料
          const currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');

          // 將更新後的欄位合併進去
          const updatedUser = { ...currentUser, ...updateDto };

          // 更新 Service 狀態與 localStorage
          this.setUser(updatedUser);

          // 更新個別欄位
          if (updateDto.nickname) localStorage.setItem('user_nickname', updateDto.nickname);
          if (updateDto.avatar_url) localStorage.setItem('user_avatar_url', updateDto.avatarUrl);
          if (updateDto.carrier) localStorage.setItem('user_carrier', updateDto.carrier);
        }
      })
    );
  }

  // 修改密碼
  changePassword(password: any) {
    const userId = this.user?.id;
    this.https
      .postApi(`http://localhost:8080/gogobuy/user/change-password?id=${userId}`, password)
      .subscribe({
        next: (res: any) => {
          Swal.fire('密碼修改成功，請重新登入');
        },
        error: (err) => {
          Swal.fire(err?.error?.message ?? '修改失敗');
        },
      });
  }

  // 忘記密碼
  resetPassword(email: string, otpCode: string, newPassword: string) {
    const req = {
      email: email,
      otpCode: otpCode,
      newPassword: newPassword
    };

    return this.https.putApi(`http://localhost:8080/gogobuy/user/reset-password`, req);
  }


  // 發送OTP驗證碼
  sendOtp() {
    const userId = this.user?.id;
    const userEmail = this.user?.email;

    if (!userId || !userEmail) {
      console.error('缺少使用者 ID 或 Email');
      return;
    }

    const body = { email: userEmail };

    const url = `http://localhost:8080/gogobuy/user/send-otp?id=${userId}`;

    this.https.postApi(url, body).subscribe({
      next: (res) => {
        console.log('OTP 已發送', res);
      },
      error: (err) => {
        console.error('發送失敗', err);
      }
    });
  }

  //根據email發送OTP驗證碼
  sendOtpEmail(email: string) {
    return this.https.postApi(`http://localhost:8080/gogobuy/user/send-otp-email`, email);
  }

  // 確認OTP驗證碼並更改email
  emailVerify(id: string, newEmail: string, otpCode: string) {
    const url = `http://localhost:8080/gogobuy/user/email-verify?id=${id}`;

    const body = {
      newEmail: newEmail,
      otpCode: otpCode
    };

    return this.https.putApi(url, body);
  }

  // 更新手機號碼
  connectPhone(id: string, phone: string) {
  const req = {
    phone: phone
  };

  const url = `http://localhost:8080/gogobuy/user/connect-phone?id=${id}`;

  return this.https.postApi(url, req.phone);
}

}
