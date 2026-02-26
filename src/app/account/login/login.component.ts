import { AuthService } from './../../@service/auth.service';
import { Component, ElementRef, ViewChild } from '@angular/core';
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

  errorMessage: string = '';

  // 表單資料模型
  user = {
    nickname: '',
    email: '',
    phone: '',
    password: '',
  };

  agreedToPrivacyPolicy = false;

  ngOnInit(): void {
    this.user.email = "test2@gmail.com";
    this.user.password = 'test1234';

    this.route.queryParams.subscribe(params => {
      // 1. 處理停權 (舊有邏輯，來自攔截器)
      if (params['reason'] === 'suspended') {
        this.errorMessage = '您的帳號已被停權，請聯繫管理員。';
      }

      // 2. 處理 OAuth 登入錯誤 (來自 SecurityConfig 的 failureHandler)
      if (params['errorMsg']) {
        const errorMsg = params['errorMsg'];
        // 為了避免 refresh 一直看到錯誤，可以考慮清除為空，但這裡先顯示
        Swal.fire({
          icon: 'error',
          title: '登入失敗',
          text: errorMsg,
          confirmButtonText: '確定'
        });

        // 替換 URL，移除參數避免重整後還在 (Optional)
        this.router.navigate([], {
          queryParams: { errorMsg: null },
          queryParamsHandling: 'merge'
        });
      }

      // 3. 處理 OAuth 註冊成功 (需驗證信箱)
      if (params['verificationSent']) {
        const msg = params['message'] || '請前往信箱收取驗證信';
        Swal.fire({
          icon: 'success',
          title: '註冊成功',
          text: msg,
          confirmButtonText: '好的'
        });

        this.router.navigate([], {
          queryParams: { verificationSent: null, message: null },
          queryParamsHandling: 'merge'
        });
      }
    });

  }

  // 取得右側容器的引用
  @ViewChild('rightPanel') rightPanel!: ElementRef;
  // 切換模式
  setPageMode(mode: 'login' | 'register') {
    if (this.pageMode !== mode) {
      this.pageMode = mode;
      this.resetForm();
    }
  }

  // 切換模式
  toggleMode() {
    this.setPageMode(this.pageMode == 'login' ? 'register' : 'login');
    // 當切換回登入時，強制將右側容器捲動回最上方
    if (this.pageMode === 'login') {
      // 延遲一小段時間確保 DOM 已更新 class (如 overflow-hidden)
      setTimeout(() => {
        if (this.rightPanel) {
          this.rightPanel.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 0);
    }
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
            title: "註冊成功",
            text: "已發送驗證信至您的信箱，請開通後再登入",
            icon: "success",
            showConfirmButton: false,
            timer: 3000,
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
          icon: 'warning',
          title: '信箱已被使用',
          text: '請改用其他信箱，或使用「忘記密碼」找回帳號。',
          confirmButtonText: '我知道了',
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
              Swal.showValidationMessage('密碼需包含英文與數字，長度 8–16 碼，不包含特殊符號');
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

  showPrivacyPolicy() {
    Swal.fire({
      title: '隱私政策聲明',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #475569;">
          <p>歡迎您註冊本團購電商平台。為提供團購下單、付款交易、物流配送、售後服務、客服支援及行銷通知等相關服務，我們將蒐集您的姓名、電子郵件地址、聯絡電話、收件地址及付款資訊等必要資料。</p>
          <p style="margin-top: 10px;">您的個人資料僅於提供服務、履行契約義務、會員管理、統計分析及行銷推廣之目的範圍內使用。我們將採取合理之資訊安全措施，防止資料遭未經授權之存取、洩漏、竄改或毀損。於配送商品、金流處理或依法令要求之情況下，您的資料可能提供予物流業者、金流服務商或相關主管機關。</p>
          <p style="margin-top: 10px;">您得依法請求查詢、閱覽、更正、刪除您的個人資料，或請求停止蒐集、處理及利用。若您不同意提供必要資料，可能影響註冊或訂單服務之完成。</p>
          <p style="margin-top: 10px; font-weight: bold; color: #1e293b;">點擊「註冊」即表示您已閱讀、瞭解並同意本平台之隱私政策與服務條款。</p>
        </div>
      `,
      confirmButtonText: '我知道了',
      confirmButtonColor: '#7f1d1d',
      width: '500px'
    });
  }
}
