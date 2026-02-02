import { Component, OnInit } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from "@angular/forms";
import { CartService } from '../@service/cart.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../@service/auth.service';
import { HttpService } from '../@service/http.service';
import { of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

type SelectedOpt = { optionName: string; value: string; extraPrice?: number };

interface OrderDto {
  id: number;
  eventsId: number;
  userId: string;
  menuId: number;
  quantity: number;
  selectedOption: string;
  personalMemo: string;
  orderTime: string;
  pickupStatus: string;
  pickupTime: string | null;
  subtotal: number;
  weight: number;
  deleted: boolean;
  menuName?: string;
  parsedOptions?: SelectedOpt[];
}

interface OrdersRes {
  code: number;
  message: string;
  orders: OrderDto[];
}

interface MenuItemDto {
  id: number;
  name: string;
  basePrice: number;
  image: string | null;
}

interface MenuRes {
  code: number;
  message: string;
  menuList: MenuItemDto[];
}


type OrderVM = orders & {
  menuName?: string;
  parsedOptions?: SelectedOpt[];
};

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
  mode: 'host' | 'member' = 'member';
  host: MenuItem[] | undefined;
  member: MenuItem[] | undefined;
  eventName = '';
  storeName = '';
  latestOrderTime = '';
  userId = '';
  totalAmount = '';
  eventsId = 0;
  activeIndex: number = 0;
  menuDate: any;
  res: any;


  constructor(
    public messageService: MessageService,
    public cart: CartService,
    public auth: AuthService,
    private https: HttpService,
    public router: Router,
    private route: ActivatedRoute,
  ) { }


  ngOnInit() {
    this.host = [
      { label: 'Personal' },
      { label: 'Payment' },
      { label: 'Confirmation' }
    ];
    this.member = [
      { label: 'Confirmation' }
    ];
    this.route.queryParamMap.subscribe(q => {
      this.mode = (q.get('mode') == 'host') ? 'host' : 'member';
    });
    this.auth.user$.subscribe

    // 載入cart傳入開團訂單詳情
    this.route.queryParamMap.subscribe(params => {
      this.userId = params.get('user_id') || '';
      this.eventsId = Number(params.get('events_id') || 0);

      this.eventName = params.get('eventName') || '';
      this.storeName = params.get('storeName') || '';
      this.latestOrderTime = params.get('latestOrderTime') || '';
      this.totalAmount = params.get('totalAmount') || '';

      if (!this.userId || !this.eventsId) return;

      this.cart.getOrders(this.userId, this.eventsId).pipe(
        switchMap((ordersRes: OrdersRes) => {
          const orders = ordersRes.orders ?? [];
          const menuIds = Array.from(new Set(orders.map(o => o.menuId)));

          if (menuIds.length === 0) {
            return of({ ordersRes, menuMap: new Map<number, MenuItemDto>() });
          }

          return this.cart.getMenuByMenuId(menuIds).pipe(
            map((menuRes: MenuRes) => {
              const menuMap = new Map<number, MenuItemDto>();
              for (const m of menuRes.menuList ?? []) {
                menuMap.set(m.id, m); // id 就是 menuId
              }
              return { ordersRes, menuMap };
            })
          );
        }),
        map(({ ordersRes, menuMap }) => {
          const orders = (ordersRes.orders ?? []).map((o: { menuId: any; selectedOption: string; }) => ({
            ...o,
            menuName: menuMap.get(o.menuId)?.name ?? `menuId:${o.menuId}`,
            // 你如果也要先 parse options（可選）
            parsedOptions: this.safeParseSelectedOption(o.selectedOption),
          }));

          return { ...ordersRes, orders };
        })
      ).subscribe({
        next: (data: OrdersRes) => {
          console.log('orders + menuName:', data);
          this.res = data;
        },
        error: (err: any) => console.error('API error:', err),
      });

    });
  }

  private safeParseSelectedOption(raw: string): SelectedOpt[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as SelectedOpt[]) : [];
    } catch {
      return [];
    }
  }


  get progressRatio(): number {
    const n = this.host?.length ?? 0;
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
    const max = (this.host?.length ?? 1) - 1;
    this.activeIndex = Math.min(this.activeIndex + 1, max);
  }

  // 返回前一個Step
  prevStep() {
    this.activeIndex = Math.max(this.activeIndex - 1, 0);
  }



  parseSelectedOption(raw: any): SelectedOpt[] {
    if (Array.isArray(raw)) return raw as SelectedOpt[];

    if (!raw) return [];

    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as SelectedOpt[]) : [];
    } catch (e) {
      console.error('selectedOption 解析失敗:', raw, e);
      return [];
    }
  }


  formatSelectedOption(raw: any): string {
    const opts = this.parseSelectedOption(raw);
    return opts
      .map(o => `${o.optionName}:${o.value}${o.extraPrice ? `(+${o.extraPrice})` : ''}`)
      .join('、');
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


