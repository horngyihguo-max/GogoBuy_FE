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
    // 1. 訂閱 User 狀態流
    this.auth.user$.subscribe(user => {
      if (user) {
        console.log('接收到用戶資料:', user);
        this.editInfo = { ...user };

        // 確保從最新的 user 物件中取得資料，而不是一直讀取 localStorage 的舊 Key
        this.editInfo.email = user.email || localStorage.getItem('user_email');
        this.editInfo.avatar_url = user.avatarUrl || user.user_avatar_url;

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
    const totalExp = exp || 0;
    this.level = Math.floor(totalExp / this.expToNextLevel) + 1;
    this.currentExp = totalExp % this.expToNextLevel;
    this.expPercentage = `${(this.currentExp / this.expToNextLevel) * 100}%`;
  }

  // 前往修改個人資料頁面
  goTOEdit() {
    this.router.navigate(['/user/profile/edit']);
  }

}
