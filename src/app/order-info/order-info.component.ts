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
import { forkJoin, of } from 'rxjs';
import { tap, switchMap, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators';



type SelectedOpt = { optionName: string; value: string; extraPrice?: number };

interface UserRes {
  code: number;
  message: string;
  id: string;
  nickname: string;
  avatarUrl: string | null;
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

type OrderVM = {
  id: number;
  hostNickname?: string;
  menuName: string;
  quantity: number;
  subtotal: number;
  parsedOptions?: any;
  userId?: string;
  eventId: number;
};

type OrderGroupVM = {
  key: string;
  nickname: string;
  totalAmount: number;
  totalQty: number;
  orders: OrderVM[];
};


@Component({
  selector: 'app-order-info',
  imports: [
    StepsModule,
    ToastModule,
    FormsModule,
    JsonPipe,
    CommonModule
  ],
  providers: [MessageService],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.scss'
})

export class OrderInfoComponent implements OnInit {
  avatarMap: Record<string, string> = {};
  nicknameMap: Record<string, string> = {};
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
  storeLogo: any;
  hostLogo: any;


  constructor(
    public messageService: MessageService,
    public cart: CartService,
    public auth: AuthService,
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
    // 載入cart傳入開團訂單詳情
    this.route.queryParamMap.subscribe(params => {
      this.mode = (params.get('mode') == 'host') ? 'host' : 'member';
      this.userId = params.get('user_id') || '';
      this.eventsId = Number(params.get('events_id') || 0);
      this.eventName = params.get('eventName') || '';
      this.storeName = params.get('storeName') || '';
      this.latestOrderTime = params.get('latestOrderTime') || '';
      this.totalAmount = params.get('totalAmount') || '';
      this.storeLogo = params.get('storeLogo') || '';
      this.hostLogo = params.get('hostLogo') || '';
      this.loadOrders();
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
          if (res.code == 200) {
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

  expandedGroup: Record<string, boolean> = {}; // 展開狀態（每個人一個）

  get groupedOrders(): OrderGroupVM[] {
    const orders: OrderVM[] = this.res?.orders ?? [];
    const map = new Map<string, OrderGroupVM>();
    for (const o of orders) {
      const nickname = (this.mode == 'host')
        ? (o.hostNickname ?? '（未知）')
        : (this.auth.user?.nickname ?? '（未知）');

      const key = o.userId ?? nickname; // 若你有userId就用它，沒有就用nickname

      if (!map.has(key)) {
        map.set(key, {
          key,
          nickname,
          totalAmount: 0,
          totalQty: 0,
          orders: []
        });
      }

      const g = map.get(key)!;
      g.orders.push(o);
      g.totalAmount += Number(o.subtotal ?? 0);
      g.totalQty += Number(o.quantity ?? 0);
    }

    // 預設：第一個自動展開（你也可以改成全展開）
    const arr = Array.from(map.values());
    if (arr[0] && this.expandedGroup[arr[0].key] == undefined) {
      this.expandedGroup[arr[0].key] = true;
    }
    return arr;
  }

  toggleGroup(key: string) {
    this.expandedGroup[key] = !this.expandedGroup[key];
  }

  isGroupOpen(key: string) {
    return !!this.expandedGroup[key];
  }

  reloadOrders() {
    this.loadOrders();
  }
  private loadOrders() {
    if (!this.eventsId) return;

    const currentUserId =
      this.mode == 'member'
        ? this.auth.user?.id
        : null;

    let memberUserId: string | null = null;

    if (this.mode === 'member') {
      memberUserId =
        this.userId ||
        this.auth.user?.id ||
        null;
    }



    const orders$ = this.cart.getOrdersAll(this.eventsId);

    orders$.pipe(
      tap((x: any) => console.log('[RAW ordersRes]', x)),
      switchMap((ordersRes: any) => {
        const raw: any = ordersRes;

        const listFromHost = Array.isArray(raw.ordersSearchViewList)
          ? raw.ordersSearchViewList.map((o: any) => this.normalizeOrder(o))
          : [];

        const listFromMember = raw.ordersDto
          ? this.flattenOrdersDto(raw.ordersDto)
          : [];

        const orders = listFromHost.length > 0 ? listFromHost : listFromMember;

        let filteredOrders = orders;

        if (this.mode === 'member') {
          // 只保留「跟團者自己的訂單」
          const myUserId =
            this.userId ||
            this.auth.user?.id ||
            orders[0]?.userId;

          if (myUserId) {
            filteredOrders = orders.filter((o: { userId: any; }) => o.userId === myUserId);
          }
        }

        const menuIds: number[] = Array.from(
          new Set(
            filteredOrders
              .map((o: any) => Number(o.menuId))
              .filter((id: any) => Number.isFinite(id))
          )
        );

        if (menuIds.length == 0) {
          return of({ orders: filteredOrders, menuMap: new Map<number, MenuItemDto>() });
        }

        return this.cart.getMenuByMenuId(menuIds).pipe(
          map((menuRes: MenuRes) => {
            const menuMap = new Map<number, MenuItemDto>();
            for (const m of menuRes.menuList ?? []) menuMap.set(m.id, m);
            return { orders: filteredOrders, menuMap };
          })
        );
      }),
      map(({ orders, menuMap }) => {
        const mergedOrders = orders.map((o: any) => ({
          ...o,
          menuName: menuMap.get(o.menuId)?.name ?? `menuId:${o.menuId}`,
        }));
        return { code: 200, message: 'ok', orders: mergedOrders };
      }), switchMap((data: any) => {
        // host 才需要抓全部人的頭像；member 只抓自己也行
        const userIds: string[] = Array.from(
          new Set(
            (data.orders ?? [])
              .map((o: any) => o.userId)
              .filter((id: any): id is string => typeof id == 'string' && id.trim().length > 0)
          )
        );


        if (userIds.length == 0) return of(data);

        // 已抓過的就不要重抓
        const needFetch = userIds.filter(id => !this.avatarMap[id]);
        if (needFetch.length == 0) return of(data);

        return forkJoin(
          needFetch.map(id =>
            this.cart.getUserById(id).pipe(
              catchError(() => of(null))
            )
          )
        ).pipe(
          map((users: (UserRes | null)[]) => {
            for (const u of users) {
              if (u && u.code == 200) {
                this.avatarMap[u.id] = u.avatarUrl ?? '';
                this.nicknameMap[u.id] = u.nickname ?? '';
              }
            }
            return data;
          })
        );

      })
    ).subscribe({
      next: (data: any) => {
        this.res = data;
        this.recalcTotalAmount();
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: '已更新最新訂單',
          showConfirmButton: false,
          timer: 1200,
        });
      },
      error: (err: any) => console.error('API error:', err),
    });
  }

  submitOrder() {
    Swal.fire({
      title: "確定送出訂單?",
      text: "送出訂單後無法取消!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "是的，送出!",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "送出!",
          text: "訂單已送出",
          icon: "success",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "rgb(24, 173, 54)",
          confirmButtonText: "返回首頁",
          cancelButtonText: "返回購物車"
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/gogobuy/home'])
          } else if (result.dismiss == Swal.DismissReason.cancel) {
            this.router.navigate(['/user/cart'])
          }
        })

      }
    });
  }
}



