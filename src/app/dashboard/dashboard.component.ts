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
import { MessageService, NotifiMesReq, NotifiCategoryEnum } from '../@service/message.service';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

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
    AvatarModule,
    MenuModule,
    BadgeModule,
    DialogModule,
    CalendarModule,
    InputTextModule,
    TextareaModule,
    FormsModule
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

  // 公告相關變數
  displayAnnounceDialog = false;
  announceData: Partial<NotifiMesReq> = {
    title: '',
    content: '',
    targetUrl: '',
    expiredAt: '',
    category: NotifiCategoryEnum.SYSTEM
  };
  announceDate: Date | null = null; // for Calendar binding

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) { }

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

  // 開啟公告視窗
  openAnnounceDialog() {
    this.displayAnnounceDialog = true;
    this.announceDate = null;
    this.announceData = {
      title: '',
      content: '',
      targetUrl: '',
      category: NotifiCategoryEnum.SYSTEM
    };
  }

  // 發送公告
  sendAnnouncement() {
    if (!this.announceData.title || !this.announceData.content) {
      Swal.fire('請填寫標題與內容', '', 'warning');
      return;
    }

    // 處理日期
    if (this.announceDate) {
        // 簡單格式化 YYYY-MM-DD (視後端需求調整)
        const year = this.announceDate.getFullYear();
        const month = String(this.announceDate.getMonth() + 1).padStart(2, '0');
        const day = String(this.announceDate.getDate()).padStart(2, '0');
        this.announceData.expiredAt = `${year}-${month}-${day}`;
    }

    // 呼叫 Service
    this.messageService.create(this.announceData as NotifiMesReq).subscribe({
      next: (res) => {
        if (res.code === 200 || res.message === 'Success') { // Adjust based on actual Backend response structure
             Swal.fire('公告發送成功', '', 'success');
             this.displayAnnounceDialog = false;
        } else {
             Swal.fire('發送失敗', res.message || '未知錯誤', 'error');
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('發送失敗', '請稍後再試', 'error');
      }
    });
  }
}
