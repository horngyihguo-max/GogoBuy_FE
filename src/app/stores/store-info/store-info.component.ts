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
  ],
  templateUrl: './store-info.component.html',
  styleUrl: './store-info.component.scss',
})
export class StoreInfoComponent implements OnInit {
  // =========================
  // 狀態
  // =========================
  isLoading = true;

  userId = ''; // 沒登入就 ""
  storeId = 0;

  // 店家資料（從 API 或假資料來）
  store: any = null;

  // 店家狀態顯示用（營業中/休息/打烊/公休）
  openStatusText = '';
  openStatusDot: 'open' | 'closed' = 'closed'; // 用來決定 ●/○ 顏色
  openStatusSubText = ''; // 「將於 XX:XX ...」「明日 XX:XX ...」

  // force_closed 額外提示
  isForceClosed = false;

  // 詳細資訊 drawer
  detailVisible = false;
  detailTab: TabMode = 'info';

  // 商品詳情 dialog
  productVisible = false;
  selectedProduct: any = null;

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
  ) {}

  ngOnInit(): void {
    // userId（測試塞假id）
    // this.userId = this.auth.user?.id || '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa';
    this.userId = String(localStorage.getItem('user_id'));
    console.log(this.userId);
    // 刷新用戶資料
    this.auth.refreshUser();

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
  // TODO 讀資料（先假資料，後面換 API）
  // =========================
  loadStoreById(id: number): void {
    this.isLoading = true;

    // 後端上線後使用
    this.http
      .getApi(`http://localhost:8080/gogobuy/store/searchId?id=${id}`)
      .subscribe((res: any) => {
        console.log(res);
        const normalized = this.normalizeStoreResponse(res);
        this.store = normalized;
        this.afterLoaded();
      });

    // 假資料 =============================================
    // const res = this.getMockResponse(); // 假資料方法在這
    // this.store = this.normalizeStoreResponse(res);
    // this.afterLoaded();
  }

  afterLoaded(): void {
    // 1) 防呆：沒資料
    if (!this.store) {
      this.toastWarn('錯誤', '找不到店家資料');
      this.goBack();
      return;
    }

    // 2) deleted 擋掉
    if (this.store.deleted === true) {
      this.toastWarn('店家不存在', '此店家已不存在');
      this.goBack();
      return;
    }

    // 3) publish 權限：publish=false 且不是建立者 → 擋掉
    if (this.store.publish === false) {
      const createdBy = this.store.created_by || '';
      if (!this.userId || createdBy !== this.userId) {
        this.toastWarn('不公開店家', '此為不公開店家');
        this.goBack();
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

    // 明天也沒有 → 先給保守文案
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
    if (!this.userId) return;
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

    // 【新增】清空上一個商品的選擇狀態
    this.selectedOptionIdsByGroup = {};

    // 【新增】規格（priceLevel）預設值
    const levels = this.getPriceLevelsByCategoryId(p?.categoryId);
    this.selectedPriceLevel =
      levels.find((x: any) => String(x?.name || '') === '標準') ||
      levels.find((x: any) => Number(x?.price) === 0) ||
      null;

    // 【新增】依 unusual 白名單初始化可選群組
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

  // 【新增】顯示用：basePrice + 規格加價 + 已選選項加價
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
    if (!u || typeof u !== 'object') return [];

    const allowIds = Object.keys(u)
      .map((k) => Number(k))
      .filter((n) => !Number.isNaN(n));

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

  // =========================
  // 假資料
  // =========================
  getMockResponse(): any {
    return {
      code: 200,
      message: '成功',
      storeList: [
        {
          id: 40,
          name: '微醺之夜餐酒館 (Vibe Night)',
          phone: '0423218888',
          address: '台中市西區公益路二段99號',
          category: 'fast',
          type: '異國料理',
          memo: '本館提供頂級松露料理與特調調酒，週五六提供深夜駐唱。',
          image:
            'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1200',
          feeDescription:
            '[{"km":1,"fee":0},{"km":3,"fee":45},{"km":7,"fee":85},{"km":15,"fee":150}]',
          deleted: false,
          publish: true,
          force_closed: false,
          created_by: 'SystemManager',
        },
      ],
      operatingHoursVoList: [
        {
          id: 61,
          storesId: 40,
          week: 1,
          openTime: '11:00:00',
          closeTime: '14:30:00',
          closed: false,
        },
        {
          id: 62,
          storesId: 40,
          week: 1,
          openTime: '17:30:00',
          closeTime: '22:00:00',
          closed: false,
        },
        {
          id: 63,
          storesId: 40,
          week: 2,
          openTime: '11:00:00',
          closeTime: '22:00:00',
          closed: false,
        },
        {
          id: 64,
          storesId: 40,
          week: 3,
          openTime: '00:00:00',
          closeTime: '00:00:00',
          closed: true,
        },
        {
          id: 65,
          storesId: 40,
          week: 4,
          openTime: '11:00:00',
          closeTime: '22:00:00',
          closed: false,
        },
        {
          id: 68,
          storesId: 40,
          week: 5,
          openTime: '18:00:00',
          closeTime: '02:00:00',
          closed: false,
        },
        {
          id: 69,
          storesId: 40,
          week: 6,
          openTime: '18:00:00',
          closeTime: '04:00:00',
          closed: false,
        },
        {
          id: 70,
          storesId: 40,
          week: 7,
          openTime: '18:00:00',
          closeTime: '00:00:00',
          closed: false,
        },
      ],
      menuVoList: [
        {
          id: 122,
          storesId: 40,
          categoryId: 1,
          name: '松露金箔薯條',
          description: '選用義大利頂級松露油與食用金箔裝飾',
          basePrice: 220,
          image:
            'aHR0cHM6Ly9pbWdjZG4uY25hLmNvbS50dy93d3cvV2ViUGhvdG9zLzEwMjQvMjAyMTA3MjcvMTAyNHgxMDI0XzM3OTQyMDUzOTA4NS5qcGc=',
          available: false,
        },
        {
          id: 123,
          storesId: 40,
          categoryId: 1,
          name: '紐奧良辣味雞翅翅翅翅翅翅翅',
          description:
            '獨家秘製辛香料，鮮嫩多汁。獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁獨家秘製辛香料，鮮嫩多汁',
          basePrice: 280,
          image:
            'aHR0cHM6Ly9pbWFnZS1jZG4tZmxhcmUucWRtLmNsb3VkL3E2MDgxYzRmODFmMDFhL2ltYWdlL2RhdGEvJUU1JTk1JTg2JUU1JTkzJTgxJUU3JTg1JUE3JUU3JTg5JTg3LzEyXyVFNyVCNCU5MCVFNSVBNSVBNyVFOCU4OSVBRiVFOCVCRSVBMyVFNyVCRiU4NS8qJUU3JTk0JUEyJUU1JTkzJTgxJUU1JTlDJTk2LSVFNyVCNCU5MCVFNSVBNSVBNyVFOCU4OSVBRiVFOSU5QiU5RSVFNyVCRiU4NTAzLmpwZw==',
          available: true,
          unusual: {
            '24': 'true',
          },
        },
        {
          id: 124,
          storesId: 40,
          categoryId: 59,
          name: '午夜藍色夏威夷',
          description: '伏特加基底搭配藍柑橘糖漿，口感清爽',
          basePrice: 350,
          image:
            'aHR0cHM6Ly9hc3NldHMudG1lY29zeXMuY29tL2ltYWdlL3VwbG9hZC90X3dlYl9yZHBfcmVjaXBlXzU4NHg0ODBfMV81eC9pbWcvcmVjaXBlL3Jhcy9Bc3NldHMvOTA5REEyRjItODczOS00Mjk3LTkyQjAtMUQ4NkM5MjExMjMyL0Rlcml2YXRlcy8xMTZjZGIwNC05NDczLTQzZDAtOWVmZC1kOWY2ZjU5ZGZmYTMuanBn',
          available: true,
          unusual: {
            '22': 'true',
            '23': 'true',
          },
        },
        {
          id: 125,
          storesId: 40,
          categoryId: 58,
          name: '深夜炸物大三元',
          description: '包含雞塊、洋蔥圈、起司條',
          basePrice: 450,
          available: true,
          unusual: {
            '24': 'true',
          },
        },
      ],
      menuCategoriesVoList: [
        {
          id: 1,
          storesId: 40,
          name: '人氣單點小物',
        },
        {
          id: 58,
          storesId: 40,
          name: '深夜炸物拼盤',
          priceLevel: [
            {
              name: '雙人分享',
              price: 250,
            },
            {
              name: '派對特大',
              price: 450,
            },
          ],
        },
        {
          id: 59,
          storesId: 40,
          name: '特調調酒系列',
          priceLevel: [
            {
              name: '標準',
              price: 0,
            },
            {
              name: '濃縮加強',
              price: 200,
            },
          ],
        },
      ],
      productOptionGroupsVoList: [
        {
          id: 22,
          storesId: 40,
          name: '基酒更換',
          required: false,
          maxSelection: 1,
          items: [
            { id: 47, groupId: 22, name: '換成琴酒 (Gin)', extraPrice: 50 },
            { id: 48, groupId: 22, name: '換成伏特加 (Vodka)', extraPrice: 30 },
            {
              id: 55,
              groupId: 22,
              name: '換成威士忌 (Whisky)',
              extraPrice: 80,
            },
          ],
        },
        {
          id: 23,
          storesId: 40,
          name: '冰塊份量',
          required: true,
          maxSelection: 1,
          items: [
            { id: 49, groupId: 23, name: '正常冰', extraPrice: 0 },
            { id: 50, groupId: 23, name: '少冰', extraPrice: 0 },
            { id: 51, groupId: 23, name: '去冰', extraPrice: 0 },
          ],
        },
        {
          id: 24,
          storesId: 40,
          name: '加價沾醬 (可多選)',
          required: false,
          maxSelection: 3,
          items: [
            { id: 52, groupId: 24, name: '蜂蜜芥末醬', extraPrice: 20 },
            { id: 53, groupId: 24, name: '松露蛋黃醬', extraPrice: 40 },
            { id: 54, groupId: 24, name: '泰式酸辣醬', extraPrice: 20 },
          ],
        },
      ],
      feeDescriptionVoList: [
        { km: 1, fee: 0 },
        { km: 3, fee: 45 },
        { km: 5, fee: 65 },
        { km: 7, fee: 85 },
        { km: 10, fee: 110 },
        { km: 15, fee: 150 },
      ],
    };
  }
}
