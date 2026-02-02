import { Component, OnInit } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from "@angular/forms";
import { CartService } from '../@service/cart.service';
import { ActivatedRoute } from '@angular/router';


export interface orders {
  id: number;
  events_id: number;
  user_id: string;
  menu_id: number;
  quantity: number;
  selected_option: string;
  personal_memo: string;
  order_time: Date;
  pickup_status: string;
  pickup_time: Date;
  subtotal: number;
  weight: number;
  is_deleted: boolean;
};

const fakeOrder: orders = {
  id: 1,
  events_id: 1001,
  user_id: "user_abc123",
  menu_id: 25,
  quantity: 2,
  selected_option: "少糖 / 去冰",
  personal_memo: "請幫我分開包裝，謝謝",
  order_time: new Date("2026-01-28T10:30:00"),
  pickup_status: "pending", // pending / picked_up / cancelled 之類
  pickup_time: new Date("2026-01-28T12:00:00"),
  subtotal: 180,
  weight: 0.75,
  is_deleted: false
};


@Component({
  selector: 'app-order-info',
  imports: [
    StepsModule,
    ToastModule,
    FormsModule,
    JsonPipe
  ],
  providers: [MessageService],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.scss'
})
export class OrderInfoComponent implements OnInit {
  items: MenuItem[] | undefined;
  eventName = '';
  storeName = '';
  latestOrderTime = '';
  userId = '';
  eventsId = 0;
  activeIndex: number = 0;
  res: any;

  constructor(
    public messageService: MessageService,
    public cart: CartService,
    public router: Router,
    private route: ActivatedRoute,
  ) { }


  ngOnInit() {
    this.items = [
      { label: 'Personal' },
      { label: 'Payment' },
      { label: 'Confirmation' }
    ];

    // 載入cart傳入開團訂單詳情
    this.route.queryParamMap.subscribe(params => {
      this.userId = params.get('user_id') || '';
      this.eventsId = Number(params.get('events_id') || 0);

      this.eventName = params.get('eventName') || '';
      this.storeName = params.get('storeName') || '';
      this.latestOrderTime = params.get('latestOrderTime') || '';

      if (!this.userId || !this.eventsId) return;

      this.cart.getOrders(this.userId, this.eventsId).subscribe({
        next: (data: any) => {
          console.log('getOrders 回傳 data:', data);
          this.res = data
        },
        error: (err: any) => console.error('API error:', err),
      });
    });
  }


  get progressRatio(): number {
    const n = this.items?.length ?? 0;
    if (n <= 1) return 0;
    return this.activeIndex / (n - 1); // 0~1
  }

  // 返回購物車
  backtocart() {
    this.router.navigate(['/user/cart'])
  }
  // 返回繼續購物
  gotoshop() {

  }

  // 前往下一個Step
  nextStep() {
    const max = (this.items?.length ?? 1) - 1;
    this.activeIndex = Math.min(this.activeIndex + 1, max);
  }

  // 返回前一個Step
  prevStep() {
    this.activeIndex = Math.max(this.activeIndex - 1, 0);
  }

  /* 轉換ISO8601日期格式 */
  formatDateTime(s: string) {
    // 's' 如果是 ''、null、undefined ，就直接回傳空字串
    if (!s) return '';
    // 把後端給的字串'2026-01-15T21:20:30'轉成 JS 的 Date 物件
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    // String(n)：把數字轉字串 .padStart(2, '0')：如果長度不到 2，就在前面補 0，2026/1/5 9:3 => 2026/01/05 09:03
    const pad = (n: number) => String(n).padStart(2, '0');
    // 顯示格式 Year()：年份、 Month：月份、 Date：日期、 Hours：小時、 Minutes：分鐘
    // JS 的月份是 0~11，所以Month要+1才會變成1~12月
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

}


