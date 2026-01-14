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
  ) {}
  private es?: EventSource;
  userId: string = '';

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
      const item = this.toUiNotification(event.data);

      // 新通知放最上面
      this.notifications = [item, ...this.notifications];

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

  // 測試用
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
    this.emit();
  }

  // 讓 Bell / Page 共用的操作
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

  // 你之後如果要接「歷史通知 API」，可以塞一個 setInitial(list)
  setInitial(list: any[]) {
    this.notifications = list;
    this.emit();
  }

  // ---- helpers ----

  private emit() {
    this.notificationsSubject.next(this.notifications);
    this.unreadCountSubject.next(
      this.notifications.filter((n) => !n.isRead).length
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

  private fallbackId() {
    return (crypto as any).randomUUID?.() ?? String(Date.now() + Math.random());
  }
}
