import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../@service/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RouterLink } from '@angular/router';
import { Avatar, AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    RouterLink,
    AvatarModule,
    MenuModule,
    BadgeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})

export class DashboardComponent {
  stores: any[] = [];
  events: any[] = [];
  users: any[] = [];
  loading = false;

  currentView: 'announce' | 'stores' | 'events' | 'users' = 'announce';

  menuItems = [
    { label: '公告通知管理', icon: 'pi pi-megaphone', id: 'announce' },
    { label: '店家管理', icon: 'pi pi-shop', id: 'stores' },
    { label: '團購活動', icon: 'pi pi-calendar', id: 'events' },
    { label: '會員管理', icon: 'pi pi-users', id: 'users' }
  ];

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.loadData();
  }

  setView(view: any) {
    this.currentView = view;
  }

  loadData() {
    this.loading = true;
    const defaultAvatar = '../default_avatar.png';

    // 使用 forkJoin 同時發送多個請求
    forkJoin({
      stores: this.authService.getallstore(),
      events: this.authService.getallevent(),
      users: this.authService.getAllUser()
    }).pipe(
      // 這裡給予 res 一個 any 型別，解決 'unknown' 型別問題
      map((res: { stores: any, events: any, users: any }) => {
        // 1. 處理 Store 資料
        const stores = res.stores.storeList || res.stores || [];
        // 2. 處理 User 資料 (先用map處理頭像對照)
        const rawUsers = res.users.userList || res.users || [];
        const processedUsers = rawUsers.map((u: any) => ({
          ...u,
          avatarUrl: u.avatarUrl || defaultAvatar
        }));

        // 建立一個快速查詢 Map: [userId, avatarUrl]
        const avatarMap = new Map(processedUsers.map((u: any) => [u.id, u.avatarUrl]));

        // 3. 處理 Event 資料 (並將頭像塞入)
        const rawEvents = Array.isArray(res.events) ? res.events :
          (res.events.groupsSearchViewList || res.events.groupbuyEvents || res.events.eventList || []);

        const eventsWithAvatar = rawEvents.map((event: any) => ({
          ...event,
          avatarUrl: avatarMap.get(event.hostId) || defaultAvatar
        }));

        return { stores, processedUsers, eventsWithAvatar };
      })
    ).subscribe({
      next: (finalData) => {
        this.stores = finalData.stores;
        this.users = finalData.processedUsers;
        this.events = finalData.eventsWithAvatar;
        this.loading = false;
      },
      error: (err) => {
        console.error('Data load failed', err);
        this.loading = false;
      }
    });
  }

  getSeverity(status: string) {
    switch (status) {
      case 'GOOGLE': return 'success';
      default: return 'info';
    }
  }
}
