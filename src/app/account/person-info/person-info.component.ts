import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-person-info',
  imports: [CommonModule, FormsModule],
  templateUrl: './person-info.component.html',
  styleUrl: './person-info.component.scss',
})
export class PersonInfoComponent {
  constructor(public auth: AuthService) {}
  // 是否是最新資料 (為測試暫時調成true，預設為false)
  ready = true;

  ngOnInit() {
    // 進入時最新資料準備狀態重置為false
    // this.ready = false;

    // 測試用更新用戶資料
    this.auth.refreshUser();
    // TODO 實際串接時請用這個
    // this.auth.refreshUser().subscribe({
    //   next: () => (this.ready = true),
    //   error: () => (this.ready = true), // 失敗也要解除 loading，避免卡死
    // });
  }

  // 等級相關屬性 -------------------------------------------------------------------
  level: number = 0;
  currentExp: number = 0;
  expToNextLevel: number = 100;
  expPercentage: string = '0%';

  // 等級計算器
  calculateLevel() {
    const totalExp = this.auth.user.exp;
    this.level = Math.floor(totalExp / 100); // 如果 100 經驗升一等
    this.currentExp = totalExp % 100;
    this.expPercentage = `${(this.currentExp / this.expToNextLevel) * 100}%`;
  }

  // 修改後的暫存資料 ---------------------------------------------------------------
  editInfo: any = {};

  onAvatarUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      // 這裡實作上傳邏輯，暫時用 Base64 預覽
      const reader = new FileReader();
      reader.onload = (e: any) => this.editInfo.avatar_url = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  updateProfile() {
    console.log('提交修改:', this.editInfo);
    // TODO API POST
  }
}
