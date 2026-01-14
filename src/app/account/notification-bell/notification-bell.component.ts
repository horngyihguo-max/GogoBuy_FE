import {
  Component,
  Input,
  ViewChild,
  HostListener,
  OnInit,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PopoverModule, Popover } from 'primeng/popover';
import { RouterModule } from '@angular/router';
import { SseService } from '../../@service/sse.service';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-notification-bell',
  imports: [PopoverModule, RouterModule, Popover, AsyncPipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  // 手機畫面模式切換
  @Input() mode: 'dropdown' | 'icon' = 'dropdown';
  // 訂閱pop
  @ViewChild('pop') pop!: Popover;

  @HostListener('window:scroll')
  onScroll() {
    this.pop?.hide();
  }

  notifications$: Observable<any[]> | undefined;
  unreadCount$: Observable<number> | undefined;

  // 呼叫SSE
  constructor(public sse: SseService) {}
  ngOnInit() {
    this.sse.connect();
    this.notifications$ = this.sse.notifications$;
    this.unreadCount$ = this.sse.unreadCount$;
  }

  // 實際使用（之後接後端再換）
  // notifications: any[] = [];

  // 假資料
  // notifications: any[] = [
  //   {
  //     id: 1,
  //     title: '結單提醒',
  //     message: '距離結單剩 30 分鐘',
  //     createdAt: '剛剛',
  //     isRead: false,
  //   },
  //   {
  //     id: 2,
  //     title: '願望已實現',
  //     message: '你追蹤的願望已達成',
  //     createdAt: '昨天',
  //     isRead: true,
  //   },
  //   {
  //     id: 3,
  //     title: '願望超時',
  //     message: '你追蹤的願望已超時',
  //     createdAt: '2 天前',
  //     isRead: false,
  //   },
  // ];

  markAllRead() {
    this.sse.markAllRead();
  }

  clickItem(n: any) {
    this.sse.markAsRead(n.id);
  }
}
