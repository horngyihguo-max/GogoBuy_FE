import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { computed, signal } from '@angular/core';
import { CartService } from '../../@service/cart.service';
import Swal from 'sweetalert2';
type SelectedOpt = { optionName: string; value: string; extraPrice?: number };

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
  storeLogo: any;
  totalAmount: number;
  totalQuantity: number;
  latestOrderTime: string;
  status: string | null;
  canModify: boolean;
  items: CartItem[];
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

@Component({
  selector: 'app-cart-page',
  imports: [],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss'
})
export class CartPageComponent {
  res?: CartRes;
  cartData = signal<CartGroup[]>([]);
  constructor(
    public router: Router,
    private cart: CartService,
  ) {
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId = user.id;
    if (!userId) return;

    this.cart.getCart(userId).subscribe({
      next: (r: CartRes) => {
        this.res = r;
        this.cartData.set(r.cartData);
        console.log(this.res);
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
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId: string = user.id;

    if (!userId) return;
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
        Swal.fire({
          title: "刪除!",
          text: "訂單已刪除完成.",
          icon: "success"
        });
        {
          this.cart.deleteOrderByUserIdAndEventsId(userId, eventsId).subscribe({
            next: (res: any) => {
              if (res.code == 200) {
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

    this.router.navigate(['/user/orders/info'], {
      queryParams: {
        user_id: userId,
        events_id: item.eventsId,
        eventName: item.eventName ?? '',
        storeName: item.storeName ?? '',
        latestOrderTime: item.latestOrderTime ?? ''
      }
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

}
