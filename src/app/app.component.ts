import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkActive, RouterLink } from '@angular/router';
import Swal from 'sweetalert2'
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    InputTextModule,
    RouterLinkActive,
    RouterLink,
    MenuModule,],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  userAvatar = 'pngtree-cartoon-simple-pen-cute-girl-hand-painted-avatar-png-image_4266565.png';
  visible = false;
  items: MenuItem[] = [
    { label: '首頁', icon: 'pi pi-home', routerLink: '/' },
    { label: '產品說明', icon: 'pi pi-box', routerLink: '/404' },
    { label: '關於我們', icon: 'pi pi-info-circle', routerLink: '/about' }
  ];
  title = 'gogobuy';
  ngOnInit(): void {
  }
  test() {
    Swal.fire("SweetAlert2 is working!");
  }
}

export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  role: 'ADMIN' | 'USER';
}
