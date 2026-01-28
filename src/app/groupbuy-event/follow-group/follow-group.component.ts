import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';

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
    // Drag-drop directives
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
  ],
  templateUrl: './follow-group.component.html',
  styleUrl: './follow-group.component.scss',
})
export class FollowGroupComponent {
  constructor(
    private auth: AuthService,
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  // =========================
  // 基本狀態
  // =========================
  isLoading = true; // 是否讀取中
  userId = ''; // 用戶Id（未登入就空字串）
  groupId = 0; // 團Id
  storeId = 0; // 店家Id

  // 團的資料
  group: GroupbuyEvents | null = null;

  // 店家資料(要先解析過)
  store: any = null;

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

  // ========= 店家營業狀態（給上方卡片顯示） =========
  openStatusText = '';
  openStatusType: 'OPEN' | 'REST' | 'CLOSED' | 'FORCE_CLOSED' = 'CLOSED';

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

  // 加料（drag-drop）
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

  ngOnInit(): void {
    this.userId = String(localStorage.getItem('user_id') || '');
    this.groupId = Number(this.route.snapshot.paramMap.get('id') || 0);

    if (!this.groupId) {
      this.toastWarn('錯誤', '找不到團 id');
      this.goBack();
      return;
    }

    this.loadGroupById(this.groupId);
  }

  // =========================
  // 抓團 + 店家資料（先假資料，後面換 API）
  // =========================
  loadGroupById(id: number): void {
    this.isLoading = true;

    // =============================================
    // GROUP（後端上線後使用）
    // this.http
    //   .getApi(`http://localhost:8080/gogobuy/event/getEventsByEventsId?id=${id}`)
    //   .subscribe((res: any) => {
    //     const g = res?.groupbuyEvents?.[0] as GroupbuyEvents | undefined;
    //     if (!g) {
    //       this.toastWarn('錯誤', '找不到團資料');
    //       this.goBack();
    //       return;
    //     }
    //     this.applyGroup(g);
    //     this.loadStoreById(g.storesId);
    //   });

    // 假資料
    const gRes = this.getMockGroupResponse();
    const g = gRes?.groupbuyEvents?.[0] as GroupbuyEvents | undefined;

    if (!g) {
      this.toastWarn('錯誤', '找不到團資料');
      this.goBack();
      return;
    }

    this.applyGroup(g);

    // =============================================
    // STORE
    this.loadStoreById(this.storeId);
  }

  loadStoreById(id: number): void {
    this.isLoading = true;

    // 後端上線後使用
    // this.http
    //   .getApi(`http://localhost:8080/gogobuy/store/searchId?id=${id}`)
    //   .subscribe((res: any) => {
    //     console.log(res);
    //     const normalized = this.normalizeStoreResponse(res);
    //     this.store = normalized;
    //     this.afterLoaded();
    //   });

    // 假資料
    const sRes = this.getMockResponse();
    this.store = this.normalizeStoreResponse(sRes);
    this.afterLoaded();
  }

  // 套用團資料：解析 tempMenuList / recommendList + 基本防呆
  applyGroup(g: GroupbuyEvents): void {
    this.group = g;
    this.storeId = Number(g.storesId);

    if (g.deleted === true) {
      this.toastWarn('此團不存在', '此團已被刪除');
      this.goBack();
      return;
    }

    this.allowedMenuIds = this.parseIdList(g.tempMenuList);
    this.recommendMenuIds = this.parseIdList(g.recommendList);
    // allowedMenuIds 空陣列代表「顯示全部」
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

    this.isLoading = false;
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

  // =====================================================
  // dialog HTML 需要的「操作方法」
  // =====================================================

  // （在菜單卡片上點擊商品時呼叫它）
  openProductDialog(product: any): void {
    this.selectedProduct = product;
    this.productDialogVisible = true;

    this.quantity = 1;

    // 規格初始化
    const cid = Number(product?.categoryId || 0);
    this.priceLevels = this.getPriceLevelsByCategoryId(cid);
    this.selectedPriceLevel = this.getDefaultPriceLevel(cid);

    // 選項初始化（從 unusual 決定要顯示哪些 option groups）
    this.initOptionsByProduct(product);
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

  // 單選
  selectSingleOption(group: ProductOptionGroup, item: ProductOptionItem): void {
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

  // 這裡先留一個「加入訂單」最小可行版：先關 dialog
  addToOrder(): void {
    if (!this.selectedProduct) return;

    // 先做最小可行：提示 + 關閉 dialog
    this.toastSuccess(
      '已加入',
      `${this.selectedProduct?.name || ''} x${this.quantity}`,
    );
    this.closeProductDialog();
  }

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
      this.addonMaxSelection = Number(ag.maxSelection ?? 0);

      this.addonOptions = ag.items;
      this.availableAddons = [...ag.items];
      this.selectedAddons = [];
    } else {
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

  private extractGroupIdsFromUnusual(unusual: any): number[] {
    if (!unusual || typeof unusual !== 'object') return [];
    return Object.keys(unusual)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  // =========================
  // 營業狀態（先做一個可用版）
  // =========================
  buildOpenStatus(): void {
    if (!this.store) return;

    if (this.store.force_closed === true) {
      this.openStatusType = 'FORCE_CLOSED';
      this.openStatusText = '○ 今日公休';
      return;
    }

    const now = new Date();
    const weekday = now.getDay(); // 0(日)~6(六)
    const dayOfWeek = weekday === 0 ? 7 : weekday; // 1~7

    const list: any[] = Array.isArray(this.store.operatingHoursVoList)
      ? this.store.operatingHoursVoList
      : [];

    const todaySlots = list
      .filter((h) => Number(h.dayOfWeek) === dayOfWeek)
      .map((h) => ({ start: h.startTime, end: h.endTime }));

    if (!todaySlots.length) {
      this.openStatusType = 'CLOSED';
      this.openStatusText = '○ 今日未營業';
      return;
    }

    const nowMin = now.getHours() * 60 + now.getMinutes();

    const inSlot = todaySlots.find((s) => {
      const [sh, sm] = String(s.start).split(':').map(Number);
      const [eh, em] = String(s.end).split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return nowMin >= startMin && nowMin < endMin;
    });

    if (inSlot) {
      this.openStatusType = 'OPEN';
      this.openStatusText = `● 營業中 ⋅ 將於 ${inSlot.end} 休息`;
      return;
    }

    const next = todaySlots
      .map((s) => {
        const [sh, sm] = String(s.start).split(':').map(Number);
        return { start: s.start, startMin: sh * 60 + sm };
      })
      .filter((s) => s.startMin > nowMin)
      .sort((a, b) => a.startMin - b.startMin)[0];

    if (next) {
      this.openStatusType = 'REST';
      this.openStatusText = `○ 休息中 ⋅ 將於 ${next.start} 開始營業`;
    } else {
      this.openStatusType = 'CLOSED';
      this.openStatusText = `○ 已打烊 ⋅ 明日開始營業`;
    }
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
      timer: 1200,
      showConfirmButton: false,
      didOpen: () => {
        const c = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }

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

  // 解析收到的Response
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

  // =========================
  // 假資料
  // =========================
  getMockGroupResponse(): any {
    return {
      code: 200,
      message: '成功查詢資料',
      groupbuyEvents: [
        {
          id: 8,
          type: '餐廳',
          status: 'OPEN',
          hostId: '16c88406-e303-454d-bf60-508eb0f6ba83',
          nickname: '王大明',
          eventName: '快來買',
          shippingFee: 0,
          limitation: 50,
          splitType: 'EQUAL',
          endTime: '2026-01-31T21:20:30',
          announcement: '每杯買二送一～',
          storesId: 40,
          recommendList: '[49,57]',
          tempMenuList: '[25,49,57]',
          recommendDescription: '強推雞尾酒',
          totalOrderAmount: 100,
          deleted: 0,
        },
      ],
    };
  }

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

  // POST格式對照（參考用）
  orderPost = {
    id: 0,
    eventsId: 8,
    userId: 'string',
    menuList: [
      {
        menuId: 20,
        quantity: 1,
        specName: '標準',
        specExtraPrice: 0,
        basePrice: 50,
        finalUnitPrice: 60,
        selectedOptionList: [
          { optionName: '糖度', value: '半糖' },
          { optionName: '冰塊', value: '微冰' },
          { optionName: '加料', value: '椰果', extraPrice: 10 },
        ],
      },
    ],
    personalMemo: '要吸管',
    orderTime: '2026-01-28T01:48:38.263Z',
    subtotal: 60,
    weight: 0.1,
  };
}

// 團的資料的interface
export interface GroupbuyEvents {
  id: number;
  hostId: string;
  storesId: number;
  eventName: string;
  status: 'OPEN' | 'LOCKED' | 'FINISHED';
  endTime: string;
  totalOrderAmount: number;
  shippingFee: number;
  splitType: 'EQUAL' | 'WEIGHT';
  announcement: string;
  type: string;
  tempMenuList: string;
  recommendList: string;
  recommendDescription: string;
  limitation: number;
  deleted: boolean;
  nickname?: string;
  hostAvatar?: string;
  store_category?: 'fast' | 'slow';
}
