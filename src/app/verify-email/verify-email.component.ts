import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';


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

  resendEmail() {
    // 實作重新發送的邏輯...
    alert('已嘗試重新發送，請檢查您的信箱。');
  }
}
