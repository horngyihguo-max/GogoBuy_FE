import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpService } from '../../@service/http.service';
import { Router } from '@angular/router';
import { ImageService, ImageType } from '../../@service/image.service';
import { FileUploadModule } from 'primeng/fileupload';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-person-info-edit',
  imports: [
    CommonModule,
    FormsModule,
    FileUploadModule
  ],
  templateUrl: './person-info-edit.component.html',
  styleUrl: './person-info-edit.component.scss'
})
export class PersonInfoEditComponent {
  constructor(
    private http: HttpService,
    private router: Router,
    public auth: AuthService,
    private imageService: ImageService
  ) { }
  // 是否是最新資料 (為測試暫時調成true，預設為false)
  ready = true;
  user: any = {
    id: '',
    email: ''
  };

  // 頭像用 avatars
  type: ImageType = 'avatars';

  // 後端回傳的字串
  uploadedUrl: string = '';

  // 限制頭像上傳大小
  readonly MAX_AVATAR_SIZE = 2000000;

  // 修改用暫存資料 -----------------------------------------------------------------
  editInfo: any | null = null;

  ngOnInit() {
    // 1. 訂閱 User 狀態流
    this.auth.user$.subscribe(user => {
      if (user) {
        this.editInfo = { ...user };

        // 確保從最新的 user 物件中取得資料，而不是一直讀取 localStorage 的舊 Key
        this.editInfo.email = user.email || localStorage.getItem('user_email');
        this.editInfo.avatar_url = user.avatarUrl || user.user_avatar_url;
        this.editInfo.provider = user.provider;
        this.calculateLevel(user.exp);
        this.ready = true;
      }
    });

    // 2. 觸發刷新 (這會讓 AuthService 去跑 API 並推播給上面的訂閱者)
    this.auth.refreshUser();
  }

  // 等級相關屬性 -------------------------------------------------------------------
  level: number = 1; // 初始等級
  currentExp: number = 0; // 餘數
  expToNextLevel: number = 100; // 多少經驗升等
  expPercentage: string = '0%'; // 經驗條顯示%數

  // 等級計算器
  calculateLevel(exp: number = 0) {
    const totalExp = exp || 0; // 取得總經驗值
    this.level = Math.floor(totalExp / this.expToNextLevel) + 1; // 升等(無條件捨去)
    this.currentExp = totalExp % this.expToNextLevel; // 餘數
    this.expPercentage = `${(this.currentExp / this.expToNextLevel) * 100}%`; // ((餘數/多少經驗升等)*100)%
  }

  onPrimeUpload(event: any) {
    const file: File = event.files?.[0];
    if (!file) return;

    this.imageService.upload(this.type, file).subscribe({
      next: (res) => (this.uploadedUrl = res),
      error: (err) => console.error(err),
    });
  }


  // 頭像上傳
  onAvatarUpload(event: any) {

    // TypeScript 型別轉換，用來使用input.'...'屬性
    const input = event.target as HTMLInputElement;

    // 抓取第一張圖片
    const file = event.target.files[0];

    // 沒有圖片就返回
    if (!file) return;

    // 非圖片檔案，傳送提示給使用者
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: `只能上傳圖片檔喔!`,
        showConfirmButton: false,
        timer: 2000,
      });
      input.value = '';
      return;
    }

    // 檔案大小超過 2MB 提示使用者更換圖片上傳
    if (file.size > this.MAX_AVATAR_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: `圖片太大了(${sizeMB}MB)，請上傳 2MB 以下的圖片!`,
        showConfirmButton: false,
        timer: 2000,
      });
      input.value = '';
      return;
    }

    // 本地預覽（上傳前就換圖）
    const localPreview = URL.createObjectURL(file);
    const oldAvatar = this.editInfo.avatar_url;
    this.editInfo.avatar_url = localPreview;

    Swal.fire({
      title: '上傳中...',
      text: '請稍候',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.imageService.upload('avatars', file).subscribe({
      next: (res) => {
        Swal.close();

        this.editInfo.avatar_url = res;

        Swal.fire({ icon: 'success', title: '頭像上傳成功' });
        input.value = '';
      },
      error: (err) => {
        console.error(err);
        // 上傳失敗就還原
        this.editInfo.avatar_url = oldAvatar;

        Swal.fire({
          icon: 'error',
          title: '上傳失敗',
          text: err?.error ?? '請稍後再試',
        });
        input.value = '';
      },
      complete: () => {
        // 釋放本地 preview URL
        if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview);
      },
    });
  }


  // 修改用戶資料
  updateProfile() {
    console.log('當前頭像資料內容:', this.editInfo.avatar_url);
    console.log('資料長度:', this.editInfo.avatar_url?.length);

    // 檢查是否有變動
    if (JSON.stringify(this.editInfo) == JSON.stringify(this.auth.user)) {
      Swal.fire({
        title: '資料未變更',
        text: '您尚未修改任何內容喔！',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
      });
      return; // 結束執行，不發送請求
    }

    // 如果有變動，才執行後續邏輯
    const userId = this.auth.user?.id;

    // 發送給後端 UserInfoDto 的資料
    const payload = {
      nickname: this.editInfo.nickname,
      phone: this.editInfo.phone,
      carrier: this.editInfo.carrier,
      avatarUrl: this.editInfo.avatar_url
    };

    this.auth.updateProfile(userId, payload).subscribe({
      next: (res: any) => {
        if (res.code == 200) {
          this.auth.connectPhone(userId, this.editInfo.phone).subscribe();
          this.auth.setUser({ ...this.auth.user, ...payload });
          this.auth.refreshUser();
          Swal.fire({
            title: '儲存成功...返回個人頁面中',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
          }).then(() => {
            this.router.navigate(['/user/profile']);
          });
        }
      },
      error: (err) => {
        console.error('Debug Error:', err); // 在控制台印出真正的錯誤原因

        // 判斷錯誤訊息
        const errorMsg = err.error?.message || err.message || '發生未知錯誤';
        Swal.fire('更新失敗', errorMsg, 'error');
      }
    });
  }

  private normalizeEmail(email: string) {
    return (email ?? '').trim().toLowerCase();
  }


  // 修改信箱
  async changeEmail(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();

    if (!this.editInfo?.id) {
      Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: '無法取得您的使用者資訊，請嘗試重新登入。',
        confirmButtonText: '確定'
      });
      return;
    }

    const { value: newEmail } = await Swal.fire({
      title: '修改電子郵件',
      input: 'email',
      inputLabel: '請輸入您的新信箱',
      inputPlaceholder: 'example@mail.com',
      showCancelButton: true,
      confirmButtonText: '發送驗證碼',
      preConfirm: (value) => {
        if (!value) return Swal.showValidationMessage('請輸入有效的 Email');

        const inputEmail = value.trim().toLowerCase();
        const currentEmail = (this.user?.email || this.editInfo?.email || '').trim().toLowerCase();

        if (inputEmail == currentEmail) {
          return Swal.showValidationMessage('新信箱不可與目前信箱相同');
        }
        return inputEmail;
      }
    });

    if (!newEmail) return;

    Swal.fire({
      title: '發送中...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false
    });

    const userId = this.editInfo.id;

    const sendOtpUrl = `http://localhost:8080/gogobuy/user/send-otp?id=${userId}`;

    this.http.postApi(sendOtpUrl, { email: newEmail }).subscribe({
      next: async (res: any) => {
        Swal.close();

        if (res?.code && res.code !== 200) {
          Swal.fire({
            icon: 'error',
            title: '發送失敗',
            text: res.message || '該信箱已被使用',
            confirmButtonText: '確定'
          });
          return;
        }

        const { value: otpCode } = await Swal.fire({
          title: '驗證您的新信箱',
          text: `驗證碼已寄送到 ${newEmail}`,
          input: 'text',
          inputPlaceholder: '請輸入 6 位數驗證碼',
          confirmButtonText: '驗證並修改',
          showCancelButton: true,
          allowOutsideClick: false,
          preConfirm: (value) => {
            if (!value) return Swal.showValidationMessage('請輸入驗證碼');
            return value;
          }
        });

        if (!otpCode) return;

        this.auth.emailVerify(userId, newEmail, otpCode).subscribe({
          next: async (res: any) => {

            if (res?.code != 200) {
              Swal.fire({
                icon: 'error',
                title: '修改失敗',
                text: res?.message || '驗證失敗',
              });
              return;
            }

            await Swal.fire({
              icon: 'success',
              title: '成功',
              text: 'Email 已更新，請重新登入',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });

            this.user.email = newEmail;
            this.editInfo.email = newEmail;
            this.auth.logout();
          },

          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: '修改失敗',
              text: err?.error?.message || '驗證失敗',
            });
          }
        });

      }
    });
  }



  // 修改密碼 sweetAlert
  changePassword() {
    if (!this.editInfo || !this.editInfo.id) {
      Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: '無法取得您的使用者資訊，請嘗試重新登入。',
        confirmButtonText: '確定'
      });
      return; // 直接中斷，不執行後續邏輯
    }
    (async () => {
      const { value: formValues } = await Swal.fire({
        title: '修改密碼',
        html: `
        <input id="swal-old" type="password" class="swal2-input" placeholder="舊密碼">
        <input id="swal-new" type="password" class="swal2-input" placeholder="新密碼">
        <input id="swal-confirm-new" type="password" class="swal2-input" placeholder="確認新密碼">
      `,
        focusConfirm: false,
        confirmButtonText: '確認修改',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
          const popup = Swal.getPopup();
          const oldEl = popup?.querySelector(
            '#swal-old'
          ) as HTMLInputElement | null;
          const newEl = popup?.querySelector(
            '#swal-new'
          ) as HTMLInputElement | null;
          const conNewEl = popup?.querySelector(
            '#swal-confirm-new'
          ) as HTMLInputElement | null;

          if (!oldEl?.value || !newEl?.value || !conNewEl?.value) {
            Swal.showValidationMessage('請輸入舊密碼、新密碼與確認新密碼');
            return;
          }
          if (oldEl.value == newEl.value) {
            Swal.showValidationMessage('新密碼不可與舊密碼相同');
            return;
          }

          if (conNewEl.value != newEl.value) {
            Swal.showValidationMessage('新密碼不可與確認新密碼不同');
            return;
          }
          return [oldEl.value, newEl.value] as [string, string];
        },
      });

      if (!formValues) return;

      const [oldPassword, newPassword] = formValues;
      this.auth.changePassword({ oldPassword, newPassword }); // 呼叫AuthService
      this.auth.logout();
    })();
  }

  get isGoogleUser(): boolean {
    // 直接回傳判斷結果，若 provider 不存在則回傳 false
    return this.editInfo?.provider == 'GOOGLE';
  }

  // 返回個人資訊
  backinfo() {
    this.router.navigate(['/user/profile']);
  }
}
