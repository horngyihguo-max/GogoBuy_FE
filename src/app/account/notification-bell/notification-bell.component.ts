import {
  Component,
  Input,
  ViewChild,
  HostListener,
  OnInit,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PopoverModule, Popover } from 'primeng/popover';
import { Router, RouterModule } from '@angular/router';
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
  constructor(public sse: SseService, private router: Router) {}
  ngOnInit() {
    this.sse.connect();
    this.notifications$ = this.sse.notifications$;
    this.unreadCount$ = this.sse.unreadCount$;
  }

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

  // 全部已讀
  markAllRead() {
    this.sse.markAllRead();
  }

  // 點擊通知後已讀，有link就導向
  clickItem(n: any) {
    this.sse.markAsRead(n.id);

    const link = n.link;
    if (!link) return;

    // 外部連結：http/https 開新分頁（也可以改同分頁）
    // if (typeof link === 'string' && /^https?:\/\//i.test(link)) {
    //   window.open(link, '_blank');
    //   return;
    // }

    // 站內路由：如果沒有/就補上
    const internal = link.startsWith('/') ? link : `/${link}`;
    this.router.navigateByUrl(internal);
  }
}
