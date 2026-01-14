import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  constructor(
    private http: HttpService,
    private router: Router,
    private auth: AuthService
  ) {
    // 這邊是把抓到的通知內容存入localStorage(就不會消失)
    const raw = localStorage.getItem('notifications_cache');
    if (raw) {
      try {
        this.notifications = JSON.parse(raw);
        this.emit();
      } catch {
        // ignore
      }
    }
  }
  private es?: EventSource;
  userId: string = '';

  // 顯示天數限制
  private retentionDays = 30;
  // 總共顯示筆數限制(如果不要這個限制，記得cleanup()要改)
  private maxItems = 50;

  ngOnInit(): void {
    this.userId = this.auth.user.id;
  }

  // 通知列表（單一來源）
  private notificationsSubject = new BehaviorSubject<any[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  // 未讀數
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  // 目前快取
  private notifications: any[] = [];

  // 只要呼叫一次就好（Bell 或 Page 呼叫都行）
  connect() {
    if (this.es) return; // 防止重複連線

    // 這邊寫實際API
    this.es = new EventSource(`http://localhost:8080/這邊要改/${this.userId}`);

    this.es.onmessage = (event) => {
      console.log('SSE 連接成功');
      const item = this.toUiNotification(event.data);

      // 新通知放最上面
      this.notifications = [item, ...this.notifications];
      this.cleanup();
      this.emit();
    };

    this.es.onerror = () => {
      console.log('SSE error');
    };
  }

  disconnect() {
    this.es?.close();
    this.es = undefined;
  }

  // 測試用 +通知
  pushTest() {
    const item = {
      id: (crypto as any).randomUUID?.() ?? String(Date.now()),
      title: '測試通知',
      message: '這是一筆前端手動塞入的通知，用來測 UI。',
      createdAt: new Date().toLocaleString(),
      isRead: false,
      link: null,
    };

    this.notifications = [item, ...this.notifications];
    this.cleanup();
    this.emit();
  }

  // 讓 Bell / Page 共用已讀的操作
  markAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.emit();
  }

  // 已讀全部
  markAllRead() {
    this.notifications = this.notifications.map((n) => ({
      ...n,
      isRead: true,
    }));
    this.emit();
  }

  // 之後如果要接「歷史通知 API」，可以塞這個 setInitial(list)
  setInitial(list: any[]) {
    this.notifications = list;
    this.emit();
  }

  // 小工具 -----------------------------------------------------------------------------

  private emit() {
    // 讓訂閱了notificationsSubject的頁面在接收到更新時自動刷新
    this.notificationsSubject.next(this.notifications);
    this.unreadCountSubject.next(
      this.notifications.filter((n) => !n.isRead).length
    );

    // 重要! 讓刷新不消失(存入localStorage)
    localStorage.setItem(
      'notifications_cache',
      JSON.stringify(this.notifications)
    );
  }

  // 把後端丟來的一筆 data（字串）轉成 UI 能吃的物件
  private toUiNotification(raw: string) {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }

    return {
      id: data.id ?? this.fallbackId(),
      title: data.title ?? data.type ?? '通知',
      message: data.message ?? data.content ?? '',
      createdAt: data.createdAt ?? new Date().toLocaleString(),
      isRead: false,
      link: data.link ?? null,
    };
  }

  // 自動生成ID小工具
  private fallbackId() {
    return (crypto as any).randomUUID?.() ?? String(Date.now() + Math.random());
  }

  // 條件清理小工具
  private cleanup() {
    const now = Date.now();
    const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;

    // 按時間過濾：只保留 30 天內
    this.notifications = this.notifications.filter((n) => {
      const t = this.parseTime(n.createdAt);
      return now - t <= maxAge;
    });

    // 做筆數上限
    if (this.notifications.length > this.maxItems) {
      this.notifications = this.notifications.slice(0, this.maxItems);
    }
  }

  // createdAt 可能是字串（toLocaleString），先做容錯解析
  private parseTime(createdAt: any): number {
    if (!createdAt) return Date.now();
    if (typeof createdAt === 'number') return createdAt;

    const d = new Date(createdAt);
    const t = d.getTime();
    // 如果都解析失敗，返回的會是當前時間
    return Number.isFinite(t) ? t : Date.now();
  }
}
