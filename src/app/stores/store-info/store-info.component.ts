import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { TabViewModule } from 'primeng/tabview';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

type TabMode = 'info' | 'order';

@Component({
  selector: 'app-store-info',
  imports: [
    DialogModule,
    CommonModule,
    TabsModule,
    PaginatorModule,
    TabViewModule,
    TooltipModule,
    Toast,
  ],
  providers: [MessageService],
  templateUrl: './store-info.component.html',
  styleUrl: './store-info.component.scss',
})
export class StoreInfoComponent implements OnInit {
  // =========================
  // 狀態
  // =========================
  isLoading = true;
  isGroupOpening = false;

  userId = ''; // 沒登入就 ""
  user: any | null = null; // 存用戶資料
  storeId = 0;
  event: any | null = null; // 存團資料

  // 店家資料（從 API 或假資料來）
  store: any = null;

  // 店家狀態顯示用（營業中/休息/打烊/公休）
  openStatusText = '';
  openStatusDot: 'open' | 'closed' = 'closed'; // 用來決定 ●/○ 顏色
  openStatusSubText = ''; // 「將於 XX:XX ...」「明日 XX:XX ...」

  // force_closed 額外提示
  isForceClosed = false;

  // 是否全部售完
  isAllSoldOut = false;

  // 詳細資訊 drawer
  detailVisible = false;
  detailTab: TabMode = 'info';

  // 商品詳情 dialog
  productVisible = false;
  selectedProduct: any = null;

  // 正在開團 dialog
  eventListVisible = false;
  eventTab: any = 'event';

  // 菜單分組結果
  menuGroups: Array<{
    categoryId: number;
    categoryName: string;
    items: any[];
  }> = [];

  // 預設圖
  readonly defaultStoreCover = '/Store Default Cover Image2.webp';
  readonly defaultProductCover = '/Default Product Image.webp';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpService,
    private auth: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    // userId（測試塞假id）
    // this.userId = this.auth.user?.id || '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa';
    this.userId = String(localStorage.getItem('user_id'));
    this.user = localStorage.getItem('user_info');
    // 刷新用戶資料
    this.auth.refreshUser();
    this.updateLocalFavoriteList();
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.favoriteIds = user.favoriteStore || [];
      }
    });

    // 取路由 id
    const idStr = this.route.snapshot.paramMap.get('id');
    this.storeId = Number(idStr || 0);

    if (!this.storeId) {
      this.toastWarn('錯誤', '店家 id 不正確');
      this.goBack();
      return;
    }

    // 載入資料
    this.loadStoreById(this.storeId);
    this.isEventOpen(this.storeId);
  }

  // 放收藏店家陣列
  favoriteIds: number[] = [];

  // 更新同步收藏店家陣列
  private updateLocalFavoriteList() {
    const user = JSON.parse(this.user || '{}');
    this.favoriteIds = user.favoriteStore || [];
  }

  // 收藏的店家
  isFavorite(storeId: number) {
    return this.favoriteIds.includes(storeId);
  }

  // 收藏店家
  toggleFavorite(storeId: number) {
    // --- 樂觀更新 (Optimistic UI) ---
    // 不等 API 回傳，先直接在畫面上改掉顏色
    if (this.isFavorite(storeId)) {
      this.favoriteIds = this.favoriteIds.filter((id) => id !== storeId);
    } else {
      this.favoriteIds = [...this.favoriteIds, storeId];
    }
    const urlWithParams = `http://localhost:8080/gogobuy/updateFavoriteStore?id=${this.userId}&storesList=${storeId}`;
    this.http.postApi(urlWithParams, {}).subscribe({
      next: (res: any) => {
        if (res?.code === 200) {
          this.toastSuccess('成功', '收藏狀態已更新');
          this.auth.refreshUser(); // 後端同步
        } else {
          // 如果後端失敗，再把畫面改回來（回滾）
          this.updateLocalFavoriteList();
          this.toastWarn('失敗', '同步失敗');
        }
      },
      error: () => {
        this.updateLocalFavoriteList(); // 網路失敗也回滾
      },
    });
  }

  // 點擊收藏店家
  handleFavoriteClick(id: number) {
    console.log('用戶ID: ' + this.userId);
    if (!this.userId || this.userId === 'null') {
      this.toastWarn('提醒', '請先登入才能收藏店家');
      return;
    } else {
      this.toggleFavorite(id);
    }
  }

  // =========================
  // 小工具：Toast (右上角)
  // =========================
  private toastSuccess(summary: string, detail: string): void {
    this.messageService.add({ severity: 'success', summary, detail });
  }
  private toastInfo(summary: string, detail: string): void {
    this.messageService.add({ severity: 'info', summary, detail });
  }

  // 判斷是否有團正在開
  isEventOpen(storeId: number) {
    this.http
      .getApi(
        `http://localhost:8080/gogobuy/event/getGroupbuyEventByStoresId?stores_id=${storeId}`,
      )
      .subscribe((res: any) => {
        this.event = res.groupbuyEvents.filter((o: any) => o.status === 'OPEN');
        console.log('團: ' + JSON.stringify(this.event, null, 2));
        if (this.event.length > 0) {
          this.isGroupOpening = true;
        } else {
          this.isGroupOpening = false;
        }
      });
  }
  // 打開現在開團 dialog
  openEventList(): void {
    this.eventListVisible = true;
  }

  // 團截止時間計算機
  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // 取得月、日
    const month = date.getMonth() + 1; // 0-11，所以要 +1
    const day = date.getDate();
    // 取得時、分
    let hours = date.getHours();
    const minutes = date.getMinutes();
    // 判斷上午/下午
    const period = hours >= 12 ? '下午' : '上午';
    // 轉換成 12 小時制
    if (hours > 12) {
      hours = hours - 12;
    } else if (hours === 0) {
      hours = 12;
    }
    return `${month}月${day}日${period} ${hours}點${minutes.toString().padStart(2, '0')}分`;
  }

  goToFollow(evendId: number) {
    this.router.navigate(['groupbuy-event/group-follow', evendId]);
    this.enableScroll();
  }

  // 是否全部售完
  allSoldOut() {
    const items: any[] = this.store?.menuVoList || [];
    if (items.length === 0) {
      this.isAllSoldOut = true;
    } else {
      const so = items.every((i) => i.available === false);
      if (so) {
        console.log('已全數售完或是無商品');
        this.isAllSoldOut = true;
      }
    }
  }

  category: any[] = [
    { name: '團購代購', value: 'slow' },
    { name: '外送', value: 'fast' },
  ];

  getCategoryName(value: string): string {
    const item = this.category.find((c) => c.value === value);
    return item ? item.name : value;
  }

  // =========================
  // 讀資料
  // =========================
  loadStoreById(id: number): void {
    this.isLoading = true;

    // 後端上線後使用
    this.http
      .getApi(`http://localhost:8080/gogobuy/store/searchId?id=${id}`)
      .subscribe((res: any) => {
        // console.log(res);
        const normalized = this.normalizeStoreResponse(res);
        this.store = normalized;
        // console.log('店家資訊: ' + JSON.stringify(this.store, null, 2));
        // 判斷是否全部售完
        this.allSoldOut();
        // console.log(JSON.stringify(this.store));
        this.afterLoaded();
      });
  }

  afterLoaded(): void {
    // 1) 防呆：沒資料
    if (!this.store) {
      this.toastWarn('錯誤', '找不到店家資料');
      // 延遲再跳轉
      setTimeout(() => {
        this.goBack();
      }, 2000);
      return;
    }

    // 2) deleted 擋掉
    if (this.store.deleted === true) {
      this.toastWarn('店家不存在', '此店家已不存在');
      // 延遲再跳轉
      setTimeout(() => {
        this.goBack();
      }, 2000);
      return;
    }

    // 3) publish 權限：publish=false 且不是建立者 → 擋掉
    if (this.store.publish === false) {
      const createdBy = this.store.createdBy;
      if (!this.userId || createdBy !== this.userId) {
        console.log('此為不公開店家');
        this.toastWarn('不公開店家', '此為不公開店家');
        // 延遲再跳轉
        setTimeout(() => {
          this.goBack();
        }, 2000);
        return;
      }
    }

    // 4) force_closed：可看但禁用開團
    this.isForceClosed = this.store.force_closed === true;

    // 5) 建立營業狀態字串
    this.buildOpenStatus();

    // 6) 建菜單分組（分類 → 商品）
    this.buildMenuGroups();

    this.isLoading = false;
  }

  // =========================
  // 進入時回上一頁
  // =========================
  goBack(): void {
    // 也可以換成 router.navigate 到列表頁
    window.history.back();
  }

  // =========================
  // 店家卡：顯示圖
  // =========================
  getStoreCover(): string {
    const img = this.store?.image;
    return img ? img : this.defaultStoreCover;
  }

  // =========================
  // 營業狀態計算
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

    // 取今天星期（資料是 1~7：週一=1…週日=7）
    const jsDay = now.getDay(); // 0(日)~6(六)
    const dayNum = jsDay === 0 ? 7 : jsDay; // 轉成 1~7

    // 找今天的時段
    const todaySlots = hours
      .filter((h) => Number(h.dayOfWeek) === dayNum)
      .map((h) => ({
        start: String(h.startTime || ''),
        end: String(h.endTime || ''),
      }))
      .filter((s) => this.isValidTime(s.start) && this.isValidTime(s.end));

    // 如果今天完全沒有營業時間
    if (todaySlots.length === 0) {
      this.openStatusDot = 'closed';
      this.openStatusText = '休息中';
      this.openStatusSubText = '今日無營業時段';
      return;
    }

    // 轉成區間（處理跨日）
    const intervals = todaySlots
      .map((s) => this.toInterval(now, s.start, s.end))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // now 是否在任何區間內
    const current = intervals.find((it) => now >= it.start && now < it.end);

    if (current) {
      // 營業中 → 顯示將於 XX:XX 結束
      this.openStatusDot = 'open';
      this.openStatusText = '營業中';
      this.openStatusSubText = `將於 ${this.formatTime(current.end)} 休息`;
      return;
    }

    // 不在區間內 → 找下一段開始
    const next = intervals.find((it) => now < it.start);

    if (next) {
      this.openStatusDot = 'closed';
      this.openStatusText = '休息中';
      this.openStatusSubText = `將於 ${this.formatTime(next.start)} 開始營業`;
      return;
    }

    // 今天沒有下一段 → 已打烊，找明天第一段
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowJsDay = tomorrow.getDay();
    const tomorrowDayNum = tomorrowJsDay === 0 ? 7 : tomorrowJsDay;

    const tomorrowSlots = hours
      .filter((h) => Number(h.dayOfWeek) === tomorrowDayNum)
      .map((h) => ({
        start: String(h.startTime || ''),
        end: String(h.endTime || ''),
      }))
      .filter((s) => this.isValidTime(s.start) && this.isValidTime(s.end))
      .map((s) => this.toInterval(tomorrow, s.start, s.end))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (tomorrowSlots.length > 0) {
      this.openStatusDot = 'closed';
      this.openStatusText = '已打烊';
      this.openStatusSubText = `明日 ${this.formatTime(tomorrowSlots[0].start)} 開始營業`;
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

  // =========================
  // 詳細資訊 drawer
  // =========================
  openDetail(): void {
    this.detailTab = 'info';
    this.detailVisible = true;
  }

  // =========================
  // 按鈕：編輯 / 開團
  // =========================
  goEdit(): void {
    const userDate = JSON.parse(this.user);
    const role = userDate.role;
    console.log('當前的角色是: ' + role);
    if (!this.userId) return;
    if (!this.user || role === 'user') {
      this.toastWarn('無法修改', '只有管理員可以修改店家資訊');
      return;
    }
    // if (this.isGroupOpening) {
    //   this.toastWarn(
    //     '重要警示',
    //     '目前此店家正在開團，若進行修改，將強制終止所有正在進行的團購',
    //   );
    // }
    this.router.navigate(['/management/store_upsert', this.storeId]);
  }

  // 開團按鈕目前只有鎖 未登入 || 今日公休 || fast的休息時間
  goStartGroup(): void {
    if (!this.userId) return;
    if (this.isForceClosed) {
      this.toastWarn('今日公休', '今日暫停開團');
      return;
    }
    // 如果外送fast今日休息就擋，slow都不擋
    if (this.store?.category === 'fast') {
      if (this.openStatusDot === 'closed') {
        this.toastWarn('休息中', '目前暫停開團');
        return;
      }
    }
    this.router.navigate(['/groupbuy-event/group-event', this.storeId]);
  }

  // =========================
  // 菜單：分類 → 商品
  // =========================
  buildMenuGroups(): void {
    const categories: any[] = this.store?.menuCategoriesVoList || [];
    const items: any[] = this.store?.menuVoList || [];

    // 做一個 map：categoryId -> name
    const catMap = new Map<number, string>();
    categories.forEach((c) => {
      catMap.set(Number(c.categoryId), String(c.name || '未分類'));
    });

    // 分組
    const groupMap = new Map<number, any[]>();
    items.forEach((m) => {
      const cid = Number(m.categoryId || 0);
      if (!groupMap.has(cid)) groupMap.set(cid, []);
      groupMap.get(cid)!.push(m);
    });

    // 依 categories 的順序輸出（沒有分類的放最後）
    const used = new Set<number>();
    const result: Array<{
      categoryId: number;
      categoryName: string;
      items: any[];
    }> = [];

    categories.forEach((c) => {
      const cid = Number(c.categoryId);
      used.add(cid);
      result.push({
        categoryId: cid,
        categoryName: String(c.name || '未分類'),
        items: (groupMap.get(cid) || []).slice(),
      });
    });

    // 沒在 categories 的 categoryId
    groupMap.forEach((list, cid) => {
      if (used.has(cid)) return;
      result.push({
        categoryId: cid,
        categoryName: catMap.get(cid) || '未分類',
        items: list.slice(),
      });
    });

    // 讓每組 items 以 sortOrder 排一下（沒有就保持原序）
    result.forEach((g) => {
      g.items.sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
      );
    });

    this.menuGroups = result;
  }

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

  // 是否售完（unusual.is_sold_out 是字串）
  isSoldOut(p: any): boolean {
    const u = p?.unusual || {};
    const s = String(u?.is_sold_out ?? '')
      .toLowerCase()
      .trim();
    const soldOutByUnusual =
      s === 'true' || s === '1' || s === 'yes' || s === 'y';
    const available = p?.available;
    const soldOutByAvailable = available === false;
    return soldOutByUnusual || soldOutByAvailable;
  }

  // 打開商品詳情（純瀏覽）
  selectedPriceLevel: any = null;
  // groupId -> itemId[]
  selectedOptionIdsByGroup: Record<number, number[]> = {};

  openProduct(p: any): void {
    this.selectedProduct = p;

    // 清空上一個商品的選擇狀態
    this.selectedOptionIdsByGroup = {};

    // 規格（priceLevel）預設值
    const levels = this.getPriceLevelsByCategoryId(p?.categoryId);
    this.selectedPriceLevel =
      levels.find((x: any) => String(x?.name || '') === '標準') ||
      levels.find((x: any) => Number(x?.price) === 0) ||
      null;

    // 依 unusual 白名單初始化可選群組
    this.initSelectedOptions();

    this.productVisible = true;
  }

  initSelectedOptions(): void {
    const groups = this.getOptionGroupsForDisplay();
    groups.forEach((g: any) => {
      const gid = Number(g?.id);
      if (Number.isNaN(gid)) return;
      this.selectedOptionIdsByGroup[gid] = [];
    });
  }

  toggleOptionItem(group: any, item: any): void {
    const gid = Number(group?.id);
    const iid = Number(item?.id);
    if (Number.isNaN(gid) || Number.isNaN(iid)) return;

    const maxSel = Number(group?.maxSelection || 1);
    const isSingle = maxSel === 1;

    const current = (this.selectedOptionIdsByGroup[gid] || []).slice();
    const idx = current.findIndex((x) => Number(x) === iid);

    // 已選 -> 取消
    if (idx >= 0) {
      current.splice(idx, 1);
      this.selectedOptionIdsByGroup[gid] = current;
      return;
    }

    // 未選 -> 加入
    if (isSingle) {
      this.selectedOptionIdsByGroup[gid] = [iid];
      return;
    }

    if (current.length >= maxSel) return;
    current.push(iid);
    this.selectedOptionIdsByGroup[gid] = current;
  }

  isOptionItemSelected(groupId: any, itemId: any): boolean {
    const gid = Number(groupId);
    const iid = Number(itemId);
    if (Number.isNaN(gid) || Number.isNaN(iid)) return false;

    return (this.selectedOptionIdsByGroup[gid] || []).some(
      (x) => Number(x) === iid,
    );
  }

  getSelectedCount(groupId: any): number {
    const gid = Number(groupId);
    if (Number.isNaN(gid)) return 0;
    return (this.selectedOptionIdsByGroup[gid] || []).length;
  }

  getSelectedOptionsExtraPrice(): number {
    const groups = this.getOptionGroupsForDisplay();

    let sum = 0;
    groups.forEach((g: any) => {
      const gid = Number(g?.id);
      if (Number.isNaN(gid)) return;

      const selectedIds = this.selectedOptionIdsByGroup[gid] || [];
      const items = Array.isArray(g?.items) ? g.items : [];

      selectedIds.forEach((id) => {
        const hit = items.find((x: any) => Number(x?.id) === Number(id));
        if (!hit) return;
        sum += Number(hit?.extraPrice || 0);
      });
    });

    return sum;
  }

  getPriceLevelsByCategoryId(categoryId: any): any[] {
    const cid = Number(categoryId);
    const list = this.store?.menuCategoriesVoList || [];
    if (!Array.isArray(list)) return [];

    const cat = list.find((c: any) => Number(c?.categoryId) === cid);
    const levels = cat?.priceLevel || [];
    return Array.isArray(levels) ? levels : [];
  }

  selectPriceLevel(level: any): void {
    this.selectedPriceLevel = level;
  }

  // 顯示用：basePrice + 規格加價 + 已選選項加價
  getSelectedProductPrice(): number {
    const base = Number(this.selectedProduct?.basePrice || 0);
    const extra = Number(this.selectedPriceLevel?.price || 0);
    const optionExtra = this.getSelectedOptionsExtraPrice();
    return base + extra + optionExtra;
  }

  // unusual 轉成 key/value 清單（不可預測欄位）
  getUnusualEntries(p: any): Array<{ key: string; value: any }> {
    const u = p?.unusual;
    if (!u || typeof u !== 'object') return [];
    return Object.keys(u).map((k) => ({ key: k, value: u[k] }));
  }

  // =========================
  // 小工具：提示
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

  // 解析收到的Response ===============================================
  normalizeStoreResponse(res: any): any {
    const base = res?.storeList?.[0] ?? null;
    if (!base) return null;

    // 統一欄位命名：把後端 week/openTime/closeTime 轉成前端用
    const operatingHoursVoList = (res?.operatingHoursVoList || [])
      .map((h: any) => ({
        dayOfWeek: Number(h.week), // 後端叫 week
        startTime: this.toHHmm(h.openTime), // 後端是 "18:00:00"
        endTime: this.toHHmm(h.closeTime), // 後端是 "02:00:00"
        closed: !!h.closed,
      }))
      // 如果後端有 closed=true 的要排除
      .filter((h: any) => !h.closed);

    // 運費：用 feeDescriptionVoList
    const feeDescriptionVoList = (res?.feeDescriptionVoList || []).map(
      (f: any) => ({
        distance: Number(f.km), // 我們頁面用 distance
        fee: Number(f.fee),
      }),
    );

    // 分類：後端用 id，這裡統一叫 categoryId
    const menuCategoriesVoList = (res?.menuCategoriesVoList || []).map(
      (c: any) => ({
        categoryId: Number(c.id),
        name: String(c.name || '未分類'),
        priceLevel: c.priceLevel || [],
      }),
    );

    // 菜單：categoryId / unusual 物件
    const menuVoList = (res?.menuVoList || []).map((m: any) => ({
      ...m,
      categoryId: Number(m.categoryId),
      // sortOrder 你這包沒給就先不動
    }));

    // 商品選項群組：這頁只是瀏覽，先留著，之後商品詳情 dialog 可以用
    const productOptionGroupsVoList = res?.productOptionGroupsVoList || [];

    // 最終組合成「這頁想用的 store」
    return {
      ...base,
      operatingHoursVoList,
      feeDescriptionVoList,
      menuCategoriesVoList,
      menuVoList,
      productOptionGroupsVoList,
    };
  }

  toHHmm(timeStr: any): string {
    // "18:00:00" -> "18:00"
    if (!timeStr) return '';
    const s = String(timeStr);
    // 允許 "HH:mm:ss" 或 "HH:mm"
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    return '';
  }

  // 畫面美化/標籤 ==================================================
  detailTabIndex = 0;

  getOptionGroupsForDisplay(): any[] {
    const all = this.store?.productOptionGroupsVoList || [];
    if (!Array.isArray(all)) return [];

    const u = this.selectedProduct?.unusual;
    if (!u) return [];

    let allowIds: number[] = [];

    // =========================
    // 舊格式：object { '150': 'true' }
    // =========================
    if (!Array.isArray(u) && typeof u === 'object') {
      allowIds = Object.keys(u)
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n));
    }

    // =========================
    // 新格式：array [{ '150': 'true' }, { '151': 'true' }]
    // =========================
    if (Array.isArray(u)) {
      allowIds = u
        .flatMap((obj) =>
          typeof obj === 'object' && obj !== null ? Object.keys(obj) : [],
        )
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n));
    }

    if (!allowIds.length) return [];

    return all.filter((g: any) => allowIds.includes(Number(g?.id)));
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

  // 這邊是防止 dialog 開啟但畫面可滾 ----------------------------
  disableScroll() {
    const scrollY = window.scrollY;
    const body = document.body;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    console.log('scrollbarWidth:', scrollbarWidth);

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

  // 地址帶入GoogleMap ==========================================================
  getMap(address: string | undefined) {
    if (!address) return '#';
    const gmap = 'https://www.google.com/maps/search/?api=1&query=';
    let mapUrl = gmap + encodeURIComponent(address);
    return mapUrl;
  }
}
