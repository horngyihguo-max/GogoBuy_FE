import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpService } from '../../@service/http.service';
import { Router } from '@angular/router';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-person-info-edit',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './person-info-edit.component.html',
  styleUrl: './person-info-edit.component.scss'
})
export class PersonInfoEditComponent {
  constructor(private http: HttpService, private router: Router, public auth: AuthService) { }
  // 是否是最新資料 (為測試暫時調成true，預設為false)
  ready = true;
  user: any = {
    id: '',
    email: ''
  };
  ngOnInit() {
    // 進入時最新資料準備狀態重置為false
    this.ready = false;

    // 測試用更新用戶資料
    // this.auth.refreshUser();
    // this.editInfo = { ...this.auth.user };
    // console.log('取得用戶資料:', JSON.stringify(this.editInfo, null, 2));

    // TODO 實際串接時請用這個
    this.auth.refreshUser()
    console.log(this.auth.user)
    if (this.auth.user) {
      this.user = { ...this.auth.user };
      this.editInfo = { ...this.auth.user };
      this.editInfo.email = localStorage.getItem('user_email');
      this.editInfo.avatar_url = localStorage.getItem('user_avatar_url');
      const savedEmail = localStorage.getItem('user_session');
      if (savedEmail) {
        this.editInfo.email = savedEmail;
      }
      this.calculateLevel();
      this.ready = true;
    }

    // 重要! 取得資料後要再呼叫一次等級計算器，否則可能無法反映最新等級
    this.calculateLevel();
  }

  // 等級相關屬性 -------------------------------------------------------------------
  level: number = 1; // 初始等級
  currentExp: number = 0; // 餘數
  expToNextLevel: number = 100; // 多少經驗升等
  expPercentage: string = '0%'; // 經驗條顯示%數

  // 等級計算器
  calculateLevel() {
    const totalExp = this.auth.user.exp; // 取得總經驗值
    this.level += Math.floor(totalExp / this.expToNextLevel); // 升等(無條件捨去)
    this.currentExp = totalExp % this.expToNextLevel; // 餘數
    // ((餘數/多少經驗升等)*100)%
    this.expPercentage = `${(this.currentExp / this.expToNextLevel) * 100}%`;
  }

  // 修改用暫存資料 -----------------------------------------------------------------
  editInfo: any | null = null;

  // 頭像上傳
  onAvatarUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      // 上傳後的頭像暫時用 Base64 預覽
      const reader = new FileReader();
      reader.onload = (e: any) => (this.editInfo.avatar_url = e.target.result);
      reader.readAsDataURL(file);
    }
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
        if (res.code === 200) {
          Swal.fire({
            title: '儲存成功',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false
          });

          this.auth.setUser({ ...this.auth.user, ...payload });
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

  // 修改信箱
  async changeEmail() {

    if (!this.editInfo || !this.editInfo.id) {
      Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: '無法取得您的使用者資訊，請嘗試重新登入。',
        confirmButtonText: '確定'
      });
      return; // 直接中斷，不執行後續邏輯
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
        if (value == this.user?.email) return Swal.showValidationMessage('新信箱不可與目前信箱相同');
        return value;
      }
    });

    if (!newEmail) return;


    Swal.fire({ title: '發送中...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    const userId = this.editInfo?.id;
    if (!userId) {
      console.error("ID 遺失");
      return;
    }
    const sendOtpUrl = `http://localhost:8080/gogobuy/user/send-otp?id=${userId}`;

    this.http.postApi(sendOtpUrl, { email: newEmail }).subscribe({
      next: async () => {
        const { value: otpCode } = await Swal.fire({
          title: '驗證您的新信箱',
          text: `驗證碼已寄送到 ${newEmail}`,
          input: 'text',
          inputPlaceholder: '請輸入 6 位數驗證碼',
          confirmButtonText: '驗證並修改',
          showCancelButton: true,
          allowOutsideClick: false,
          cancelButtonText: '取消',
          preConfirm: (value) => {
            if (!value) return Swal.showValidationMessage('請輸入驗證碼');
            return value;
          }
        });

        if (otpCode) {
          this.auth.emailVerify(this.user.id, newEmail, otpCode).subscribe({
            next: (res) => {
              Swal.fire('成功', 'Email 已更新', 'success');
              this.user.email = newEmail;
              this.auth.logout();
            },
            error: (err) => {
              Swal.fire('失敗', err.error?.message || '驗證失敗', 'error');
            }
          });
        }
      },
      error: (err) => {
        Swal.fire('發送失敗', '無法發送驗證碼，請稍後再試', 'error');
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
}
