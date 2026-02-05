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
import { tap, switchMap, map } from 'rxjs/operators';
import Swal from 'sweetalert2';


type SelectedOpt = { optionName: string; value: string; extraPrice?: number };

interface OrdersResNew {
  code: number;
  message: string;
  ordersDto?: {
    id: number;
    eventsId: number;
    userId: string;
    menuList: Array<{
      menuId: number;
      quantity: number;
      specName?: string;
      selectedOptionList?: SelectedOpt[];
    }>;
    personalMemo?: string;
    orderTime: string;
    pickupStatus: string;
    pickupTime: string | null;
    subtotal: number;
    weight: number;
    deleted: boolean;
  };

  // 如果你後端「host 查全部」是多筆，建議也先兼容：
  ordersDtoList?: OrdersResNew["ordersDto"][];
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


interface OrderLineVM {
  id: number;
  eventsId: number;
  userId: string;
  personalMemo: string;
  orderTime: string;
  pickupStatus: string;
  pickupTime: string | null;
  weight: number;
  deleted: boolean;
  menuId: number;
  quantity: number;
  specName?: string;
  selectedOptionList: SelectedOpt[];
  menuName?: string;
}

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
      this.mode = (params.get('mode') == 'host') ? 'host' : 'member';

      this.userId = params.get('user_id') || '';
      this.eventsId = Number(params.get('events_id') || 0);

      this.eventName = params.get('eventName') || '';
      this.storeName = params.get('storeName') || '';
      this.latestOrderTime = params.get('latestOrderTime') || '';
      this.totalAmount = params.get('totalAmount') || '';

      if (!this.eventsId) return;
      if (this.mode == 'member' && !this.userId) return;

      const orders$ = (this.mode == 'host')
        ? this.cart.getOrdersAll(this.eventsId)
        : this.cart.getOrders(this.userId, this.eventsId);

      orders$.pipe(
        tap((x: any) => console.log('[RAW ordersRes]', this.mode, x)),
        switchMap((ordersRes: any) => {
          const raw: any = ordersRes;

          // ✅ 1) host：已展開（你貼的 getOrdersAll 回來就是這個）
          const listFromHost = Array.isArray(raw.ordersSearchViewList)
            ? raw.ordersSearchViewList.map((o: any) => this.normalizeOrder(o))
            : [];

          // ✅ 2) member：ordersDto.menuList 需要展開
          const listFromMember = raw.ordersDto
            ? this.flattenOrdersDto(raw.ordersDto) // 回傳 OrderDto[]（已展開）
            : [];

          // ✅ 以「有資料的那一種」為準（避免兩者同時存在時混亂）
          const orders = listFromHost.length > 0 ? listFromHost : listFromMember;

          const menuIds: number[] = Array.from(
            new Set(
              orders
                .map((o: any) => Number(o.menuId))
                .filter((id: any) => Number.isFinite(id))
            )
          );

          if (menuIds.length === 0) {
            return of({ orders, menuMap: new Map<number, MenuItemDto>() });
          }

          return this.cart.getMenuByMenuId(menuIds).pipe(
            map((menuRes: MenuRes) => {
              const menuMap = new Map<number, MenuItemDto>();
              for (const m of menuRes.menuList ?? []) menuMap.set(m.id, m);
              return { orders, menuMap };
            })
          );
        }),
        map(({ orders, menuMap }) => {
          const mergedOrders = orders.map((o: { menuId: any; }) => ({
            ...o,
            menuName: menuMap.get(o.menuId)?.name ?? `menuId:${o.menuId}`,
          }));
          // 你原本 this.res 想長得像 {orders: []}，那就保持
          return { code: 200, message: 'ok', orders: mergedOrders };
        })
      ).subscribe({
        next: (data: any) => {
          this.res = data;
          console.log('mode=', this.mode, data.orders?.[0]);
          this.recalcTotalAmount();
        },
        error: (err: any) => console.error('API error:', err),
      });
    });
  }


  private flattenOrdersDto(dto: any): any[] {
    const base = {
      id: dto.id ?? dto.orderId,
      eventsId: dto.eventsId ?? dto.eventId,
      userId: dto.userId ?? dto.user_id ?? '',
      personalMemo: dto.personalMemo ?? dto.personal_memo ?? '',
      orderTime: dto.orderTime ?? dto.order_time,
      pickupStatus: dto.pickupStatus ?? dto.pickup_status,
      pickupTime: dto.pickupTime ?? dto.pickup_time ?? null,
      subtotal: dto.subtotal ?? 0,
      weight: dto.weight ?? 0,
      deleted: dto.deleted ?? dto.is_deleted ?? false,
    };

    const menuList = Array.isArray(dto.menuList) ? dto.menuList : [];
    return menuList.map((m: any) => ({
      ...base,
      menuId: Number(m.menuId ?? m.menu_id),
      quantity: Number(m.quantity ?? 0),
      selectedOptionList: Array.isArray(m.selectedOptionList) ? m.selectedOptionList : [],
      specName: m.specName ?? '',
    }));
  }

  private normalizeOrder(o: any) {
    const list = Array.isArray(o.selectedOptionList) ? o.selectedOptionList : null;
    const rawStr = o.selectedOption ?? o.selected_option;
    const parsedOptions: SelectedOpt[] = list
      ? list
      : this.safeParseSelectedOption(rawStr ?? '[]');

    return {
      id: o.id ?? o.orderId,
      eventsId: o.eventsId ?? o.eventId,
      userId: o.userId ?? o.user_id ?? '',
      menuId: Number(o.menuId ?? o.menu_id),
      quantity: o.quantity ?? 0,
      subtotal: o.subtotal ?? 0,
      orderTime: o.orderTime ?? o.order_time,
      personalMemo: o.personalMemo ?? o.personal_memo ?? '',
      pickupStatus: o.pickupStatus ?? o.pickup_status,
      pickupTime: o.pickupTime ?? o.pickup_time ?? null,
      deleted: o.deleted ?? o.is_deleted ?? false,
      hostNickname: o.hostNickname ?? o.userNickname ?? o.user_nickname ?? null,
      parsedOptions,
      menuName: o.menuName ?? null,
    };
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
    this.router.navigate(['/groupbuy-event/group-follow']);
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


  formatSelectedOptionList(list: SelectedOpt[]): string {
    return (list ?? [])
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

  removeorder(orderId: number) {
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
      if (!result.isConfirmed) return;
      Swal.fire({
        title: "刪除中...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });
      this.cart.deleteOrderById(orderId).subscribe({
        next: (res) => {
          if (res.code === 200) {
            this.res.orders = (this.res.orders ?? []).filter(
              (o: any) => (o.id ?? o.orderId) !== orderId
            );

            this.recalcTotalAmount();

            Swal.fire({
              title: "刪除!",
              text: "訂單已刪除完成.",
              icon: "success"
            });
          } else {
            Swal.fire({
              title: "刪除失敗",
              text: res.message ?? "請稍後再試",
              icon: "error"
            });
          }
        },
        error: (err) => {
          console.error(err);
          Swal.fire({
            title: "刪除失敗",
            text: "刪除失敗，請稍後再試",
            icon: "error"
          });
        }
      });
    });
  }

  private recalcTotalAmount() {
    const sum = (this.res?.orders ?? [])
      .reduce((acc: number, o: any) => acc + Number(o.subtotal ?? 0), 0);
    this.totalAmount = String(sum);
  }


}



