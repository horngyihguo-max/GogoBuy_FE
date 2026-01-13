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
  constructor(private http: HttpService, private router: Router, public auth: AuthService) { }
  // 是否是最新資料 (為測試暫時調成true，預設為false)
  ready = true;
  // 修改用暫存資料 -----------------------------------------------------------------
  editInfo: any | null = null;
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
    console.log(localStorage.getItem('user'));
    if (this.auth.user) {
      this.editInfo = { ...this.auth.user };
      this.editInfo.email = localStorage.getItem('user_email');
      this.editInfo.avatar_url = localStorage.getItem('user_avatar_url');
      const savedEmail = localStorage.getItem('user_session');
      console.log(this.editInfo)
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
    if (!this.auth.user || this.auth.user.exp === undefined) return; // 防止資料為空時噴錯
    const totalExp = this.auth.user.exp; // 取得總經驗值
    this.level += Math.floor(totalExp / this.expToNextLevel); // 升等(無條件捨去)
    this.currentExp = totalExp % this.expToNextLevel; // 餘數
    // ((餘數/多少經驗升等)*100)%
    this.expPercentage = `${(this.currentExp / this.expToNextLevel) * 100}%`;
  }

  // 前往修改個人資料頁面
  goTOEdit() {
    this.router.navigate(['/personInfoEdit']);
  }

}
