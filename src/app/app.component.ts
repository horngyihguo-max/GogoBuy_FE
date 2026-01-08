import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLinkActive, RouterLink, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';
import { NgIf } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    InputTextModule,
    RouterLinkActive,
    RouterLink,
    MenuModule,
    NgIf
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(public router: Router) { }
  title = 'gogobuy';
  // 預設頭像
  userAvatar = "/Snoopy.jpg";
  // 用戶頭向下拉選單
  items: MenuItem[] = [
    { label: '首頁', icon: 'pi pi-home', routerLink: '/' },
    { label: '我的訂單', icon: 'pi pi-receipt', routerLink: '/orders' },
    { label: '產品說明', icon: 'pi pi-box', routerLink: '/404' },
    { label: '關於我們', icon: 'pi pi-info-circle', routerLink: '/about' }
  ];

  test() {
    Swal.fire('SweetAlert2 is working!');
  }

  get showSearch(): boolean {
    return this.router.url.startsWith('/gogobuy');
  }

}

export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  role: 'ADMIN' | 'USER';
}
