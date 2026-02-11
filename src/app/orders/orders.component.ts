//佔位用訂單，沒有實際作用(未來接訂單API要重寫，因為欄位是假的)
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { CartService } from '../@service/cart.service';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import Swal from 'sweetalert2';

interface CartItem {
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
}

interface CartGroup {
  eventsId: number;
  eventName: string | null;
  storeName: string | null;
  storesId: number;
  storeLogo: any;
  totalAmount: number;
  totalQuantity: number;
  latestOrderTime: string;
  status: string | null;
  canModify: boolean;
  items: CartItem[];
  isHost?: boolean;
  hostLogo: any;
}


interface CartRes {
  code: number;
  message: string;
  cartData: CartGroup[];
}

type CartSummary = {
  id: string;
  updatedAt: string;
  storeName: string;
  storeBranch: string;
  itemCount: number;
  total: number;
  img: string;
};


/* PrimeNG <p-tag> 支援的 severity 類型 */
type TagSeverity = 'info' | 'success' | 'warn' | 'danger' | 'primary' | 'contrast';

/* 假資料格式 */
type OrderItem = {
  name: string;
  qty: number;
  price: number;
  note?: string;
};

/* 假資料格式 */
type Order = {
  code: string;
  storeName: string;
  createdAt: Date;
  statusLabel: string;
  total: number;
  receiverName: string;
  phone: string;
  items: OrderItem[];
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    AccordionModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})

/* 假資料 */
export class OrdersComponent {
  isLoading = true
  res?: CartRes;
  cartData = signal<CartGroup[]>([]);
  constructor(
    public router: Router,
    private cart: CartService,
  ) {
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId: string = user.id;

    if (!userId) { this.isLoading = false; return; }

    this.isLoading = true;

    this.cart.getCart(userId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (r: CartRes) => {
          const list = r.cartData ?? [];


          const jobs = list.map(g =>
            this.cart.getEventsByEventsId(g.eventsId).pipe(
              map((ev: any) => {
                const event = ev.groupbuyEvents?.[0];
                return { ...g, isHost: !!event && event.hostId == userId };
              }),
              catchError(() => of({ ...g, isHost: false }))
            )
          );

          forkJoin(jobs).subscribe(finalList => {
            this.cartData.set(finalList);
          });
        },
        error: (err: any) => console.error('getCart failed:', err)
      });
  }

  carts = signal<CartSummary[]>([]);

  cartsSorted = computed(() =>
    [...this.carts()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  removeCart(eventsId: number) {
    Swal.fire({
      title: "確定刪除訂單?",
      text: "刪除後無法復原!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "是的，刪除!",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        {
          this.cart.deleteEventPhysically(eventsId).subscribe({
            next: (res: any) => {
              if (res.code == 200) {
                Swal.fire({
                  title: "刪除!",
                  text: "整個活動已刪除完成.",
                  icon: "success"
                });
                this.cartData.update(list => list.filter(item => item.eventsId !== eventsId));
              } else {
                console.error('delete failed:', res.message);
              }
            },
            error: (err: any) => console.error('delete failed:', err)
          });
        }
      }
    });
  }

  checkout(item: CartGroup) {
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId: string = user.id;
    if (!userId) return;

    this.cart.getEventsByEventsId(item.eventsId).subscribe({
      next: (res: { groupbuyEvents: any[]; }) => {
        const event = res.groupbuyEvents?.[0];
        if (!event) return;

        const mode = (event.hostId == userId) ? 'host' : 'member';

        this.router.navigate(['/user/orders/info'], {
          queryParams: {
            user_id: userId,
            events_id: item.eventsId,
            eventName: item.eventName ?? '',
            storeName: item.storeName ?? '',
            store_id: item.storesId ?? '',
            latestOrderTime: item.latestOrderTime ?? '',
            totalAmount: item.totalAmount ?? '',
            storeLogo: item.storeLogo ?? '',
            hostLogo: item.hostLogo ?? '',
            // 身分判斷結果
            mode, // 'host' | 'member'
          }
        });
      },
      error: (err: any) => console.error(err)
    });
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

  activeOrders: Order[] = [
    {
      code: 'A001',
      storeName: '50嵐',
      createdAt: new Date(),
      statusLabel: '進行中',
      total: 120,
      receiverName: '王小明',
      phone: '0912-345-678',
      items: [
        { name: '珍珠奶茶', qty: 1, price: 60, note: "去冰" },
        { name: '烏龍奶茶', qty: 1, price: 60, note: "" }
      ]
    }
  ];

  historyOrders: Order[] = [
    {
      code: 'H001',
      storeName: '可不可',
      createdAt: new Date(),
      statusLabel: '已完成',
      total: 75,
      receiverName: '王小明',
      phone: '0912-345-678',
      items: [{ name: '熟成紅茶', qty: 1, price: 75 }]
    }
  ];

  // 展開狀態（用 code 當 key）
  activeOpenValues: string[] = [];
  historyOpenValues: string[] = [];

  /* 用來控制狀態標籤的顏色 */
  getStatusSeverity(status: string): 'info' | 'success' | 'danger' | 'warn' | undefined {
    const statusMap: Record<string, 'info' | 'success' | 'danger' | 'warn'> = {
      '進行中': 'info',
      '已完成': 'success',
      '已取消': 'danger'
    };
    return statusMap[status] || 'warn';
  }

}
