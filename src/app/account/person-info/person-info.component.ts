import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpService } from '../../@service/http.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-person-info',
  imports: [CommonModule, FormsModule],
  templateUrl: './person-info.component.html',
  styleUrl: './person-info.component.scss',
})
export class PersonInfoComponent {
  constructor(private http: HttpService, private router: Router, public auth: AuthService) {}
  // 是否是最新資料 (為測試暫時調成true，預設為false)
  ready = true;

  ngOnInit() {
    // 進入時最新資料準備狀態重置為false
    // this.ready = false;

    // 測試用更新用戶資料
    this.auth.refreshUser();
    this.editInfo = { ...this.auth.user };
    console.log('取得用戶資料:', JSON.stringify(this.editInfo, null, 2));

    // TODO 實際串接時請用這個
    // this.auth.refreshUser().subscribe({
    //   next: () => (this.ready = true),
    //   error: () => (this.ready = true), // 失敗也要解除 loading，避免卡死
    // });

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
    // JSON 字串化去比較修改後資料是否與原資料相同
    if (JSON.stringify(this.editInfo) === JSON.stringify(this.auth.user)) {
      return; // 如果沒修改直接忽視
    } else {
      this.auth.updateProfile(this.editInfo); // 呼叫AuthService
    }
  }

  // 修改密碼 sweetAlert
  changePassword() {
    (async () => {
      const { value: formValues } = await Swal.fire({
        title: '修改密碼',
        html: `
        <input id="swal-old" type="password" class="swal2-input" placeholder="舊密碼">
        <input id="swal-new" type="password" class="swal2-input" placeholder="新密碼">
      `,
        focusConfirm: false,
        preConfirm: () => {
          const popup = Swal.getPopup();
          const oldEl = popup?.querySelector(
            '#swal-old'
          ) as HTMLInputElement | null;
          const newEl = popup?.querySelector(
            '#swal-new'
          ) as HTMLInputElement | null;

          if (!oldEl?.value || !newEl?.value) {
            Swal.showValidationMessage('請輸入舊密碼與新密碼');
            return;
          }
          return [oldEl.value, newEl.value] as [string, string];
        },
      });

      if (!formValues) return;

      const [oldPassword, newPassword] = formValues;
      this.auth.changePassword({ oldPassword, newPassword }); // 呼叫AuthService
    })();
  }
}
