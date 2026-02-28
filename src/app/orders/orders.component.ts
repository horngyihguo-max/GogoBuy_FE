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
import { OrderTransferService } from '../@service/orderTransfer.service';
import { MessageService, NotifiCategoryEnum, NotifiMesReq } from '../@service/message.service';
import { AuthService } from '../@service/auth.service';

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
  eventStatus?: string;
  hostLogo: any;
  pickLocation: any;
  pickupTime: any;
  unpaidCount: number;
  unpickedCount: number;
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


export interface OrderHistoryDTO {
  orderCode: string;
  eventsId: number;
  eventName: string;
  storeName: string;
  hostName: string;
  createdAt: string;
  eventStatus: string;
  statusLabel: string;
  totalAmount: number;
  personFee: number;
  receiverName: string;
  phone: string;
  items: OrderMenuVo[];
  paymentStatus: string;
  pickupStatus: string;
  pickupTime: string | null;
  eventPickupTime: string | null;
  pickLocation: string | null;
  personalMemo: string | null;
}

export interface OrderHistoryRes {
  code: number;
  message: string;
  orderHistoryList: OrderHistoryDTO[];
}

export interface OrderMenuVo {
  menuId: number;
  quantity: number;
  specName: string;
  menuName: string;
  personalMemo: string;
  subtotal: number;
  selectedOptionList: any[];
}

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
  personFee: number;
  total: number;
  receiverName: string;
  phone: string;
  paymentStatus: string;
  pickupStatus: string;
  pickupTime: Date | null;
  eventPickupTime: Date | null;
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


export class OrdersComponent {
  isLoading = true
  res?: CartRes;
  cartData = signal<CartGroup[]>([]);
  userId: string = '';

  constructor(
    public router: Router,
    private cart: CartService,
    private transfer: OrderTransferService,
    private messageService: MessageService,
    public auth: AuthService,
  ) {
  }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    this.userId = user.id;

    if (!this.userId) { this.isLoading = false; return; }

    this.loadCartData();
    this.fetchHistoryOrders(this.userId);
  }

  loadCartData() {
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId: string = user.id;
    if (!userId) return;

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
                return {
                  ...g,
                  isHost: !!event && event.hostId == userId,
                  eventStatus: event?.eventStatus
                };
              }),
              catchError(() => of({ ...g, isHost: false, eventStatus: 'UNKNOWN' }))
            )
          );

          forkJoin(jobs).subscribe(finalList => {
            this.cartData.set(finalList);
          });
        },
        error: (err: any) => console.error('getCart failed:', err)
      });
  }

  fetchHistoryOrders(userId: string) {
    this.cart.getHistoryOrders(userId).subscribe({
      next: (res: any) => {
        if (res.code === 200 && res.orderHistoryList) {
          const historyList: OrderHistoryDTO[] = res.orderHistoryList;
          const orders = historyList.map(item => {
            return {
              code: item.orderCode,
              storeName: item.storeName || '未知店家',
              createdAt: new Date(item.createdAt),
              statusLabel: item.statusLabel,
              personFee: item.personFee,
              total: item.totalAmount + item.personFee,
              receiverName: item.receiverName,
              phone: item.phone,
              paymentStatus: item.paymentStatus,
              pickupStatus: item.pickupStatus,
              pickupTime: item.pickupTime ? new Date(item.pickupTime) : null,
              eventPickupTime: item.eventPickupTime ? new Date(item.eventPickupTime) : null,
              personalMemo: item.personalMemo,
              items: item.items.map(i => ({
                name: i.menuName,
                qty: i.quantity,
                price: i.quantity > 0 ? (i.subtotal / i.quantity) : 0
              }))
            };
          });
          this.historyOrders.set(orders);
        }
      },
      error: (err: any) => console.error('fetchHistory failed:', err)
    });
  }


  carts = signal<CartSummary[]>([]);

  cartsSorted = computed(() =>
    [...this.carts()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  removeCart(eventsId: number) {
    const cartItem = this.cartData().find(c => c.eventsId === eventsId);
    const eventName = cartItem?.eventName || '團購活動';

    Swal.fire({
      title: "確定刪除整個活動?",
      text: "這將會刪除所有人的訂單，且無法復原！",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "是的，全部刪除!",
      cancelButtonText: "取消"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "移除中...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // 1. 先抓取成員列表
        this.cart.getPersonalOrdersByEventId(eventsId).subscribe({
          next: (res: any) => {
            const members = res.personalOrder || [];
            const membersToNotify = members.filter((m: any) => m.userId !== this.userId);

            // 定義執行刪除的共用邏輯
            const doDelete = () => {
              this.cart.deleteEventPhysically(eventsId).subscribe({
                next: (delRes: any) => {
                  if (delRes.code == 200) {
                    Swal.fire({ title: "刪除!", text: "整個活動已刪除完成並已通知成員.", icon: "success" });
                    this.cartData.update(list => list.filter(item => item.eventsId !== eventsId));
                  } else {
                    Swal.fire("錯誤", delRes.message || "刪除失敗", "error");
                  }
                },
                error: (err: any) => Swal.fire("系統錯誤", "無法刪除活動", "error")
              });
            };

            // 2. 如果有成員，先發送通知
            if (membersToNotify.length > 0) {
              const req: NotifiMesReq = {
                category: NotifiCategoryEnum.SYSTEM,
                title: '活動已取消',
                content: `很抱歉，團長「${this.auth.user?.nickname || '團長'}」已取消了「${eventName}」團購活動。`,
                eventId: eventsId,
                userId: this.userId,
                targetUrl: '/user/orders',
                expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                userNotificationVoList: membersToNotify.map((m: any) => ({
                  userId: m.userId,
                  email: m.userEmail
                }))
              };
              // 確保通知 API 有回應後再刪除，避免 eventId 遺失導致後端無法廣遞
              this.messageService.create(req).subscribe({
                next: () => doDelete(),
                error: () => doDelete() // 就算通知失敗也還是要執行刪除
              });
            } else {
              doDelete();
            }
          },
          error: (err: any) => {
            console.log('取得成員列表失敗或無成員:', err);
            // 發生錯誤或無成員時，直接執行刪除
            this.cart.deleteEventPhysically(eventsId).subscribe({
              next: (delRes: any) => {
                if (delRes.code == 200) {
                  Swal.fire({ title: "刪除!", text: "活動已刪除完成.", icon: "success" });
                  this.cartData.update(list => list.filter(item => item.eventsId !== eventsId));
                } else {
                  Swal.fire("錯誤", delRes.message || "刪除失敗", "error");
                }
              },
              error: (err: any) => Swal.fire("系統錯誤", "無法刪除活動", "error")
            });
          }
        });
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
        this.transfer.latestOrderTime.set(item.latestOrderTime ?? '');
        this.router.navigate(['/user/orders/info'], {
          queryParams: {
            events_id: item.eventsId,
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

  activeOrders: Order[] = [];

  historyOrders = signal<Order[]>([]);

  historyOrdersSorted = computed(() => {
    const list = [...this.historyOrders()];
    const getPriority = (o: Order) => {
      const isPaid = o.paymentStatus === 'CONFIRMED' || o.paymentStatus === 'PAID';
      const isPickedUp = o.pickupStatus === 'PICKED_UP';

      // 優先級 0：未取餐 + 已付款 (最高優先)
      if (!isPickedUp && isPaid) return 0;

      // 優先級 1：未取餐 + 尚未付款
      if (!isPickedUp && !isPaid) return 1;

      // 優先級 2：已取餐 (最下面)
      if (isPickedUp) return 2;

      return 3;
    };

    return list.sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;
      // 同優先級則按建立時間倒序
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  });

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

  get memberCarts() {
    return (this.cartData() ?? []).filter(x => !x.isHost);
  }

  get hostActiveCarts() {
    return (this.cartData() ?? []).filter(x => x.isHost && x.eventStatus !== 'FINISHED');
  }

  get hostActiveManageCarts() {
    return (this.cartData() ?? [])
      .filter(x => x.isHost && x.totalQuantity > 0 && !(x.eventStatus === 'FINISHED' && x.unpaidCount === 0 && x.unpickedCount === 0))
      .sort((a, b) => {
        const timeA = new Date(a.latestOrderTime).getTime() || 0;
        const timeB = new Date(b.latestOrderTime).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.eventsId - a.eventsId;
      });
  }

  get hostCompletedManageCarts() {
    return (this.cartData() ?? [])
      .filter(x => x.isHost && x.totalQuantity > 0 && x.eventStatus === 'FINISHED' && x.unpaidCount === 0 && x.unpickedCount === 0)
      .sort((a, b) => {
        const timeA = new Date(a.latestOrderTime).getTime() || 0;
        const timeB = new Date(b.latestOrderTime).getTime() || 0;
        return timeB - timeA;
      });
  }

  // ==================== 管理中心邏輯 ====================
  manageMembersMap = signal<Record<number, any[]>>({});

  loadManageData(eventsId: number) {
    this.cart.getPersonalOrdersByEventId(eventsId).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          const list = res.personalOrder || [];
          this.manageMembersMap.update(map => ({
            ...map,
            [eventsId]: list
          }));
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  togglePaymentStatus(member: any, eventsId: number) {
    const isPaid = member.paymentStatus === 'CONFIRMED' || member.paymentStatus === 'PAID';
    const nextStatus = isPaid ? 'UNPAID' : 'CONFIRMED';

    const payload = {
      eventsId: eventsId,
      userId: member.userId,
      paymentStatus: nextStatus,
      totalSum: member.totalSum,
      totalWeight: member.totalWeight,
      personFee: member.personFee
    };

    this.cart.updatePersonalOrder(payload).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          member.paymentStatus = nextStatus;
          Swal.fire({
            toast: true,
            position: 'top',
            icon: 'success',
            title: '付款狀態已更新',
            showConfirmButton: false,
            timer: 1500
          });
          // 同步更新歷史訂單 (始終刷新目前使用者的歷史)
          this.fetchHistoryOrders(this.userId);
          this.loadCartData();
        }
      },
      error: (err: any) => {
        console.error(err);
        Swal.fire('更新失敗', '', 'error');
      }
    });
  }

  togglePickupStatus(member: any, eventsId: number) {
    const isPickedUp = member.pickupStatus === 'PICKED_UP';
    const nextStatus = isPickedUp ? 'NOT_PICKED_UP' : 'PICKED_UP';

    const payload = {
      eventsId: eventsId,
      userId: member.userId,
      pickupStatus: nextStatus, // 會同步更新到 orders 表
      paymentStatus: member.paymentStatus,
      totalSum: member.totalSum,
      totalWeight: member.totalWeight,
      personFee: member.personFee
    };

    this.cart.updatePersonalOrder(payload).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          member.pickupStatus = nextStatus;
          Swal.fire({
            toast: true,
            position: 'top',
            icon: 'success',
            title: '取餐狀態已更新',
            showConfirmButton: false,
            timer: 1500
          });
          // 同步更新資訊 (始終刷新目前使用者的歷史)
          this.fetchHistoryOrders(this.userId);
          this.loadCartData();
        }
      },
      error: (err: any) => {
        console.error(err);
        Swal.fire('更新失敗', '', 'error');
      }
    });
  }
  formatSelectedOptionList(list: any[]): string {
    return (list ?? [])
      .map(o => `${o.optionName}:${o.value}${o.extraPrice ? `(+${o.extraPrice})` : ''}`)
      .join('、');
  }

  exportManageCSV(item: CartGroup) {
    this.cart.getOrdersAll(item.eventsId).subscribe({
      next: (res: any) => {
        if (res.code === 200 && res.ordersSearchViewList) {
          const list = res.ordersSearchViewList;
          const rows = [];

          // 1. [美化] 增加頂部活動摘要 (這在 Excel 開啟時會出現在最前幾行)
          rows.push(`"【團購管理明細報表】"`);
          rows.push(`"活動名稱：","${item.eventName}"`);
          rows.push(`"商家：","${item.storeName}"`);
          rows.push(`"全團總計金額：","$${item.totalAmount}"`);
          rows.push(`"匯出時間：","${new Date().toLocaleString()}"`);
          rows.push(''); // 空行

          // 2. [表格表頭]
          const headers = ['成員', '商品名稱', '規格與選項', '單價', '數量', '小計', '個人備註', '領取狀態'];
          rows.push(headers.join(','));
          rows.push('----------------------------------------------------------------------------------------------------');

          // 把資料按使用者 ID 分組
          const userMap = new Map<string, any[]>();
          list.forEach((order: any) => {
            const uid = order.userId || 'unknown';
            if (!userMap.has(uid)) userMap.set(uid, []);
            userMap.get(uid)!.push(order);
          });

          // 3. [分組填充資料]
          let grandTotal = 0;
          userMap.forEach((userOrders) => {
            let userSubtotal = 0;
            const nickname = userOrders[0].hostNickname || '匿名';
            const memo = userOrders[0].personalMemo || '';
            const pickupStatus = userOrders[0].pickupStatus === 'PICKED_UP' ? '【已領取】' : '〔未取〕';

            userOrders.forEach((order, index) => {
              const menuName = `"${order.menuName}"`;
              const options = this.formatSelectedOptionList(order.selectedOptionList);
              const specAndOptions = `"${(order.specName || '') + ' ' + options}"`.trim();
              const unitPrice = order.quantity ? order.subtotal / order.quantity : 0;
              const qty = order.quantity;
              const subtotal = order.subtotal;
              userSubtotal += subtotal;
              grandTotal += subtotal;

              // 格式化每一列資料
              const memberCell = index === 0 ? `"${nickname}"` : '""';
              const memoCell = index === 0 ? `"${memo}"` : '""';
              const pickupCell = index === 0 ? `"${pickupStatus}"` : '""';

              rows.push([memberCell, menuName, specAndOptions, unitPrice, qty, subtotal, memoCell, pickupCell].join(','));
            });

            // [美化] 增加成員小計行
            rows.push([`"${nickname} 結算小計"`, '""', '""', '""', '""', `"${userSubtotal}"`, '""', '""'].join(','));
            rows.push('----------------------------------------------------------------------------------------------------');
          });

          // 4. [結尾] 總計行
          rows.push('');
          rows.push([`"★ 全報表核銷總計"`, '""', '""', '""', '""', `"${grandTotal}"`, '""', '""'].join(','));

          const csvContent = rows.join('\n');
          const BOM = '\uFEFF';
          const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${item.eventName}_管理明細_${new Date().toLocaleDateString()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  notifyMembers(item: CartGroup) {
    Swal.fire({
      title: '發送取貨通知?',
      text: `將會發送網頁通知與 Email 給「${item.eventName}」的所有跟團成員（不含自己）。`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '確定發送',
      cancelButtonText: '取消',
      confirmButtonColor: '#f59e0b'
    }).then((result) => {
      if (result.isConfirmed) {
        // 取得成員列表 (確保拿到最新名單)
        this.cart.getPersonalOrdersByEventId(item.eventsId).subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              const list = res.personalOrder || [];
              // 排除自己 (host)
              const membersToNotify = list.filter((m: any) => m.userId !== this.userId);

              if (membersToNotify.length === 0) {
                Swal.fire('目前沒有其他成員下單', '', 'info');
                return;
              }

              // 這裡假設後端支持 userNotificationVoList 或是根據 eventId 寄送
              // 根據需求描述，我們需要建立一筆 GROUP_BUY 類別的通知
              const req: NotifiMesReq = {
                category: NotifiCategoryEnum.GROUP_BUY,
                title: '取貨通知',
                content: `您參加的團購「${item.eventName}」商品已送達，請儘速找團長取貨！`,
                eventId: item.eventsId,
                userId: this.userId, // 發送者 (團長)
                targetUrl: '/user/orders', // 點擊通知導向哪裡
                expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 天後過期
                userNotificationVoList: membersToNotify.map((m: any) => ({
                  userId: m.userId,
                  email: m.userEmail
                }))
              };

              this.messageService.create(req).subscribe({
                next: (response: any) => {
                  if (response.code === 200) {
                    Swal.fire({
                      icon: 'success',
                      title: '通知已發送',
                      text: `已通知 ${membersToNotify.length} 位成員`,
                      toast: true,
                      position: 'top',
                      showConfirmButton: false,
                      timer: 2000
                    });
                  } else {
                    Swal.fire('發送失敗', response.message, 'error');
                  }
                },
                error: (err: any) => {
                  console.error('Notification failed:', err);
                  Swal.fire('發送失敗', '系統連線錯誤', 'error');
                }
              });
            }
          },
          error: (err: any) => console.error('Load members failed:', err)
        });
      }
    });
  }

  edit(item: CartGroup) {
    this.router.navigate(['/groupbuy-event/group-event'], {
      queryParams: {
        event_id: item.eventsId, // 這裡應該傳實際的 eventsId
      }
    });
    console.log(this.router.url)
  }

  deleteMemberOrder(member: any, eventsId: number, eventName: string) {
    Swal.fire({
      title: '確定要刪除該成員的訂單嗎？',
      text: `將會刪除「${member.userNickname || '匿名成員'}」在「${eventName}」中的所有品項，並於站內發送通知。`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cart.deleteOrderByUserIdAndEventsId(member.userId, eventsId, this.userId).subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              // 發送刪除通知給該成員
              const req: NotifiMesReq = {
                category: NotifiCategoryEnum.GROUP_BUY,
                title: '訂單被團長移除',
                content: `很抱歉，團長「${this.auth.user?.nickname || '團長'}」將您在「${eventName}」中的訂單移除了，如有疑問請連繫團長。`,
                eventId: eventsId,
                userId: this.userId,
                targetUrl: '/user/orders',
                expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                userNotificationVoList: [{
                  userId: member.userId,
                  email: member.userEmail
                }]
              };
              this.messageService.create(req).subscribe();

              Swal.fire({
                icon: 'success',
                title: '已刪除',
                text: '該成員的訂單已成功移除',
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 2000
              });
              this.loadManageData(eventsId);
            } else {
              Swal.fire('刪除失敗', res.message, 'error');
            }
          },
          error: (err: any) => {
            console.error('Delete member order failed:', err);
            Swal.fire('刪除失敗', '系統連線錯誤', 'error');
          }
        });
      }
    });
  }

  editMemberOrder(member: any, eventsId: number) {
    // 導向點餐頁面，但帶入 target_user_id 讓 FollowGroupComponent 知道是修改別人的
    this.router.navigate(['/groupbuy-event/group-follow', eventsId], {
      queryParams: {
        target_user_id: member.userId
      }
    });
  }

}
