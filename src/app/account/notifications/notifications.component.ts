import { Component, OnDestroy, OnInit } from '@angular/core';
import { SseService } from '../../@service/sse.service';
import { Observable } from 'rxjs/internal/Observable';
import { AsyncPipe } from '@angular/common';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { Subscription } from 'rxjs/internal/Subscription';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe, Paginator, PaginatorModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit, OnDestroy {
  // 這裡是 template 要用的純陣列
  notifications: any[] = [];

  // 分頁狀態
  first = 0;
  rows = 5;

  private sub?: Subscription;

  constructor(public sse: SseService, private router: Router) { }

  ngOnInit() {
    this.sse.connect();

    // 從 service 拿資料，存到 notifications 陣列
    this.sub = this.sse.notifications$.subscribe((list: any[]) => {
      this.notifications = Array.isArray(list) ? list : [];

      // 如果資料變少，避免 first 超出範圍
      if (this.notifications.length === 0) {
        this.first = 0;
      } else if (this.first >= this.notifications.length) {
        this.first =
          Math.floor((this.notifications.length - 1) / this.rows) * this.rows;
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onPageChange(e: any) {
    this.first = e.first;
    this.rows = e.rows;
  }

  // 全部已讀
  markAllRead() {
    this.sse.markAllRead();
  }

  // 點擊通知後已讀，有link就導向
  onClickNotification(n: any) {
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

  // 分頁用工具 ---------------------------------------------------------------
  // 給畫面顯示「第 X 至 Y 條」
  get totalRecords(): number {
    return this.notifications.length;
  }

  get startIndex(): number {
    return this.totalRecords === 0 ? 0 : this.first + 1;
  }

  get endIndex(): number {
    return Math.min(this.first + this.rows, this.totalRecords);
  }

  // 當頁資料
  get pageItems(): any[] {
    return this.notifications.slice(this.first, this.first + this.rows);
  }
}
