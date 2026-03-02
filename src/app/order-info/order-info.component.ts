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
import { OrderTransferService } from '../@service/orderTransfer.service';
import { MessageService as NotifiService, NotifiCategoryEnum, NotifiMesReq } from '../@service/message.service';
import { LinePayService } from '../@service/linepay.service';



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
  personalMemo?: string;
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
  pickLocation = '';
  pickupTime = '';
  latestOrderTime = '';
  userId = '';
  totalAmount = '';
  thresholdAmount = 0;
  eventsId = 0;
  activeIndex: number = 0;
  menuDate: any;
  res: any;
  storeLogo: any;
  hostLogo: any;
  hostId = '';
  hostEmail = '';
  hostNickname = '';


  constructor(
    public messageService: MessageService,
    public cart: CartService,
    public auth: AuthService,
    public router: Router,
    private route: ActivatedRoute,
    public transfer: OrderTransferService,
    private notifiService: NotifiService,
    private linePayService: LinePayService,
  ) { }


  ngOnInit() {
    this.userId = String(localStorage.getItem('user_id') || '');
    this.host = [
      { label: '核對訂單' },
      { label: '確認結算' },
      { label: '付費階段' }
    ];
    this.member = [
      { label: '核對訂單' },
      { label: '確認訂單' }
    ];
    // 載入cart傳入開團訂單詳情
    this.route.queryParamMap.subscribe(params => {
      this.mode = (params.get('mode') == 'host') ? 'host' : 'member';
      this.eventsId = Number(params.get('events_id') || 0);
      this.loadOrders();
      if (this.eventsId) {
        this.loadEventInfo();
      }
    });
  }

  private loadEventInfo() {
    this.cart.getEventsByEventsId(this.eventsId).subscribe({
      next: (res: any) => {
        console.log('event res =', res);

        const event = res.groupbuyEvents?.[0];
        if (!event) return;

        // 取得欄位
        this.latestOrderTime = event.latestOrderTime ?? '';
        this.eventName = event.eventName ?? '';
        this.storeName = event.storeName ?? '';
        this.pickupTime = event.pickupTime ?? '';
        this.pickLocation = event.pickLocation ?? '';
        this.hostId = event.hostId ?? '';
        this.hostEmail = event.hostEmail ?? '';
        this.hostNickname = event.hostNickname ?? '';
        this.thresholdAmount = event.limitation ?? 0;
      },
      error: (err: any) => {
        console.error('getEventsByEventsId 失敗', err);
      }
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
      userEmail: o.email ?? o.userEmail ?? o.user_email ?? '',
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

  clear() {
    localStorage.removeItem('latestOrderTime');
  }

  // 返回購物車
  backtorder() {
    this.router.navigate(['/user/orders']);
    this.clear();
  }
  // 返回繼續購物
  gotoshop() {
    this.router.navigate(['/groupbuy-event/group-follow']);
  }

  // 前往下一個Step
  nextStep() {
    const max = (this.mode == 'host' ? this.host?.length : this.member?.length) ?? 1;
    this.activeIndex = Math.min(this.activeIndex + 1, max - 1);
  }

  // 返回前一個Step
  prevStep() {
    this.activeIndex = Math.max(this.activeIndex - 1, 0);
  }

  // 統一處理主按鈕點擊
  onPrimaryAction() {
    if (this.activeIndex === 0) {
      if (this.mode === 'host' && Number(this.totalAmount) < this.thresholdAmount) {
        Swal.fire({
          icon: 'warning',
          title: '未達門檻金額',
          text: `目前總額 $${this.totalAmount} 低於門檻金額 $${this.thresholdAmount}，無法結算。`,
          confirmButtonText: '確定'
        });
        return;
      }
      this.nextStep();
    } else if (this.activeIndex === 1 && this.mode === 'host') {
      this.submitOrder();
    } else if (this.activeIndex === 2 && this.mode === 'host') {
      this.router.navigate(['/user/orders'], { queryParams: { tab: 'history' } });
    } else {
      this.submitOrder();
    }
  }

  payByLinePay() {
    Swal.fire({
      title: '即將跳轉至 LINE Pay',
      text: `支付金額：NT$ ${this.totalAmount}`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '確定前往',
      cancelButtonText: '取消'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '準備中...',
          didOpen: () => Swal.showLoading()
        });

        const payUserId = (this.mode === 'member') ? (this.userId || this.auth.user?.id) : undefined;

        this.linePayService.requestPayment(this.eventsId, payUserId).subscribe({
          next: (payUrl: string) => {
            if (payUrl && payUrl.startsWith('http')) {
              window.location.href = payUrl;
            } else {
              Swal.fire('支付失敗', '無法取得支付連結', 'error');
            }
          },
          error: (err) => {
            console.error('LinePay Error:', err);
            Swal.fire('系統錯誤', '發送支付請求失敗', 'error');
          }
        });
      }
    });
  }

  // 統一處理返回/次要按鈕點擊
  onSecondaryAction() {
    if (this.activeIndex === 0) {
      this.backtorder();
    } else {
      this.prevStep();
    }
  }

  exportToCSV() {
    const rows = [];

    // 1. [美化] 增加頂部活動摘要
    rows.push(`"【團購訂單核對明細表】"`);
    rows.push(`"活動名稱：","${this.eventName || '管理員團購'}"`);
    rows.push(`"商店：","${this.storeName || '未知商家'}"`);
    rows.push(`"全團結算金額：","$${this.totalAmount}"`);
    rows.push(`"匯出時間：","${new Date().toLocaleString()}"`);
    rows.push(''); // 空行

    // 2. [表格表頭]
    const headers = ['群組/訂購人', '商品名稱', '選項細節', '個人備註', '單價', '數量', '小計'];
    rows.push(headers.join(','));
    rows.push('----------------------------------------------------------------------------------------------------');

    // 3. [填充資料]
    const grouped = this.groupedOrders;
    for (const group of grouped) {
      group.orders.forEach((order, index) => {
        // 只有第一筆顯示頭像/暱稱
        const personCell = index === 0 ? `"${group.nickname}"` : '""';
        const memoCell = index === 0 ? `"${order.personalMemo || ''}"` : '""';

        const itemName = `"${order.menuName}"`;
        const options = `"${this.formatSelectedOptionList(order.parsedOptions)}"`;
        const price = order.quantity ? order.subtotal / order.quantity : 0;
        const qty = order.quantity;
        const subtotal = order.subtotal;

        rows.push([personCell, itemName, options, memoCell, price, qty, subtotal].join(','));
      });

      // 個人小計行
      rows.push([`"${group.nickname} 結算小計"`, '""', '""', '""', '""', `"${group.totalQty}"`, `"${group.totalAmount}"`].join(','));
      rows.push('----------------------------------------------------------------------------------------------------');
    }

    // 4. [結尾總計]
    rows.push('');
    rows.push([`"★ 全報表核銷總計"`, '""', '""', '""', '""', '""', `"${this.totalAmount}"`].join(','));

    // 組合 CSV 字串
    const csvContent = rows.join('\n');

    // 加上 BOM (避免中文亂碼)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 建立 <a> 元素下載檔案
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${this.eventName || '訂單'}_核對明細_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const currentUserId = this.userId || this.auth.user?.id || localStorage.getItem('user_id') || '';
      const actingUserId = this.mode === 'host' ? currentUserId : undefined;

      // 先找出這筆訂單的擁有者，以便通知 (如果操作者是團長且刪除的是別人的)
      const orderToDel = this.res?.orders?.find((o: any) => (o.id ?? o.orderId) === orderId);

      console.log('[DEBUG] removeorder:', { orderId, actingUserId, mode: this.mode });

      this.cart.deleteOrderById(orderId, actingUserId).subscribe({
        next: (res) => {
          if (res.code == 200) {
            // 如果是團長刪除成員的商品，發送通知
            if (this.mode === 'host' && orderToDel && orderToDel.userId !== currentUserId) {
              const req: NotifiMesReq = {
                category: NotifiCategoryEnum.GROUP_BUY,
                title: '訂單品項被移除',
                content: `很抱歉，團長「${this.auth.user?.nickname || '團長'}」將您在「${this.eventName}」中的「${orderToDel.menuName}」移除了。`,
                eventId: this.eventsId,
                userId: currentUserId,
                targetUrl: '/user/orders',
                expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                userNotificationVoList: [{
                  userId: orderToDel.userId,
                  email: orderToDel.userEmail || ''
                }]
              };
              this.notifiService.create(req).subscribe();
            }

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
            console.error('[API Error] deleteOrderById:', res);
            Swal.fire({
              title: "刪除失敗",
              text: res.message ?? "請稍後再試",
              icon: "error"
            });
          }
        },
        error: (err) => {
          console.error('[Network Error] deleteOrderById:', err);
          Swal.fire({
            title: "刪除失敗",
            text: "刪除失敗，請連繫系統開發者或稍後再試",
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
    const orders$ = this.cart.getOrdersAll(this.eventsId);

    orders$.pipe(
      tap((x: any) => console.log('[RAW ordersRes]', x)),
      map((ordersRes: any) => {
        const raw: any = ordersRes;

        const listFromHost = Array.isArray(raw.ordersSearchViewList)
          ? raw.ordersSearchViewList.map((o: any) => this.normalizeOrder(o))
          : [];

        const listFromMember = raw.ordersDto
          ? this.flattenOrdersDto(raw.ordersDto)
          : [];

        let orders = listFromHost.length > 0 ? listFromHost : listFromMember;

        if (this.mode == 'member') {
          const myUserId = this.userId || this.auth.user?.id;
          if (myUserId) {
            orders = orders.filter((o: any) => o.userId == myUserId);
          }
        }

        return { code: 200, message: 'ok', orders: orders };
      }),
      switchMap((data: any) => {
        // 3. 抓取頭像與暱稱 (這部分邏輯保留，因為 getOrdersView 通常不包含 Avatar URL)
        const userIds: string[] = Array.from(
          new Set(
            (data.orders ?? [])
              .map((o: any) => o.userId)
              .filter((id: any): id is string => typeof id == 'string' && id.trim().length > 0)
          )
        );
        if (userIds.length == 0) return of(data);

        const needFetch = userIds.filter(id => !this.avatarMap[id]);
        if (needFetch.length == 0) return of(data);

        return forkJoin(
          needFetch.map(id =>
            this.cart.getUserById(id).pipe(catchError(() => of(null)))
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
    const title = this.mode === 'host' ? "確定確認全團並送出?" : "確定確認個人訂單?";
    const text = this.mode === 'host' ? "確認後該團將結算並關閉，不可再修改內容!" : "確認後您的訂單將轉為已確認狀態!";

    Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "是的，確認!",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        const submitUserId = this.userId || this.auth.user?.id || '';

        // 根據身分呼叫不同 API
        const request$ = this.mode === 'host'
          ? this.cart.hostCloseEvent(this.eventsId, submitUserId)
          : this.cart.confirmPersonalOrder(submitUserId, this.eventsId);

        request$.subscribe({
          next: (res: any) => {
            if (res.code == 200) {
              // --- SSE 通知邏輯 ---
              if (this.mode === 'host') {
                // 團長結單：通知所有成員
                this.cart.getPersonalOrdersByEventId(this.eventsId).subscribe({
                  next: (memberRes: any) => {
                    const members = memberRes.personalOrder || [];
                    const membersToNotify = members.filter((m: any) => m.userId !== this.userId);
                    if (membersToNotify.length > 0) {
                      const req: NotifiMesReq = {
                        category: NotifiCategoryEnum.GROUP_BUY,
                        title: '團購結單通知',
                        content: `您參加的團購「${this.eventName}」已結單！請查看訂單明細並配合團長後續取貨通知。`,
                        eventId: this.eventsId,
                        userId: this.userId,
                        targetUrl: '/user/orders?tab=history',
                        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        userNotificationVoList: membersToNotify.map((m: any) => ({
                          userId: m.userId,
                          email: m.userEmail
                        }))
                      };
                      this.notifiService.create(req).subscribe();
                    }
                  }
                });
              } else {
                // 成員確認訂單：通知團長
                if (this.hostId && this.hostId !== this.userId) {
                  const req: NotifiMesReq = {
                    category: NotifiCategoryEnum.GROUP_BUY,
                    title: '成員訂單確認',
                    content: `成員「${this.auth.user?.nickname || '有人'}」已確認了在「${this.eventName}」中的訂單。`,
                    eventId: this.eventsId,
                    userId: this.userId,
                    targetUrl: `/user/orders/info?events_id=${this.eventsId}&mode=host`,
                    expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    userNotificationVoList: [{
                      userId: this.hostId,
                      email: this.hostEmail
                    }]
                  };
                  this.notifiService.create(req).subscribe();
                }
              }
              // --- SSE 通知邏輯結束 ---

              if (this.mode === 'host') {
                Swal.fire({
                  title: "結算成功!",
                  text: "全團已成功結算，請進行後續付款。",
                  icon: "success",
                  timer: 2000,
                  showConfirmButton: false
                });
                this.nextStep();
              } else {
                Swal.fire({
                  title: "送出!",
                  text: "您的個人訂單已確認",
                  icon: "success",
                  showCancelButton: true,
                  confirmButtonColor: "#3085d6",
                  cancelButtonColor: "rgb(24, 173, 54)",
                  confirmButtonText: "返回首頁",
                  cancelButtonText: "查看訂單"
                }).then((result) => {
                  if (result.isConfirmed) {
                    this.router.navigate(['/gogobuy/home'])
                  } else {
                    this.router.navigate(['/user/orders'], { queryParams: { tab: 'history' } })
                  }
                });
              }
            } else {
              Swal.fire("錯誤", res.message || "作業失敗", "error");
            }
          },
          error: (err: any) => {
            Swal.fire("系統異常", "無法送出確認請求", "error");
          }
        });

      }
    });
  }
}



