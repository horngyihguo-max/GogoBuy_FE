import { AuthService } from './../../@service/auth.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../@service/http.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor(private http: HttpService, public auth: AuthService) {}

  // 模式: 登入 | 註冊
  pageMode: 'login' | 'register' = 'login';

  // 密碼顯示用boolean
  showPassword = false;

  // 表單資料模型
  user = {
    nickname: '',
    email: '',
    phone: '',
    password: '',
  };

  // 切換模式
  toggleMode() {
    this.pageMode = this.pageMode === 'login' ? 'register' : 'login';
    this.resetForm();
  }

  // 清空所有欄位
  resetForm() {
    this.user = { nickname: '', email: '', phone: '', password: '' };
  }

  // 送出分流
  onSubmit() {
    if (this.pageMode == 'login') {
      this.login();
    } else {
      this.register();
    }
  }

  // 登入API
  login() {
    const payload = {
      email: this.user.email,
      password: this.user.password,
    };
    console.log('登入提交資料:' + JSON.stringify(payload, null, 2));
    this.auth.login(payload); // 呼叫AuthService
  }

  // 註冊API
  register() {
    const payload = {
      nickname: this.user.nickname,
      email: this.user.email,
      phone: this.user.phone,
      password: this.user.password,
    };
    console.log('註冊提交資料:' + JSON.stringify(payload, null, 2));
    this.auth.register(payload); // 呼叫AuthService
  }

  // TODO Google 登入
  loginWithGoogle() {
    console.log('模擬google登入');
  }
}
