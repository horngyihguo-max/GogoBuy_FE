import { Component, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLinkActive, RouterLink, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from './@service/auth.service';
import { HttpService } from './@service/http.service';
import { NotificationBellComponent } from './account/notification-bell/notification-bell.component';

export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  role: 'ADMIN' | 'USER';
}
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    InputTextModule,
    RouterLink,
    MenuModule,
    CommonModule,
    NotificationBellComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(public router: Router, private http: HttpService, public auth: AuthService) { }
  title = 'gogobuy';
  @ViewChild('menu') mainMenu!: Menu;
  @ViewChild('problemMenu') problemMenu!: Menu;

  // 預設頭像
  userAvatar: string | null = null;
  ngOnInit() {
    this.auth.user$.subscribe(user => {
      console.log('導覽列收到使用者狀態更新:', user);

      if (user) {
        this.userAvatar = user.user_avatar_url || user.avatar_url || user.avatarUrl;
        if (!this.userAvatar) {
          this.userAvatar = '/Snoopy.jpg';
        }
      } else {
        this.userAvatar = null;
      }
    });
  }

  // 用戶頭向下拉選單
  items: MenuItem[] = [
    { label: '用戶首頁', icon: 'pi pi-user', routerLink: '/personInfo' },
    { label: '我的訂單', icon: 'pi pi-receipt', routerLink: '/orders' },
    { label: '登入', icon: 'pi pi-sign-in', routerLink: '/login' },
    { label: '登出', icon: 'pi pi-sign-out', command: () => { this.logout(); } }
  ];

  // 手機端常見問題選單
  problems: MenuItem[] = [
    { label: '隱私政策', icon: 'pi pi-shield', routerLink: '/privacyPolicy' },
    { label: '服務條款', icon: 'pi pi-book', routerLink: '/conditions' },
    { label: '常見問題', icon: 'pi pi-headphones', routerLink: '/problems' },
  ];
  test() {
    Swal.fire('SweetAlert2 is working!');
  }

  // 判斷是否在/gogobuy路徑
  get showSearch(): boolean {
    return this.router.url.startsWith('/gogobuy');
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.mainMenu?.visible) {
      this.mainMenu.hide();
    }
    if (this.problemMenu?.visible) {
      this.problemMenu.hide();
    }
  }

  onUserClick(event: any, menu: any) {
    const items = this.filteredItems;
    if (items && items.length > 0) {
      menu.toggle(event);
    } else {
      console.log('選單內容為空');
    }
  }

  // 判斷是否已登入
  get isLoggedIn(): boolean {
    return !!localStorage.getItem('user_id');
  }

  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // 使用session判斷選單出現列表
  get filteredItems() {
    const loggedIn = this.isLoggedIn;
    const mobile = this.isMobile;
    return this.items.filter(item => {
      // 如果偵測到session顯示登出
      if (item.label == '登出') {
        return loggedIn;
      }

      // 如果沒有偵測到session顯示登入
      if (item.label == '登入') {
        return !loggedIn;
      }

      if (loggedIn && mobile) {
        return false;
      }

      if (!loggedIn && mobile) {
        return false;
      }

      return true;
    });
  }

  //登出清除session
  logout() {
    this.auth.logout();
    // 清除前端紀錄
    localStorage.clear();
    // 回到首頁
    this.router.navigate(['/gogobuy']);
    Swal.fire({
      title: '已登出',
      icon: 'success',
      showConfirmButton: false,
      timer: 1000
    });
  };

}

