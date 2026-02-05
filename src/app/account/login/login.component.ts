import { AuthService } from './../../@service/auth.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../@service/http.service';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor(
    private http: HttpService,
    public auth: AuthService,
    private route: ActivatedRoute,
    public router: Router,) { }

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

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.user.email = "test2@gmail.com";
    this.user.password = 'test1234';
  }

  // 切換模式
  toggleMode() {
    this.pageMode = this.pageMode == 'login' ? 'register' : 'login';
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

  // google登入API
  loginWithGoogle() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/gogobuy';
    sessionStorage.setItem('google_return_url', returnUrl);
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }

  // 登入API
  login() {
    const payload = {
      email: this.user.email,
      password: this.user.password,
    };
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

    this.auth.register(payload).subscribe({
      next: (res: any) => {
        if (res.code == 200) {
          localStorage.setItem('user_session', payload.email);
          Swal.fire({
            title: "創建帳號成功",
            text: "請返回登入頁面登入",
            icon: "success",
            showConfirmButton: false,
            timer: 1000,
            timerProgressBar: true,
          }).then(() => window.location.reload());
        } else {
          Swal.fire({
            title: "註冊失敗",
            text: res.message ?? "請稍後再試",
            icon: "error",
          });
        }
      },
      error: (err: any) => {
        console.log(err?.message);
        Swal.fire({
          title: err?.message || "註冊失敗",
          icon: "error",
          timer: 2000,
        });
      },
    });
  }



  // 忘記密碼
  async resetPassword() {
    // 彈出視窗，請使用者輸入忘記密碼的信箱
    const { value: email } = await Swal.fire({
      title: '忘記密碼',
      input: 'email',
      inputLabel: '請輸入您的註冊信箱',
      inputPlaceholder: 'example@mail.com',
      confirmButtonText: '發送驗證碼',
      showCancelButton: true,
      cancelButtonText: '取消',
      preConfirm: (value) => {
        if (!value) return Swal.showValidationMessage('請輸入有效的 Email');
        return value;
      }
    });
    if (!email) return;
    // 輸入完成後，發送驗證碼
    Swal.fire({ title: '發送中...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    this.auth.sendOtpEmail(email).subscribe({
      next: async (res: any) => {
        // 彈出視窗讓使用者輸入 OTP 和新密碼
        const { value: formValues } = await Swal.fire({
          title: '重設您的密碼',
          html: `
          <div class="text-center">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
              驗證碼已寄送到 ${email}
          </p>
          <input id="swal-otp" class="swal2-input" placeholder="請輸入驗證碼">
          <div style="position: relative;">
          <input id="swal-password" type="password" class="swal2-input" placeholder="請輸入新密碼">
          <button type="button" id="toggle-pwd"
          style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); border: none; background: transparent; cursor: pointer; color: #94a3b8;">
          <i id="eye-icon" class="pi pi-eye-slash"></i>
          </button>
          </div>
          <input id="swal-con-password" type="password" class="swal2-input" placeholder="請再次輸入新密碼">
          </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: '確認重設',
          cancelButtonText: '取消',
          allowOutsideClick: false,

          // (切換眼睛圖示)
          didRender: () => {
            const toggleBtn = document.getElementById('toggle-pwd');
            const pwdInput = document.getElementById('swal-password') as HTMLInputElement;
            const conPwdInput = document.getElementById('swal-con-password') as HTMLInputElement;
            const eyeIcon = document.getElementById('eye-icon');

            toggleBtn?.addEventListener('click', () => {
              const isPwd = pwdInput.type == 'password';
              const newType = isPwd ? 'text' : 'password';

              pwdInput.type = newType;
              conPwdInput.type = newType;

              // 切換 PrimeIcons class
              if (eyeIcon) {
                eyeIcon.className = isPwd ? 'pi pi-eye' : 'pi pi-eye-slash';
              }
            });
          },
          // 驗證阻擋機制
          preConfirm: () => {
            const otp = (document.getElementById('swal-otp') as HTMLInputElement).value;
            const pwd = (document.getElementById('swal-password') as HTMLInputElement).value;
            const conpwd = (document.getElementById('swal-con-password') as HTMLInputElement).value;
            const pwdRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,16}$/;
            if (!otp) {
              Swal.showValidationMessage('請輸入驗證碼');
              return false;
            }
            if (!pwdRegex.test(pwd)) {
              Swal.showValidationMessage('密碼需為 8-16 位英數混和');
              return false;
            }
            if (pwd != conpwd) {
              Swal.showValidationMessage('兩次輸入的密碼不一致');
              return false;
            }
            return { otp: otp, newPassword: pwd };
          }
        });

        if (formValues) {
          // 呼叫重設密碼 API
          this.auth.resetPassword(email, formValues.otp, formValues.newPassword).subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: '重設成功',
                text: '您的密碼已更新，請使用新密碼登入。',
                confirmButtonText: '太棒了'
              });
            },
            error: (err: any) => {
              Swal.fire('失敗', err.error?.message || '驗證碼錯誤或過期', 'error');
            }
          });
        }
      },
    });
  }
}
