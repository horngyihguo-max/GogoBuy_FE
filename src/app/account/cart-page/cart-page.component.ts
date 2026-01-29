import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { computed, signal } from '@angular/core';

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
  constructor(
    public router: Router,
  ) {

  }

  // carts = signal<CartSummary[]>([]);
  carts = signal<CartSummary[]>([
    {
      id: '01',
      updatedAt: '2026-01-26T10:36:00',
      storeName: '迷客夏',
      storeBranch: '歸仁店',
      itemCount: 5,
      total: 100,
      img: '/Milksha.png',
    },
    {
      id: '02',
      updatedAt: '2026-01-25T21:10:00',
      storeName: '多喝茶',
      storeBranch: '歸仁店',
      itemCount: 1,
      total: 65,
      img: '/多喝茶.jpg',
    }
  ]);

  cartsSorted = computed(() =>
    [...this.carts()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  checkout(id: string) {
    this.router.navigate(['/user/orders/info'])
    console.log('checkout', id);
  }

  removeCart(id: string) {
    this.carts.update(list => list.filter(x => x.id !== id));
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
