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

  // 判斷是否為手機業面
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // 停用帳戶
  async suspendAccount() {
    const result = await Swal.fire({
      title: '您確定要停用帳戶嗎？',
      text: '停用後您將立即被登出，且無法再次登入此帳號。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7f1d1d', // red-900
      cancelButtonColor: '#94a3b8', // slate-400
      confirmButtonText: '確定停用',
      cancelButtonText: '取消',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: '正在處理中...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
      });

      this.http.postApi(`http://localhost:8080/gogobuy/user/suspend?id=${this.auth.user.id}`, {})
        .subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              Swal.fire({
                icon: 'success',
                title: '帳戶已停用',
                text: '您的帳戶已成功停用。正在將您登出...',
                showConfirmButton: false,
                timer: 2000
              });

              // 登出並清除資料
              setTimeout(() => {
                this.auth.logout();
                this.router.navigate(['/']);
              }, 2000);
            } else {
              Swal.fire({
                icon: 'error',
                title: '停用失敗',
                text: res.message || '請稍後再試。'
              });
            }
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: '發生錯誤',
              text: err.error?.message || '伺服器發生錯誤，請稍後再試。'
            });
          }
        });
    }
  }
}
