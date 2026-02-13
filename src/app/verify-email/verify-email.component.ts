import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-verify-email',
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent {

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) { }

  // 定義狀態：'loading' | 'success' | 'error'
  status: 'loading' | 'success' | 'error' = 'loading';
  errorMessage: string = '驗證連結無效';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status = 'error';
      this.errorMessage = '找不到驗證碼';
      return;
    }

    // 發送至 Spring Boot API
    this.http.get(`http://localhost:8080/gogobuy/user/active-account?token=${token}`)
      .subscribe({
        next: (res: any) => {
          if (res.code === 200) {
            this.status = 'success';
            // 3 秒後跳轉
            setTimeout(() => this.router.navigate(['/gogobuy/login']), 3000);
          } else {
            this.status = 'error';
            this.errorMessage = res.message || '驗證失敗';
          }
        },
        error: (err) => {
          this.status = 'error';
          this.errorMessage = err.error?.message || '驗證程序發生錯誤';
        }
      });
  }

  toLogin() {
    this.router.navigate(['/gogobuy/login']);
  }

  async resendEmail() {
    const { value: email } = await Swal.fire({
      title: '重新發送驗證信',
      input: 'email',
      inputLabel: '請輸入您的註冊信箱',
      inputPlaceholder: 'example@mail.com',
      showCancelButton: true,
      confirmButtonText: '發送',
      cancelButtonText: '取消',
      preConfirm: (value) => {
        if (!value) return Swal.showValidationMessage('請輸入有效的 Email');
        return value;
      }
    });

    if (email) {
      Swal.fire({
        title: '發送中...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
      });

      this.http.get(`http://localhost:8080/gogobuy/user/resend-active-account?email=${email}`)
        .subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              Swal.fire({
                icon: 'success',
                title: '發送成功',
                text: '驗證信已重新發送，請檢查您的信箱。',
                confirmButtonText: '確定'
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: '發送失敗',
                text: res.message || '請稍後再試。',
                confirmButtonText: '確定'
              });
            }
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: '發生錯誤',
              text: err.error?.message || '連線伺服器失敗，請稍後再試。',
              confirmButtonText: '確定'
            });
          }
        });
    }
  }
}
