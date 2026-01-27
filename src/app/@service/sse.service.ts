import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root',
})
export class SseService {
  private es?: EventSource;
  userId: string = '';

  // 顯示天數限制
  private retentionDays = 30;
  // 總共顯示筆數限制(如果不要這個限制，記得cleanup()要改)
  private maxItems = 50;

  ngOnInit(): void {
    this.userId = this.userId;
  }

  // 通知列表（單一來源）
  private notificationsSubject = new BehaviorSubject<any[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  // 未讀數
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  // 目前快取
  private notifications: any[] = [];

  // 防止重複 connect
  private connectedUserId: string | null = null;

  constructor(
    private zone: NgZone,
    public auth: AuthService
  ) {
    const raw = localStorage.getItem('notifications_cache');
    if (raw) {
      try {
        this.notifications = JSON.parse(raw);
        this.emit();
      } catch { }
    }
  }

  // 只要呼叫一次就好（Bell 或 Page 呼叫都行）
  connect(userId: string) {
    if (!userId) return;
    if (this.connectedUserId === userId && this.es) return; // 已連線就不重複連

    this.disconnect();
    this.connectedUserId = userId;

    this.es = new EventSource(`http://localhost:8080/api/sse/subscribe/${userId}`);

    this.es.onopen = () => {
      this.zone.run(() => console.log('[SSE] connected'));
    };

    // INIT（可選）
    this.es.addEventListener('INIT', (event: any) => {
      this.zone.run(() => {
        console.log('[SSE] INIT:', event.data);
      });
    });

    // 公告（SYSTEM_NOTICE）
    this.es.addEventListener('SYSTEM_NOTICE', (event: any) => {
      this.zone.run(() => {
        this.upsertSystemNotice(event.data);
      });
    });


    // 一般通知（message）
    this.es.addEventListener('message', (event: any) => {
      this.zone.run(() => {
        const item = this.toUiNotification(event.data, '通知');
        this.notifications = [item, ...this.notifications];
        this.cleanup();
        this.emit();
      });
    });

    // 不要 observer.error，讓 EventSource 有機會自動重連
    this.es.onerror = (e) => {
      this.zone.run(() => {
        console.warn('[SSE] error (may reconnect):', e);
      });
    };
  }

  disconnect() {
    this.es?.close();
    this.es = undefined;
    this.connectedUserId = null;
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
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.emit();
  }

  // 已讀全部
  markAllRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
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
      this.notifications.filter(n => !n.isRead && n.id !== 'SYSTEM_NOTICE').length);
    // 重要! 讓刷新不消失(存入localStorage)
    localStorage.setItem('notifications_cache', JSON.stringify(this.notifications));
  }

  // 把後端丟來的一筆 data（字串）轉成 UI 能吃的物件
  private toUiNotification(raw: string, fallbackTitle: string) {
    return {
      id: this.fallbackId(),
      title: fallbackTitle,
      message: raw ?? '',
      createdAt: new Date().toLocaleString(),
      isRead: false,
      link: null,
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
    this.notifications = this.notifications.filter(n => {
      const t = new Date(n.createdAt).getTime();
      return Number.isFinite(t) ? now - t <= maxAge : true;
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
  private upsertSystemNotice(text: string) {
    const id = 'SYSTEM_NOTICE'; // 固定ID：永遠同一筆公告

    const item = {
      id,
      title: '系統公告',
      message: text ?? '',
      createdAt: new Date().toLocaleString(),
      isRead: false,
      link: null,
    };

    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      // 已經有公告：覆蓋更新（不新增）
      this.notifications[idx] = { ...this.notifications[idx], ...item };
    } else {
      // 第一次收到公告：新增一筆
      this.notifications = [item, ...this.notifications];
    }

    this.cleanup();
    this.emit();
  }

}
