import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
// import { TabViewModule } from 'primeng/tabview';
import { TabsModule } from 'primeng/tabs';
import { PaginatorModule } from 'primeng/paginator';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { CartService } from '../../@service/cart.service';

type TabMode = 'info' | 'order';

type PriceLevel = { name: string; price: number };

type ProductOptionItem = {
  id: number;
  name: string;
  extraPrice: number;
};

type ProductOptionGroup = {
  id: number;
  name: string;
  required: boolean;
  maxSelection: number;
  items: ProductOptionItem[];
};

@Component({
  selector: 'app-follow-group',
  imports: [
    DialogModule,
    ButtonModule,
    CommonModule,
    FormsModule,
    // Drag-drop directives
    // CdkDrag,
    // CdkDropList,
    // CdkDropListGroup,
    AccordionModule,
    TooltipModule,
    // TabViewModule,
    TabsModule,
    PaginatorModule,
  ],
  templateUrl: './follow-group.component.html',
  styleUrl: './follow-group.component.scss',
})
export class FollowGroupComponent implements OnDestroy {
  constructor(
    private auth: AuthService,
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private cart: CartService,
  ) {}

  // =========================
  // 基本狀態
  // =========================
  isLoading = true; // 是否讀取中
  userId = ''; // 用戶Id（未登入就空字串）
  user: any | null = null; // 存用戶資料
  groupId = 0; // 團Id
  storeId = 0; // 店家Id
  openedPanels: string[] = []; // 目前展開的 panel value

  // 團的資料
  group: GroupbuyEvents | null = null;

  // 店家資料(要先解析過)
  store: any = null;

  // 店家狀態顯示用（營業中/休息/打烊/公休）
  openStatusText = '';
  openStatusDot: 'open' | 'closed' = 'closed'; // 用來決定 ●/○ 顏色
  openStatusSubText = ''; // 「將於 XX:XX ...」「明日 XX:XX ...」
  openStatusType: 'OPEN' | 'REST' | 'CLOSED' | 'FORCE_CLOSED' = 'CLOSED';
  // force_closed 額外提示
  isForceClosed = false;

  // ========= 菜單限制 / 推薦 =========
  allowedMenuIds: number[] = []; // tempMenuList 解析後
  recommendMenuIds: number[] = []; // recommendList 解析後

  // ========= 要渲染用的資料 =========
  recommendMenus: any[] = []; // 推薦商品（不重複出現在下面）
  menuGroups: Array<{
    categoryId: number;
    categoryName: string;
    items: any[];
  }> = [];

  // 關掉指定Panel ==================================
  closePanel(value: string) {
    // 過濾掉傳入的 value，達到收起效果
    this.openedPanels = this.openedPanels.filter((v) => v !== value);
  }

  // =========================
  // 詳細資訊 drawer
  // =========================
  openDetail(): void {
    this.detailTab = 'info';
    this.detailVisible = true;
  }
  // 詳細資訊 drawer
  detailVisible = false;
  detailTab: TabMode = 'info';

  // 前往店家 =======================================
  goToStore() {
    this.router.navigate(['/management/store_info', this.storeId]);
  }

  // QR CORD =======================================
  QRCodeVisible = false;
  currentUrl: string = window.location.href;
  currentUrl2: string = window.location.href;

  openShareDialog() {
    // 使用 encodeURIComponent 把網址編碼，這能解決「炸掉」的問題
    this.currentUrl2 = encodeURIComponent(window.location.href);
    this.QRCodeVisible = true;
  }

  showCopyTip: boolean = false;

  copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      // 顯示提示
      this.showCopyTip = true;
      // 2 秒後自動關閉
      setTimeout(() => {
        this.showCopyTip = false;
      }, 2000);
    });
  }

  // =========================
  // 店家卡：顯示圖
  // =========================
  getStoreCover(): string {
    const img = this.store?.image;
    return img ? img : this.defaultStoreCover;
  }
  // 預設圖
  readonly defaultStoreCover = '/Store Default Cover Image2.webp';
  readonly defaultProductCover = '/Default Product Image.webp';

  // =========================
  // 營業狀態計算（修正跨日/凌晨問題）
  // =========================
  buildOpenStatus(): void {
    // force_closed：直接覆蓋顯示
    if (this.isForceClosed) {
      this.openStatusDot = 'closed';
      this.openStatusText = '今日公休';
      this.openStatusSubText = '暫停開團';
      return;
    }

    const hours: any[] = this.store?.operatingHoursVoList || [];
    const now = new Date();

    const getDayNum = (d: Date) => {
      const jsDay = d.getDay(); // 0(日)~6(六)
      return jsDay === 0 ? 7 : jsDay; // 轉成 1~7
    };

    const buildSlots = (dayNum: number) => {
      return hours
        .filter((h) => Number(h.dayOfWeek) === dayNum)
        .map((h) => ({
          start: String(h.startTime || ''),
          end: String(h.endTime || ''),
        }))
        .filter((s) => this.isValidTime(s.start) && this.isValidTime(s.end));
    };

    const todayDayNum = getDayNum(now);

    // 今天的時段
    const todaySlots = buildSlots(todayDayNum);

    // 昨天（用來處理跨日延伸到今天凌晨）
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayDayNum = getDayNum(yesterday);
    const yesterdaySlots = buildSlots(yesterdayDayNum);

    // 今天 intervals（baseDate=now）
    const todayIntervals = todaySlots.map((s) =>
      this.toInterval(now, s.start, s.end),
    );

    // 昨天跨日 intervals（只取 end<=start 的那些，才會延伸到今天）
    // 注意：24H 若用 00:00~00:00 表示，end<=start 也會成立，這裡也會正確覆蓋到今天
    const yesterdayCrossIntervals = yesterdaySlots
      .filter((s) => {
        // 判斷是否跨日：用 toInterval 的邏輯等價條件 end<=start
        // 這裡不用 parse 太複雜，直接借用 setTime 比較最穩
        const st = this.setTime(new Date(yesterday), s.start).getTime();
        const ed = this.setTime(new Date(yesterday), s.end).getTime();
        return ed <= st;
      })
      .map((s) => this.toInterval(yesterday, s.start, s.end));

    // 合併並排序
    const intervals = [...yesterdayCrossIntervals, ...todayIntervals].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

    // 先看現在是否在任何區間內（這一步修掉你 00:30 變休息中的 bug）
    const current = intervals.find((it) => now >= it.start && now < it.end);

    if (current) {
      this.openStatusDot = 'open';
      this.openStatusText = '營業中';
      this.openStatusSubText = `將於 ${this.formatTime(current.end)} 休息`;
      return;
    }

    // 不在區間內 → 找下一段開始（優先找今天接下來的）
    const next = intervals.find((it) => now < it.start);

    if (next) {
      this.openStatusDot = 'closed';
      this.openStatusText = '休息中';
      this.openStatusSubText = `將於 ${this.formatTime(next.start)} 開始營業`;
      return;
    }

    // 今天＆昨跨日都沒有下一段 → 找明天第一段
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDayNum = getDayNum(tomorrow);

    const tomorrowIntervals = buildSlots(tomorrowDayNum)
      .map((s) => this.toInterval(tomorrow, s.start, s.end))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (tomorrowIntervals.length > 0) {
      this.openStatusDot = 'closed';
      this.openStatusText = '已打烊';
      this.openStatusSubText = `明日 ${this.formatTime(tomorrowIntervals[0].start)} 開始營業`;
      return;
    }

    // 明天也沒有
    this.openStatusDot = 'closed';
    this.openStatusText = '已打烊';
    this.openStatusSubText = '近期無營業時段';
  }

  isValidTime(t: string): boolean {
    // 允許 "HH:mm"
    return /^\d{2}:\d{2}$/.test(t);
  }

  toInterval(
    baseDate: Date,
    startStr: string,
    endStr: string,
  ): { start: Date; end: Date } {
    const start = this.setTime(new Date(baseDate), startStr);
    const end = this.setTime(new Date(baseDate), endStr);

    // 跨日：end <= start → end + 1 day
    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }
    return { start, end };
  }

  setTime(d: Date, hhmm: string): Date {
    const [hh, mm] = hhmm.split(':').map((x) => Number(x));
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  formatTime(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // =====================================================
  // 商品 dialog
  // =====================================================
  productDialogVisible = false;
  selectedProduct: any = null;

  // 規格
  priceLevels: PriceLevel[] = [];
  selectedPriceLevel: PriceLevel | null = null;

  // 單選選項（冰塊/糖度...）
  singleOptionGroups: ProductOptionGroup[] = [];
  selectedSingleOptionMap: Record<number, ProductOptionItem> = {}; // groupId -> item

  // 加料
  addonOptions: ProductOptionItem[] = []; // 只用來判斷是否顯示加料區（HTML 用 length）
  availableAddons: ProductOptionItem[] = [];
  selectedAddons: ProductOptionItem[] = [];
  addonMaxSelection = 0; // 限制最多可選幾個（用 group.maxSelection）

  // 數量
  quantity = 1;

  // ====== dialog 顯示用金額 ======
  get displayUnitPrice(): number {
    return this.calcFinalUnitPrice();
  }

  get totalPrice(): number {
    return this.calcFinalUnitPrice() * this.quantity;
  }

  // 取得當前時間
  static getTaiwanNow(): Date {
    const now = new Date();
    const taipeiString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Taipei',
    });
    return new Date(taipeiString);
  }

  ngOnInit(): void {
    scroll(0, 0);
    this.userId = String(localStorage.getItem('user_id') || '');
    this.user = localStorage.getItem('user_info');
    this.groupId = Number(this.route.snapshot.paramMap.get('id') || 0);

    if (!this.groupId) {
      this.toastWarn('錯誤', '找不到團 id');
      this.goBack();
      return;
    }

    this.loadGroupById(this.groupId);
  }

  getPhone() {
    const userDate = JSON.parse(this.user);
    const phone = userDate.phone;
    return phone;
  }

  // 取得既存訂單
  loadExistingOrder(groupId: number, userId: string): void {
    // =========================
    // 正式接 API 時
    // =========================
    const url = `http://localhost:8080/gogobuy/event/getAllOrdersByUserIdAndEventsId?user_id=${userId}&events_id=${groupId}`;
    this.http.getApi(url).subscribe({
      next: (res: any) => {
        const parsed = this.parseGetOrderResponse(res);
        this.handleParsedExistingOrder(parsed);
      },
      error: () => {
        this.toastWarn('讀取失敗', '取得既有訂單失敗');
        this.router.navigate(['/gogobuy/home']);
      },
    });
  }

  // 將後端回傳的「大包」解析成我要的格式
  // 只取：code / message / ordersDto
  private parseGetOrderResponse(res: any): {
    code: number;
    message: string;
    ordersDto: any | null;
  } {
    const code = Number(res?.code ?? 0);
    const message = String(res?.message ?? '');
    // 沒資料
    if (code === 404) {
      return { code, message, ordersDto: null };
    }
    // 有資料：只抓 ordersDto
    const ordersDto = res?.ordersDto ?? null;

    return { code, message, ordersDto };
  }

  private handleParsedExistingOrder(parsed: {
    code: number;
    message: string;
    ordersDto: any | null;
  }): void {
    // =========================
    // 沒資料
    // =========================
    if (parsed.code === 404 || !parsed.ordersDto) {
      this.hasExistingOrder = false;
      this.existingOrderId = null;
      this.orderItems = [];
      this.personalMemo = '';
      console.log('讀取成功，但未有既存訂單');
      // 既存資料不存在 → 快照清掉（避免 !isOrderChanged 判斷怪）
      this.originalOrderSnapshot = null;
      this.isLoading = false;
      return;
    }

    // =========================
    // 有資料：只用 ordersDto
    // =========================
    const dto = parsed.ordersDto;
    this.hasExistingOrder = true;
    this.existingOrderId = dto?.id ?? null;
    this.personalMemo = dto?.personalMemo ?? '';
    this.applyOrderToOrderItems(dto);
    console.log('讀取成功，取得既有訂單');

    // 店家菜單 ready 後，補齊品名/價格/單價
    this.hydrateOrderItemsFromStore();
    // 建立快照：用來判斷「是否有修改」→ 決定送出鈕 disabled
    this.originalOrderSnapshot = this.buildOrderComparableSnapshot();
    this.isLoading = false;
  }

  // 建立既存資料快照
  private buildOrderComparableSnapshot(): string {
    const payload = {
      personalMemo: this.personalMemo || '',
      items: this.orderItems
        .map((it) => ({
          menuId: it.menuId,
          quantity: it.quantity,
          specName: it.specName,
          selectedOptionList: (it.selectedOptionList || []).map((o: any) => ({
            optionName: o.optionName,
            value: o.value,
            extraPrice: o.extraPrice ?? 0,
          })),
        }))
        // 排序，避免順序不同造成誤判
        .sort((a, b) => a.menuId - b.menuId),
    };

    return JSON.stringify(payload);
  }

  // 現在的訂單是否有變更
  get isOrderChanged(): boolean {
    if (!this.originalOrderSnapshot) {
      // 沒有既存訂單 → 只要有點餐就算「有變更」
      return this.orderItems.length > 0 || !!this.personalMemo;
    }

    const currentSnapshot = this.buildOrderComparableSnapshot();
    return currentSnapshot !== this.originalOrderSnapshot;
  }

  // 把 GET 到的 menuList 灌回 orderItems（先放最小資料，價格/品名之後補）
  applyOrderToOrderItems(order: any): void {
    const list = Array.isArray(order?.menuList) ? order.menuList : [];

    this.orderItems = list.map((m: any) => {
      return {
        menuId: Number(m.menuId),
        name: '', // 之後用 menuId 去 store.menuVoList 補
        quantity: Number(m.quantity || 1),

        specName: m?.specName ?? '標準',
        specExtraPrice: 0, // 之後補

        basePrice: 0, // 之後補
        finalUnitPrice: 0, // 之後補（base + spec + options）

        selectedOptionList: Array.isArray(m?.selectedOptionList)
          ? m.selectedOptionList
          : [],
      };
    });
  }

  // =========================
  // 抓團 + 店家資料
  // =========================
  loadGroupById(id: number): void {
    this.isLoading = true;

    // =============================================
    // GROUP（後端上線後使用）
    this.http
      .getApi(
        `http://localhost:8080/gogobuy/event/getEventsByEventsId?id=${id}`,
      )
      .subscribe((res: any) => {
        const g = res?.groupbuyEvents?.[0] as GroupbuyEvents | undefined;
        if (!g) {
          this.toastWarn('錯誤', '找不到團資料');
          this.goBack();
          return;
        } else {
          // 現在時間
          const now = new Date();
          const target = new Date(g.endTime);
          if (now.getTime() > target.getTime()) {
            this.toastWarn('超時', '此團已過期');
            this.router.navigate(['/gogobuy/home']);
            return;
          }
        }
        this.applyGroup(g);
        this.loadStoreById(g.storeId);
        this.loadPopular(g.storeId);
      });
  }

  // 讀取店家資訊
  loadStoreById(id: number): void {
    this.isLoading = true;

    // 後端上線後使用
    this.http
      .getApi(`http://localhost:8080/gogobuy/store/searchId?id=${id}`)
      .subscribe((res: any) => {
        const normalized = this.normalizeStoreResponse(res);
        this.store = normalized;
        this.afterLoaded();
        this.loadExistingOrder(this.groupId, this.userId);
      });
  }

  // 套用團資料：解析 tempMenuList / recommendList + 基本防呆
  applyGroup(g: GroupbuyEvents): void {
    this.group = g;
    this.storeId = Number(g.storeId);

    if (g.deleted === true) {
      this.toastWarn('此團不存在', '此團已被刪除');
      this.goBack();
      return;
    }

    this.allowedMenuIds = this.parseIdList(g.tempMenuList);
    this.recommendMenuIds = this.parseIdList(g.recommendList);
    // allowedMenuIds 空陣列代表「顯示全部」
  }

  // 最後確認條款 Dialog
  openTermsDialog = false;

  // =========================
  // 訂單詳情 Dialog
  // =========================
  orderDetailDialogVisible = false;

  // 修改餐點（編輯模式）
  editingOrderIndex: number | null = null;

  openOrderDetailDialog(): void {
    this.orderDetailDialogVisible = true;
  }

  closeOrderDetailDialog(): void {
    this.orderDetailDialogVisible = false;
    // 不清 personalMemo、不清 orderItems
  }

  // 每筆小計
  getLineSubtotal(it: any): number {
    return Number(it?.finalUnitPrice || 0) * Number(it?.quantity || 0);
  }

  increaseLineQty(index: number): void {
    if (index < 0 || index >= this.orderItems.length) return;
    this.orderItems[index].quantity += 1;
  }

  // -1
  async decreaseLineQty(index: number): Promise<void> {
    if (index < 0 || index >= this.orderItems.length) return;

    const item = this.orderItems[index];

    // 只在「會刪掉一筆」的情況才要確認
    if (item.quantity <= 1) {
      const willRemoveLastLine = this.orderItems.length === 1;

      // 如果這一筆就是最後一筆 → 提示「移除全部」並打 delete API
      if (willRemoveLastLine) {
        const ok = await this.confirmRemoveAllOrders();
        if (!ok) return;

        this.deleteOrderApi();
        return;
      }

      // 否則只是移除單筆
      const ok = await this.confirmRemoveItem(item.name);
      if (!ok) return;

      this.orderItems.splice(index, 1);
      return;
    }

    // 正常減少
    item.quantity -= 1;
  }

  // 移除餐點
  async removeLine(index: number): Promise<void> {
    if (index < 0 || index >= this.orderItems.length) return;

    const item = this.orderItems[index];
    const willRemoveLastLine = this.orderItems.length === 1;

    // 如果刪的是最後一筆 → 改走刪整張訂單
    if (willRemoveLastLine) {
      const ok = await this.confirmRemoveAllOrders();
      if (!ok) return;

      this.deleteOrderApi();
      return;
    }

    // 一般移除單筆
    const ok = await this.confirmRemoveItem(item.name);
    if (!ok) return;

    this.orderItems.splice(index, 1);
  }

  // 刪除整筆訂單（此團此人）
  deleteOrderApi(): void {
    this.cart
      .deleteOrderByUserIdAndEventsId(this.userId, this.groupId)
      .subscribe({
        next: (res: any) => {
          if (res.code == 200) {
            this.toastSuccess('已移除全部訂單', '此團訂單已清除');
            // 關閉訂單詳情 dialog（停留本頁）
            this.orderDetailDialogVisible = false;
            // 刷新本頁狀態（不跳頁）
            this.resetOrderStateAfterDelete();
          } else {
            console.error('delete failed:', res.message);
            this.orderDetailDialogVisible = false;
            this.resetOrderStateAfterDelete();
          }
        },
        error: (err: any) => console.error('delete failed:', err),
      });
  }

  // 刪除後清資料
  resetOrderStateAfterDelete(): void {
    // 清掉前端訂單資料
    this.orderItems = [];
    this.personalMemo = '';
    // 代表此團現在沒有既存訂單
    this.hasExistingOrder = false;
    this.existingOrderId = null;
    this.originalOrderSnapshot = null;
    this.buildMenuGroups();
    this.refreshGroupAmount();
  }

  refreshGroupAmount(): void {
    const url = `http://localhost:8080/gogobuy/event/getEventsByEventsId?id=${this.groupId}`;

    this.http.getApi(url).subscribe({
      next: (res: any) => {
        const g = res?.groupbuyEvents?.[0] as GroupbuyEvents | undefined;
        if (!g) return;

        // 只更新會影響「是否達標」那塊的欄位（避免動到你已解析好的清單）
        if (this.group) {
          this.group.totalOrderAmount = g.totalOrderAmount;
          this.group.limitation = g.limitation;
          this.group.shippingFee = g.shippingFee;
          this.group.splitType = g.splitType;
          this.group.eventStatus = g.eventStatus;
        } else {
          // 保險：如果 group 還沒初始化（通常不會），就整包套用
          this.applyGroup(g);
        }
      },
      error: () => {
        // 刷新失敗不致命，至少不要讓頁面壞掉
        console.warn('refreshGroupAmount failed');
      },
    });
  }

  // 顯示用：選項摘要
  formatOptionSummary(it: any): string {
    const list = Array.isArray(it?.selectedOptionList)
      ? it.selectedOptionList
      : [];
    if (!list.length) return '無';
    return list
      .map(
        (o: any) =>
          `${o.optionName}：${o.value}${o.extraPrice ? `(+${o.extraPrice})` : ''}`,
      )
      .join('、');
  }

  // 用 menuId 找商品（供「修改」帶入）
  findProductByMenuId(menuId: number): any | null {
    const all = (this as any).storeMenus || (this as any).menuList || [];
    const p = all.find((x: any) => Number(x?.id) === Number(menuId));
    return p || null;
  }

  // 點「修改」：開商品 dialog 並帶入原本那筆的選擇
  editLine(index: number): void {
    if (index < 0 || index >= this.orderItems.length) return;

    const it = this.orderItems[index];
    const p = this.findProductByMenuId(Number(it.menuId));

    if (!p) {
      this.toastWarn('無法修改', '找不到該商品的菜單資料，先略過修改功能');
      return;
    }

    this.editingOrderIndex = index;

    // 開 dialog（會 init 規格/選項/數量）
    this.openProductDialog(p);

    // 規格帶入（如果 priceLevels 沒有同名規格，補進去）
    const specName = String(it?.specName || '標準');
    const specExtraPrice = Number(it?.specExtraPrice || 0);

    const found = this.priceLevels.find((lv) => lv.name === specName);
    if (!found) {
      this.priceLevels = [
        { name: specName, price: specExtraPrice },
        ...this.priceLevels,
      ];
    }
    this.selectedPriceLevel = { name: specName, price: specExtraPrice };

    // 數量帶入
    this.quantity = Number(it?.quantity || 1);

    // 單選/加料帶入（用 optionName/value 去匹配群組與項目名稱）
    const selectedOptionList = Array.isArray(it?.selectedOptionList)
      ? it.selectedOptionList
      : [];

    // 單選：用群組 name 比對 optionName
    this.singleOptionGroups.forEach((g) => {
      const match = selectedOptionList.find(
        (o: any) => String(o.optionName) === String(g.name),
      );
      if (!match) {
        if (!g.required) delete this.selectedSingleOptionMap[g.id];
        return;
      }
      const picked = g.items.find(
        (x) => String(x.name) === String(match.value),
      );
      if (picked) this.selectedSingleOptionMap[g.id] = picked;
    });

    // 加料：addToOrder() 存的是 optionName='加料'（或群組名），這裡兩種都嘗試
    this.selectedAddons = [];
    selectedOptionList.forEach((o: any) => {
      const name = String(o.optionName);
      if (name === '加料' || name === String(this.addonGroupName || '')) {
        const picked = this.addonOptions.find(
          (a) => String(a.name) === String(o.value),
        );
        if (picked) this.selectedAddons.push(picked);
      }
    });
  }

  // 原始既存資料對照
  private originalOrderSnapshot: string | null = null;

  // 是否確認最後條款
  isConfirmed = false;

  // 訂單確認的下一步按鈕
  confirmOrder() {
    if (!this.userId) {
      this.toastWarn('請先登入', '');
      this.router.navigate(['/gogobuy/login']);
      return;
    }
    let phone = this.getPhone();
    if (phone === '未提供電話') {
      this.toastWarn('電話號碼尚未填寫', '請先提供電話號碼');
      this.router.navigate(['/user/profile']);
      return;
    }
    if ((this.orderItems?.length || 0) === 0) {
      this.toastWarn('尚未點餐', '請先點餐後再送出');
      return;
    }
    this.openTermsDialog = true;
  }

  // 條款確認 dialog
  onTermsAgree(): void {
    // 使用者按「同意」
    this.openTermsDialog = false;
    this.loading = true;
    this.submitOrder();
  }
  onTermsReject(): void {
    // 使用者按「不同意」
    this.openTermsDialog = false;
  }

  // 送出時 loading
  loading = false;

  // 送出訂單
  submitOrder(): void {
    const eventsId = this.groupId;
    const userId = this.userId;
    const payload = this.buildOrderPostPayload(eventsId, userId);

    // 正式接 API
    const url = 'http://localhost:8080/gogobuy/event/addOrders';

    this.http.postApi<any>(url, payload).subscribe({
      next: (res) => {
        // 送出成功
        this.loading = false;
        this.toastSuccess('送出成功', '訂單已送給團長');
        this.router.navigate(['/user/orders']);
      },
      error: (err) => {
        console.error('addOrders error:', err);
        this.loading = false;
        // 送出失敗
        this.toastWarn('送出失敗', '請稍後再試');
      },
    });
  }

  category: any[] = [
    { name: '團購代購', value: 'slow' },
    { name: '外送', value: 'fast' },
  ];
  getCategoryName(value: string): string {
    const item = this.category.find((c) => c.value === value);
    return item ? item.name : value;
  }

  isFast(category: string) {
    let c = this.getCategoryName(category);
    if (c === '外送') {
      return true;
    } else {
      return false;
    }
  }

  // 地址帶入GoogleMap ==========================================================
  getMap(address: string | undefined) {
    if (!address) return '#';
    const gmap = 'https://www.google.com/maps/search/?api=1&query=';
    let mapUrl = gmap + encodeURIComponent(address);
    return mapUrl;
  }

  // =========================
  // 讀取完成後：防呆 + 建立畫面要用的資料
  // =========================
  afterLoaded(): void {
    if (!this.store) {
      this.toastWarn('錯誤', '找不到店家資料');
      this.goBack();
      return;
    }

    if (this.store.deleted === true) {
      this.toastWarn('店家不存在', '此店家已不存在');
      this.goBack();
      return;
    }

    this.buildOpenStatus();
    this.buildMenuGroups();
  }

  // =========================
  // 菜單：篩選 + 推薦 + 分組
  // =========================
  buildMenuGroups(): void {
    if (!this.store) return;

    const allMenus: any[] = Array.isArray(this.store.menuVoList)
      ? this.store.menuVoList
      : [];

    const categories: any[] = Array.isArray(this.store.menuCategoriesVoList)
      ? this.store.menuCategoriesVoList
      : [];

    const allowedSet =
      this.allowedMenuIds.length > 0 ? new Set(this.allowedMenuIds) : null;

    const allowedMenus = allMenus.filter((m) => {
      if (!m) return false;
      if (allowedSet && !allowedSet.has(Number(m.id))) return false;
      return true;
    });

    const recSet =
      this.recommendMenuIds.length > 0 ? new Set(this.recommendMenuIds) : null;

    this.recommendMenus = recSet
      ? allowedMenus.filter((m) => recSet.has(Number(m.id)))
      : [];

    const recommendIdSet = new Set(
      this.recommendMenus.map((m) => Number(m.id)),
    );
    const remainingMenus = allowedMenus.filter(
      (m) => !recommendIdSet.has(Number(m.id)),
    );

    const catNameMap = new Map<number, string>();
    categories.forEach((c) => {
      catNameMap.set(Number(c.categoryId), String(c.name || '未分類'));
    });

    const map = new Map<number, any[]>();
    remainingMenus.forEach((m) => {
      const cid = Number(m.categoryId || 0);
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(m);
    });

    this.menuGroups = Array.from(map.entries()).map(([categoryId, items]) => ({
      categoryId,
      categoryName: catNameMap.get(categoryId) || '未分類',
      items,
    }));

    this.isLoading = false;
  }

  // 既存訂單補齊：用 menuId 去店家 menuVoList 找品名/價格，並重算單價
  hydrateOrderItemsFromStore(): void {
    if (!this.store) return;

    const allMenus: any[] = Array.isArray(this.store.menuVoList)
      ? this.store.menuVoList
      : [];

    if (!allMenus.length || !this.orderItems?.length) return;

    const getSpecExtra = (product: any, specName: string): number => {
      const categoryId = Number(product?.categoryId || 0);

      const levels = this.getPriceLevelsByCategoryId
        ? this.getPriceLevelsByCategoryId(categoryId)
        : [];

      const found = Array.isArray(levels)
        ? levels.find((lv: any) => String(lv?.name) === String(specName))
        : null;

      return Number(found?.price ?? 0);
    };

    const getOptionExtra = (selectedOptionList: any[]): number => {
      if (!Array.isArray(selectedOptionList)) return 0;
      return selectedOptionList.reduce(
        (sum, o) => sum + Number(o?.extraPrice ?? 0),
        0,
      );
    };

    //用 map 回填（畫面一定更新）
    this.orderItems = this.orderItems.map((it) => {
      const product = allMenus.find(
        (p: any) => Number(p?.id) === Number(it.menuId),
      );

      // 找不到商品（店家刪菜單/限制不含這個 menuId）就先維持原狀
      if (!product) return it;

      const base = Number(product?.basePrice ?? 0);
      const specExtra = getSpecExtra(product, it.specName || '標準');
      const optExtra = getOptionExtra(it.selectedOptionList);

      return {
        ...it,
        name: String(product?.name ?? ''),
        basePrice: base,
        specExtraPrice: specExtra,
        finalUnitPrice: base + specExtra + optExtra,
      };
    });
  }

  // =========================
  // 規格（priceLevel）處理：一定要有預設「標準 +0」
  // =========================
  getPriceLevelsByCategoryId(categoryId: number): PriceLevel[] {
    if (!this.store) return [];
    const cats = Array.isArray(this.store.menuCategoriesVoList)
      ? this.store.menuCategoriesVoList
      : [];

    const cat = cats.find(
      (c: any) => Number(c.categoryId) === Number(categoryId),
    );
    const levelsRaw = Array.isArray(cat?.priceLevel) ? cat.priceLevel : [];

    if (!levelsRaw.length) {
      return [{ name: '標準', price: 0 }];
    }

    const levels = levelsRaw.map((lv: any) => ({
      name: String(lv?.name ?? ''),
      price: Number(lv?.price ?? 0),
    }));

    const hasZero = levels.some((lv: any) => Number(lv.price) === 0);
    if (!hasZero) return [{ name: '標準', price: 0 }, ...levels];

    return levels;
  }

  getDefaultPriceLevel(categoryId: number): PriceLevel {
    const levels = this.getPriceLevelsByCategoryId(categoryId);
    const zero = levels.find((lv) => Number(lv.price) === 0);
    return zero || levels[0] || { name: '標準', price: 0 };
  }

  // ====== 訂單（先最小可行，後面做加入訂單再補）======
  cartTotal = 0;

  // 商品卡：封面圖
  getProductImage(p: any): string {
    const img = p?.image;
    if (!img) return this.defaultProductCover;

    // 如果看起來是 http(s) 直接回傳
    if (
      typeof img === 'string' &&
      (img.startsWith('http://') || img.startsWith('https://'))
    ) {
      return img;
    }

    // 如果是 base64 包 url，先嘗試 decode
    try {
      const decoded = atob(String(img));
      if (decoded.startsWith('http://') || decoded.startsWith('https://'))
        return decoded;
    } catch {}

    return this.defaultProductCover;
  }

  isSoldOut(p: any): boolean {
    if (!p) return false;
    if (p.soldOut === true) return true;
    if (p.available === false) return true;
    return false;
  }

  // =========================
  // 訂單暫存
  // =========================
  existingOrderId: any = null; // 回傳id，可能 number / array / object（先吃得下）
  hasExistingOrder = false; // 方便 UI 或邏輯判斷
  personalMemo = ''; // 備註

  orderItems: Array<{
    menuId: number;
    name: string;
    quantity: number;

    specName: string;
    specExtraPrice: number;

    basePrice: number;
    finalUnitPrice: number;

    // 用 orderPost 的格式概念存（optionName / value / extraPrice）
    selectedOptionList: Array<{
      optionName: string;
      value: string;
      extraPrice?: number;
    }>;
  }> = [];

  // 右下角總金額
  get orderSubtotal(): number {
    return this.orderItems.reduce(
      (sum, it) =>
        sum + Number(it.finalUnitPrice || 0) * Number(it.quantity || 0),
      0,
    );
  }

  // 判斷這個商品「點 + 要不要開 dialog」
  productNeedsDialog(product: any): boolean {
    if (!product) return false;

    const cid = Number(product?.categoryId || 0);

    // 規格：只有 1 個（通常就是標準+0）就不算需要 dialog
    const levels = this.getPriceLevelsByCategoryId(cid);
    const hasMultipleSpecs = (levels?.length || 0) > 1;

    // 選項：用 unusual 找得到 groupIds 才算
    const groupIds = this.extractGroupIdsFromUnusual(product?.unusual);
    const hasOptions = (groupIds?.length || 0) > 0;

    return hasMultipleSpecs || hasOptions;
  }

  // 只處理「不需要 dialog 的商品」：直接 +1（標準 + 無選項）
  quickAdd(product: any): void {
    if (!product) return;

    const key = this.makeOrderKey({
      menuId: Number(product.id),
      specName: '標準',
      selectedOptionList: [],
    });

    const idx = this.orderItems.findIndex((x) => this.makeOrderKey(x) === key);

    if (idx >= 0) {
      this.orderItems[idx].quantity += 1;
    } else {
      const base = Number(product?.basePrice ?? 0);
      this.orderItems.push({
        menuId: Number(product.id),
        name: String(product?.name || ''),
        quantity: 1,

        specName: '標準',
        specExtraPrice: 0,

        basePrice: base,
        finalUnitPrice: base,

        selectedOptionList: [],
      });
    }
  }

  // 卡片上的「+」：能快加就快加；要選就開 dialog
  onPlusClick(product: any): void {
    if (!this.userId) {
      this.toastWarn('請先登入', '');
      this.router.navigate(['/gogobuy/login']);
      return;
    }
    let phone = this.getPhone();
    if (phone === '未提供電話') {
      this.toastWarn('電話號碼尚未填寫', '請先提供電話號碼');
      this.router.navigate(['/user/profile']);
      return;
    }
    if (!this.productNeedsDialog(product)) {
      this.quickAdd(product);
      return;
    }
    this.openProductDialog(product);
  }

  // 卡片上的「-」：只針對「快加商品」直減（有規格/選項的先不做卡片直減，避免規格混在一起）
  onMinusClick(product: any): void {
    if (!this.userId) {
      this.toastWarn('請先登入', '');
      this.router.navigate(['/gogobuy/login']);
      return;
    }
    let phone = this.getPhone();
    if (phone === '未提供電話') {
      this.toastWarn('電話號碼尚未填寫', '請先提供電話號碼');
      this.router.navigate(['/user/profile']);
      return;
    }
    if (!product) return;

    if (this.productNeedsDialog(product)) {
      // 這裡先不做（不然會遇到同一商品不同規格/選項要扣哪一筆）
      return;
    }

    const key = this.makeOrderKey({
      menuId: Number(product.id),
      specName: '標準',
      selectedOptionList: [],
    });

    const idx = this.orderItems.findIndex((x) => this.makeOrderKey(x) === key);
    if (idx < 0) return;

    this.orderItems[idx].quantity -= 1;
    if (this.orderItems[idx].quantity <= 0) this.orderItems.splice(idx, 1);
  }

  getQuickQty(product: any): number {
    if (!product) return 0;
    if (this.productNeedsDialog(product)) return 0;

    const key = this.makeOrderKey({
      menuId: Number(product.id),
      specName: '標準',
      selectedOptionList: [],
    });

    const found = this.orderItems.find((x) => this.makeOrderKey(x) === key);
    return Number(found?.quantity || 0);
  }

  makeOrderKey(x: {
    menuId: number;
    specName: string;
    selectedOptionList: Array<{
      optionName: string;
      value: string;
      extraPrice?: number;
    }>;
  }): string {
    const opts = (x.selectedOptionList || [])
      .map((o) => `${o.optionName}:${o.value}:${Number(o.extraPrice || 0)}`)
      .sort()
      .join('|');

    return `${Number(x.menuId)}__${x.specName || ''}__${opts}`;
  }

  // =====================================================
  // dialog
  // =====================================================

  // 在菜單卡片上點擊商品時呼叫它
  openProductDialog(product: any): void {
    if (!this.userId) {
      this.toastWarn('請先登入', '');
      this.router.navigate(['/gogobuy/login']);
      return;
    }
    let phone = this.getPhone();
    if (phone === '未提供電話') {
      this.toastWarn('電話號碼尚未填寫', '請先提供電話號碼');
      this.router.navigate(['/user/profile']);
      return;
    }
    if (!product) return;

    this.selectedProduct = product;

    // 1) 規格：一定要有預設（標準 +0）
    const cid = Number(product.categoryId || 0);
    this.priceLevels = this.getPriceLevelsByCategoryId(cid);

    // 預設：優先挑 price=0，沒有就用 getDefaultPriceLevel（它也會兜底）
    this.selectedPriceLevel = this.getDefaultPriceLevel(cid);

    // 2) 選項：只看 unusual 的 id
    this.initOptionsByProduct(product);

    // 3) 數量預設 1
    this.quantity = 1;

    // 4) 打開 dialog
    this.productDialogVisible = true;
  }

  closeProductDialog(): void {
    this.productDialogVisible = false;
    this.selectedProduct = null;

    this.priceLevels = [];
    this.selectedPriceLevel = null;

    this.singleOptionGroups = [];
    this.selectedSingleOptionMap = {};

    this.addonOptions = [];
    this.availableAddons = [];
    this.selectedAddons = [];
    this.addonMaxSelection = 0;

    this.quantity = 1;
    this.productDialogVisible = false;
    this.editingOrderIndex = null;
  }

  selectPriceLevel(lv: PriceLevel): void {
    this.selectedPriceLevel = lv;
  }

  changeQty(delta: number): void {
    const next = this.quantity + delta;
    if (next < 1) return;
    if (next > 99) return;
    this.quantity = next;
  }

  // 單選（最多1個）
  // - required: true  => 不能取消（一定要有一個）
  // - required: false => 點同一個可取消
  selectSingleOption(group: ProductOptionGroup, item: ProductOptionItem): void {
    const picked = this.selectedSingleOptionMap[group.id];

    const isSame = !!picked && Number(picked.id) === Number(item.id);

    // 可選的單選：點同一個就取消
    if (isSame && !group.required) {
      delete this.selectedSingleOptionMap[group.id];
      return;
    }

    // 其他情況：照常選取
    this.selectedSingleOptionMap[group.id] = item;
  }

  isOptionSelected(
    group: ProductOptionGroup,
    item: ProductOptionItem,
  ): boolean {
    const picked = this.selectedSingleOptionMap[group.id];
    return !!picked && Number(picked.id) === Number(item.id);
  }

  // 加料 drag-drop（同一個 handler，左右兩邊都會打進來）
  onAddonDrop(event: CdkDragDrop<ProductOptionItem[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      return;
    }

    // 想丟進「已選」：要判斷 maxSelection
    const toSelected = event.container.data === this.selectedAddons;
    if (toSelected && this.addonMaxSelection > 0) {
      if (this.selectedAddons.length >= this.addonMaxSelection) {
        this.toastWarn(
          '已達上限',
          `最多只能選 ${this.addonMaxSelection} 個加料`,
        );
        return;
      }
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
  }

  removeAddon(item: ProductOptionItem): void {
    // 從已選移回可選
    const idx = this.selectedAddons.findIndex(
      (x) => Number(x.id) === Number(item.id),
    );
    if (idx >= 0) {
      const [removed] = this.selectedAddons.splice(idx, 1);
      this.availableAddons.push(removed);
    }
  }

  isAddonSelected(item: ProductOptionItem): boolean {
    return this.selectedAddons.some((x) => Number(x.id) === Number(item.id));
  }

  toggleAddon(item: ProductOptionItem): void {
    if (!item) return;

    // 已選 → 取消
    if (this.isAddonSelected(item)) {
      this.selectedAddons = this.selectedAddons.filter(
        (x) => Number(x.id) !== Number(item.id),
      );
      return;
    }

    // 未選 → 檢查上限
    if (
      this.addonMaxSelection > 0 &&
      this.selectedAddons.length >= this.addonMaxSelection
    ) {
      this.toastWarn('已達上限', `最多只能選 ${this.addonMaxSelection} 個`);
      return;
    }

    this.selectedAddons = [...this.selectedAddons, item];
  }

  // 計算「單價」（base + spec + options）
  calcFinalUnitPrice(): number {
    if (!this.selectedProduct) return 0;

    const base = Number(this.selectedProduct?.basePrice ?? 0);

    const specExtra = Number(this.selectedPriceLevel?.price ?? 0);

    const singleExtra = Object.values(this.selectedSingleOptionMap).reduce(
      (sum, opt) => sum + Number(opt?.extraPrice ?? 0),
      0,
    );

    const addonExtra = this.selectedAddons.reduce(
      (sum, opt) => sum + Number(opt?.extraPrice ?? 0),
      0,
    );

    return base + specExtra + singleExtra + addonExtra;
  }

  // 加入訂單
  addToOrder(): void {
    if (!this.selectedProduct) return;

    // required 單選如果沒選到（理論上 init 已幫必選預選第一個）
    const requiredNotPicked = this.singleOptionGroups.some(
      (g) => g.required && !this.selectedSingleOptionMap[g.id],
    );
    if (requiredNotPicked) {
      this.toastWarn('尚未完成', '有必選項目尚未選擇');
      return;
    }

    const base = Number(this.selectedProduct?.basePrice ?? 0);
    const specName = String(this.selectedPriceLevel?.name || '標準');
    const specExtraPrice = Number(this.selectedPriceLevel?.price ?? 0);
    const finalUnitPrice = this.calcFinalUnitPrice();

    // 組 optionList（用 orderPost 範本的概念）
    const selectedOptionList: Array<{
      optionName: string;
      value: string;
      extraPrice?: number;
    }> = [];

    // 單選（糖度/冰塊...）
    this.singleOptionGroups.forEach((g) => {
      const picked = this.selectedSingleOptionMap[g.id];
      if (picked) {
        selectedOptionList.push({
          optionName: g.name,
          value: picked.name,
          extraPrice: Number(picked.extraPrice || 0) || undefined,
        });
      }
    });

    // 加料（先用現成的 selectedAddons）
    if (this.selectedAddons.length) {
      this.selectedAddons.forEach((a) => {
        selectedOptionList.push({
          optionName: '加料',
          value: a.name,
          extraPrice: Number(a.extraPrice || 0) || undefined,
        });
      });
    }

    const key = this.makeOrderKey({
      menuId: Number(this.selectedProduct.id),
      specName,
      selectedOptionList,
    });

    const idx = this.orderItems.findIndex((x) => this.makeOrderKey(x) === key);

    const newItem = {
      menuId: Number(this.selectedProduct.id),
      name: String(this.selectedProduct?.name || ''),
      quantity: this.quantity,

      specName,
      specExtraPrice,

      basePrice: base,
      finalUnitPrice,

      selectedOptionList,
    };

    // 編輯模式：先更新原本 index，再看要不要合併
    if (this.editingOrderIndex !== null) {
      const editIdx = this.editingOrderIndex;

      // 先把原本那筆改成新的
      this.orderItems[editIdx] = newItem as any;

      // 如果改完後跟其他筆 key 一樣，就合併（避免重複）
      const targetKey = this.makeOrderKey(newItem as any);
      const dupIdx = this.orderItems.findIndex(
        (x, i) => i !== editIdx && this.makeOrderKey(x as any) === targetKey,
      );

      if (dupIdx >= 0) {
        this.orderItems[dupIdx].quantity += this.orderItems[editIdx].quantity;
        this.orderItems.splice(editIdx, 1);
      }

      this.editingOrderIndex = null;
      this.toastSuccess('已更新', `${this.selectedProduct?.name || ''}`);
      this.closeProductDialog();
      return;
    }

    // 非編輯：原本加入/合併邏輯
    if (idx >= 0) {
      this.orderItems[idx].quantity += this.quantity;
    } else {
      this.orderItems.push(newItem as any);
    }

    this.toastSuccess(
      '已加入',
      `${this.selectedProduct?.name || ''} x${this.quantity}`,
    );
    this.closeProductDialog();
  }

  // 紀錄訂單是否被更動過
  isDirty = false;

  // 初始化選項：用 product.unusual 的 key 當作「要顯示的 groupId」
  private initOptionsByProduct(product: any): void {
    const allGroups: ProductOptionGroup[] = this.getOptionGroupsFromStore();
    const groupIds = this.extractGroupIdsFromUnusual(product?.unusual);

    const usedGroups: ProductOptionGroup[] = groupIds.length
      ? allGroups.filter((g) => groupIds.includes(Number(g.id)))
      : [];

    // 拆成：單選群組、加料群組
    const singleGroups: ProductOptionGroup[] = [];
    let addonGroup: ProductOptionGroup | null = null;

    usedGroups.forEach((g: ProductOptionGroup) => {
      const maxSel = Number(g.maxSelection ?? 1);

      // maxSelection > 1 → 當作加料群組
      if (maxSel > 1) {
        if (!addonGroup) addonGroup = g; // 多個就先取第一個，避免畫面炸裂
        return;
      }

      singleGroups.push(g);
    });

    // 單選
    this.singleOptionGroups = singleGroups;
    this.selectedSingleOptionMap = {};

    // required 的單選：預設選第一個（避免必選但沒選）
    this.singleOptionGroups.forEach((g) => {
      const first = g.items?.[0];
      if (g.required && first) this.selectedSingleOptionMap[g.id] = first;
    });

    // 加料
    const ag = addonGroup as ProductOptionGroup | null;

    if (ag && ag.items.length > 0) {
      this.addonGroupName = ag.name;
      this.addonRequired = !!ag.required;

      this.addonMaxSelection = Number(ag.maxSelection ?? 0);

      this.addonOptions = ag.items;
      this.availableAddons = [...ag.items];
      this.selectedAddons = [];
    } else {
      this.addonGroupName = '';
      this.addonRequired = false;

      this.addonMaxSelection = 0;
      this.addonOptions = [];
      this.availableAddons = [];
      this.selectedAddons = [];
    }
  }

  private getOptionGroupsFromStore(): ProductOptionGroup[] {
    const raw: any[] = Array.isArray(this.store?.productOptionGroupsVoList)
      ? this.store.productOptionGroupsVoList
      : [];

    return raw.map((g: any) => ({
      id: Number(g?.id),
      name: String(g?.name ?? ''),
      required: !!g?.required,
      maxSelection: Number(g?.maxSelection ?? 1),
      items: Array.isArray(g?.items)
        ? g.items.map((it: any) => ({
            id: Number(it?.id),
            name: String(it?.name ?? ''),
            extraPrice: Number(it?.extraPrice ?? 0),
          }))
        : [],
    }));
  }

  addonGroupName = '';
  addonRequired = false;

  private extractGroupIdsFromUnusual(unusual: any): number[] {
    if (!unusual) return [];

    // -------------------------
    // 舊格式：{ '150': 'true', '151': 'true' }
    // -------------------------
    if (!Array.isArray(unusual) && typeof unusual === 'object') {
      return Object.keys(unusual)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n) && n > 0);
    }

    // -------------------------
    // 新格式：[{ '150': 'true' }, { '151': 'true' }]
    // -------------------------
    if (Array.isArray(unusual)) {
      return unusual
        .flatMap((obj) =>
          typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
        )
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n) && n > 0);
    }

    return [];
  }

  // =========================
  // 小工具
  // =========================
  toastWarn(title: string, text: string): void {
    Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#7F1D1D',
      didOpen: () => {
        const c = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }

  toastSuccess(title: string, text: string): void {
    Swal.fire({
      icon: 'success',
      title,
      text,
      timer: 2000, // 稍微延長到 2秒，對手機用戶比較友善
      toast: true, // 開啟 Toast 模式
      position: 'top-end', // 在手機上會自動適配
      showConfirmButton: false,
      timerProgressBar: true, // 加上進度條，讓用戶知道它什麼時候會消失
      didOpen: (toast) => {
        toast.style.zIndex = '20000';
        // 滑鼠移入或手指觸碰時停止計時，避免還沒看完就消失
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });
  }

  // 刪除個別餐點
  async confirmRemoveItem(itemName?: string): Promise<boolean> {
    const result = await Swal.fire({
      title: '確定要移除餐點嗎？',
      text: itemName
        ? `「${itemName}」將會從訂單中移除`
        : '此餐點將會從訂單中移除',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確定移除',
      cancelButtonText: '取消',
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: '#7f1d1d',
      didOpen: () => {
        const container = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (container) container.style.zIndex = '20000';
      },
    });
    return result.isConfirmed;
  }

  // 刪整個訂單
  async confirmRemoveAllOrders(): Promise<boolean> {
    const result = await Swal.fire({
      title: '確定要移除全部嗎？',
      text: '這會刪除此團你所有已建立的訂單資料（無法復原）。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確定全部移除',
      cancelButtonText: '取消',
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: '#7f1d1d',
      didOpen: () => {
        const c = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });

    return result.isConfirmed;
  }
  // =================================================

  toHHmm(timeStr: any): string {
    if (!timeStr) return '';
    const s = String(timeStr);
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    return '';
  }

  parseIdList(raw: any): number[] {
    if (!raw) return [];
    const s = String(raw).trim();
    if (!s) return [];
    const cleaned = s.replace(/^\[/, '').replace(/\]$/, '');
    return cleaned
      .split(',')
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  goBack(): void {
    window.history.back();
  }

  // 解析收到的店家 Response
  normalizeStoreResponse(res: any): any {
    const base = res?.storeList?.[0] ?? null;
    if (!base) return null;

    const operatingHoursVoList = (res?.operatingHoursVoList || [])
      .map((h: any) => ({
        dayOfWeek: Number(h.week),
        startTime: this.toHHmm(h.openTime),
        endTime: this.toHHmm(h.closeTime),
        closed: !!h.closed,
      }))
      .filter((h: any) => !h.closed);

    const feeDescriptionVoList = (res?.feeDescriptionVoList || []).map(
      (f: any) => ({
        distance: Number(f.km),
        fee: Number(f.fee),
      }),
    );

    const menuCategoriesVoList = (res?.menuCategoriesVoList || []).map(
      (c: any) => ({
        categoryId: Number(c.id),
        name: String(c.name || '未分類'),
        priceLevel: c.priceLevel || [],
      }),
    );

    const menuVoList = (res?.menuVoList || []).map((m: any) => ({
      ...m,
      categoryId: Number(m.categoryId),
    }));

    const productOptionGroupsVoList = res?.productOptionGroupsVoList || [];

    return {
      ...base,
      operatingHoursVoList,
      feeDescriptionVoList,
      menuCategoriesVoList,
      menuVoList,
      productOptionGroupsVoList,
    };
  }

  // 這邊是防止 dialog 開啟但畫面可滾 ----------------------------
  disableScroll() {
    const scrollY = window.scrollY;
    const body = document.body;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    // 設定 CSS variable
    document.documentElement.style.setProperty(
      '--scrollbar-offset',
      `${scrollbarWidth}px`,
    );

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflowY = 'hidden';
  }

  enableScroll() {
    const body = document.body;
    const scrollY = body.style.top;

    // 清除 CSS variable
    document.documentElement.style.setProperty('--scrollbar-offset', '0px');

    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflowY = '';

    window.scrollTo(0, -parseInt(scrollY || '0'));
  }

  ngOnDestroy(): void {
    this.enableScroll();
  }

  // 處理營業時間 ==============================================
  getGroupedOperatingHours(): Array<{
    dayLabel: string;
    times: string[];
  }> {
    const list = this.store?.operatingHoursVoList || [];
    if (!Array.isArray(list)) return [];

    const map = new Map<number, string[]>();

    list.forEach((h: any) => {
      const day = Number(h.dayOfWeek);
      if (!map.has(day)) map.set(day, []);

      map.get(day)!.push(`${h.startTime} - ${h.endTime}`);
    });

    // 依週一～週日排序
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, times]) => ({
        dayLabel: this.getWeekdayLabel(day),
        times,
      }));
  }

  getWeekdayLabel(day: number): string {
    const map = ['一', '二', '三', '四', '五', '六', '日'];
    return map[day - 1] ? `週${map[day - 1]}` : `週?`;
  }

  // 轉換成直覺時間 ===================================================
  formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);

    // 取得年月日
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // 取得時分
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    // 判斷上午/下午
    const period = hours >= 12 ? '下午' : '上午';

    // 轉換成 12 小時制
    if (hours > 12) {
      hours = hours - 12;
    } else if (hours === 0) {
      hours = 12;
    }

    return `${year}年${month}月${day}日 ${period}${hours}:${minutes}`;
  }

  // 畫面美化/標籤 ==================================================
  detailTabValue = 'store';

  // 是否達標
  get isReached(): boolean {
    const total = Number(this.group?.totalOrderAmount ?? 0);
    const limit = Number(this.group?.limitation ?? 0);
    if (limit <= 0) return true; // 避免 limitation = 0 時除以 0
    return total >= limit;
  }

  // 還差多少（最低 0）
  get remainingToReach(): number {
    const total = Number(this.group?.totalOrderAmount ?? 0);
    const limit = Number(this.group?.limitation ?? 0);
    return Math.max(0, limit - total);
  }

  // 進度條百分比（0~100）
  get reachPercent(): number {
    const total = Number(this.group?.totalOrderAmount ?? 0);
    const limit = Number(this.group?.limitation ?? 0);
    if (limit <= 0) return 100;
    const p = (total / limit) * 100;
    return Math.min(100, Math.max(0, Math.round(p)));
  }

  // 建構POST資料
  buildOrderPostPayload(eventsId: number, userId: string): any {
    return {
      eventsId,
      userId,
      menuList: this.orderItems.map((it) => ({
        menuId: it.menuId,
        quantity: it.quantity,
        specName: it.specName ?? null,
        menuName: it.name,
        basePrice: it.basePrice,
        selectedOptionList: it.selectedOptionList ?? [],
      })),
      personalMemo: this.personalMemo || '',
      weight: 0.1,
    };
  }

  // unusual 新格式應對方法
  private normalizeUnusual(unusual: any): number[] {
    if (!unusual) return [];

    // 舊格式：{ '150': 'true', '151': 'true' }
    if (!Array.isArray(unusual) && typeof unusual === 'object') {
      return Object.keys(unusual)
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n));
    }

    // 新格式：[{ '150': 'true' }, { '151': 'true' }]
    if (Array.isArray(unusual)) {
      return unusual
        .flatMap((obj) =>
          typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
        )
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n));
    }

    return [];
  }

  popular: any[] = [];
  // 取得熱門餐點
  loadPopular(storeId: number) {
    this.http
      .getApi(
        `http://localhost:8080/gogobuy/salesStats/top10/${storeId}?type=MONTHLY`,
      )
      .subscribe({
        next: (res: any) => {
          console.log(res);
          if (res?.code === 200) {
            const pop = res.salesDetailList || [];
            if (pop && pop.length > 0) {
              // map只會取key值不重複的
              this.popular = Array.from(
                new Map(pop.map((item: any) => [item.menuId, item])).values(),
              ).slice(0, 3); // 取最多3個但少於也不會報錯
            }
            console.log(this.popular);
            this.isLoading = false;
          }
        },
        error: () => {
          console.log('熱門產品取得失敗');
        },
      });
  }
  // 判斷是不是熱門商品
  isPopular(menuId: number) {
    return this.popular.some((i) => i.menuId === menuId);
  }
}

// 團的資料的interface
export interface GroupbuyEvents {
  eventId: number; // ○
  hostId: string; // ○
  storeId: number; // ○
  eventName: string; // ○
  eventStatus: 'OPEN' | 'LOCKED' | 'FINISHED'; // ○
  endTime: string; // ○
  pickupTime: string; // ○
  pickLocation: string; // ○
  totalOrderAmount: number; // ○
  shippingFee: number; // ○
  splitType: 'EQUAL' | 'WEIGHT'; // ○
  announcement: string; // ○
  eventType: string; // ○
  tempMenuList: string; // ○
  recommendList: string; // ○
  recommendDescription: string; // ○
  limitation: number; // ○
  deleted: boolean; // ○
  hostNickname?: string; // ○
  hostAvatar?: string; // ○
  storeCategory?: 'fast' | 'slow'; // ○
}
