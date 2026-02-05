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
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TieredMenu } from 'primeng/tieredmenu';
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
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    TieredMenu,
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
  items: any[] | undefined;

  currentView: 'announce' | 'stores' | 'events' | 'users' = 'announce';

  menuItems = [
    { label: '公告通知管理', icon: 'pi pi-megaphone', id: 'announce' },
    { label: '店家管理', icon: 'pi pi-shop', id: 'stores' },
    { label: '團購活動', icon: 'pi pi-calendar', id: 'events' },
    { label: '會員管理', icon: 'pi pi-users', id: 'users' }
  ];

  // 公告相關變數
  displayAnnounceDialog = false;
  historyNotices: any[] = []; // 歷史公告列表
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

    this.items = [
      {
        label: '權限',
        icon: 'pi pi-user-edit',
        items: [
          {
            label: '升級為管理員',
            icon: 'pi pi-crown',
          },
          {
            label: '調整為一般用戶',
            icon: 'pi pi-user',
          },

        ]
      }];

    this.loadData();
    this.loadHistory(); // 載入歷史公告
  }

  setView(view: any) {
    this.currentView = view;
  }

  // 載入歷史公告
  loadHistory() {
    this.messageService.getGlobalNoticeHistory().subscribe({
      next: (data) => {
        // data 是 SystemNotice Array
        // content 可能是 JSON String，嘗試解析
        this.historyNotices = data.map((item: any) => {
          let parsedContent = item.content;
          let parsedTitle = '系統公告';
          let parsedLink = '';

          try {
            const obj = JSON.parse(item.content);
            if (obj && typeof obj == 'object') {
              parsedTitle = obj.title || '系統公告';
              parsedContent = obj.content || item.content;
              parsedLink = obj.link || '';
            }
          } catch (e) {
            // 不是 JSON，就直接顯示原始字串
          }

          return {
            ...item,
            displayTitle: parsedTitle,
            displayContent: parsedContent,
            displayLink: parsedLink
          };
        });
      },
      error: (err) => console.error('Load history failed', err)
    });
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

        // 建立店家查詢 Map: [storeId, storeName]
        const storeMap = new Map(stores.map((s: any) => [s.id, s.name]));

        // 3. 處理 Event 資料 (並將頭像塞入)
        const rawEvents = Array.isArray(res.events) ? res.events :
          (res.events.groupsSearchViewList || res.events.groupbuyEvents || res.events.eventList || []);

        const eventsWithAvatar = rawEvents.map((event: any) => ({
          ...event,
          avatarUrl: avatarMap.get(event.hostId) || defaultAvatar,
          storeName: storeMap.get(event.storeId || event.storesId) || '未知店家'
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
      case 'GOOGLE': return 'info';
      default: return 'success';
    }
  }

  getEventSeverity(status: string) {
    switch (status) {
      case 'FINISHED': return 'info';
      default: return 'success';
    }
  }

  storeGetServerity(category: string) {
    switch (category) {
      case 'fast': return 'info';
      default: return 'success';
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

    // 1. 處理日期 -> 轉成 backend 要求的 LocalDateTime 格式
    let timeStr: string | undefined = undefined;
    if (this.announceDate) {
      // 格式為: YYYY-MM-DDTHH:mm:ss
      const iso = this.announceDate.toISOString(); // e.g., 2023-10-27T10:00:00.000Z
      timeStr = iso.split('.')[0]; // 拿掉毫秒, 變成 2023-10-27T10:00:00
    }

    // 2. 組合 msg 內容並轉換成JSON格式內容以讓 SSE 收到後能解析成 title/content/link
    const payloadMsgObj = {
      title: this.announceData.title,
      content: this.announceData.content,
      link: this.announceData.targetUrl,
      createdAt: new Date().toLocaleString()
    };
    const msgString = JSON.stringify(payloadMsgObj);

    // 3. 呼叫 Service
    // 注意: setGlobalNotice 參數是 { content, expiredAt? }
    this.messageService.setGlobalNotice({
      content: msgString,
      expiredAt: timeStr
    }).subscribe({
      next: () => {
        // res 是純字串 (String return from Backend)
        Swal.fire({
          icon: "success",
          title: "公告發送成功!",
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        this.displayAnnounceDialog = false;
        this.loadHistory(); // 重新載入歷史
      },
      error: (err) => {
        Swal.fire('發送失敗', err, 'error');
      }
    });
  }
}
