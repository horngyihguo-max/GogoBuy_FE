import { AutoCompleteModule } from 'primeng/autocomplete';
import { Component, computed, effect, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AuthService } from '../../@service/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { HttpService } from '../../@service/http.service';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

type Store = {
  id: number;
  name: string;
  image: string;
  type: string;
  category: 'fast' | 'slow';
  distance?: number;
  prettyDistance?: number;
};

interface StoreOperating {
  id: number;
  open_time: string;
  close_time: string;
  category: string;
}

@Component({
  selector: 'app-store-list',
  imports: [
    MultiSelectModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    ToastModule,
    AutoCompleteModule,
    CommonModule
  ],
  providers: [MessageService],
  templateUrl: './store-list.component.html',
  styleUrl: './store-list.component.scss'
})
export class StoreListComponent {
  constructor(
    public router: Router,
    public auths: AuthService,
    private https: HttpService,
    private messageService: MessageService,
  ) {
    effect(() => {
      const u = this.auths.user;
      console.log(u);
      if (u) {
        this.userId = u.id;
        this.favoriteIds = u.favoriteStore || [];
      }
    });
  }
  readonly storeSearch = signal<string>('');
  // 選到的類型（外送 / 團購 / 不限）
  readonly selectedCategory = signal<'all' | 'fast' | 'slow'>('all');
  readonly categoryOptions = [
    { label: '外送', value: 'fast' },
    { label: '團購', value: 'slow' },
    { label: '不限類型 (外送 + 團購)', value: 'all' }
  ];

  readonly selectedStatus = signal<'all' | 'open' | 'closed'>('all');
  readonly statusOptions = [
    { label: '顯示全部', value: 'all' },
    { label: '營業中', value: 'open' },
    { label: '休息中', value: 'closed' }
  ];
  readonly operatingStores = signal<StoreOperating[]>([]);

  // 距離選單與座標
  readonly selectedDistance = signal<number>(0); // 0 代表不限(全部)
  readonly distanceOptions = [
    { label: '不限距離', value: 0 },
    { label: '附近 5 公里', value: 5 },
    { label: '附近 10 公里', value: 10 },
    { label: '附近 20 公里', value: 20 }
  ];
  userCoords = signal<{ lat: number; lng: number } | null>(null);

  // 用來顯示選單目前選中的文字
  selectedDistanceLabel = computed(() => {
    const currentVal = this.selectedDistance();
    const option = this.distanceOptions.find(o => o.value == currentVal);
    return option ? option.label : '定位未開啟';
  });

  // stores：存「所有店家資料」
  readonly stores = signal<Store[]>([]);

  // 暫時沒用到(因為改成搜尋店名)
  readonly selectedStoreIds = signal<number[]>([]);

  // 選到的品牌（店名）清單
  // 如果這個陣列是空的，代表「不限制品牌 = 全部」
  readonly selectedStoreNames = signal<string[]>([]);
  filteredStoreSuggestions: { label: string; value: string }[] = [];

  // 選到的餐點種類（type）清單
  readonly selectedFoodTypes = signal<string[]>([]);

  // 取店名用的小工具，使用 trim() 消除前後空白
  private getStoreName(s: Store): string {
    return String(s?.name ?? '').trim();
  }

  // 取餐點種類用的小工具，同樣做 trim 避免空白問題
  private getType(s: Store): string {
    return String(s?.type ?? '').trim();
  }

  // 呼叫loadStores()：去後端拿全部店家資料
  ngOnInit() {
    this.getUserLocation();
    this.loadStores();
    this.userId = String(localStorage.getItem('user_id'));
    this.user = localStorage.getItem('user_info');
    // 刷新用戶資料
    this.auths.refreshUser();
    this.updateLocalFavoriteList();
    this.auths.user$.subscribe((user) => {
      if (user) {
        this.favoriteIds = user.favoriteStore || [];
      }
    });
  }

  choose(category: 'all' | 'fast' | 'slow') {
    this.selectedCategory.set(category);
  }

  // 搜尋店名
  searchStore(event: any) {
    const query = event.query?.toLowerCase() ?? '';

    const uniqueNames = Array.from(
      new Set(this.stores().map(s => this.getStoreName(s)))
    );

    this.filteredStoreSuggestions = uniqueNames
      .filter(name => name.toLowerCase().includes(query))
      .map(name => ({
        label: name,
        value: name
      }));
  }

  // 取得位置
  // 檢查定位狀態並請求位置
  async getUserLocation(forceRequest: boolean = false) {
    if (!navigator.geolocation) {
      this.messageService.add({ severity: 'error', summary: '不支援定位', detail: '您的瀏覽器不支援地理定位功能。' });
      return;
    }
    // 檢查權限狀態
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });

    if (permissionStatus.state == 'denied') {
      this.messageService.add({
        severity: 'warn',
        summary: '定位已關閉',
        detail: '請點擊網址列左側的「鎖頭」圖示，重新允許定位權限後重新整理網頁。',
        sticky: true
      });
      return;
    }

    // 如果狀態是 prompt 或已允許，則請求座標
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error('定位請求失敗', err);
      }
    );
  }
  // 當距離選單改變時觸發
  onDistanceChange(radius: number) {
    this.selectedDistance.set(radius);

    if (radius > 0 && !this.userCoords()) {
      // 如果選了距離但沒座標，嘗試再次請求
      this.getUserLocation(true);

      // 把選單重設回 0 (不限距離)，因為目前沒座標無法搜尋
      setTimeout(() => this.selectedDistance.set(0), 100);
      return;
    }
    // 如果選「不限距離」(0)，就跑原本的 loadStores (抓 res.storeList)
    if (radius == 0) {
      this.loadStores();
      return;
    }

    // 如果沒座標，不執行搜尋
    const coords = this.userCoords();
    if (!coords) {
      console.warn('目前無座標資訊');
      return;
    }

    // 呼叫 Nearby API
    this.auths.searchNearbyStore(coords.lat, coords.lng, undefined, radius).subscribe({
      next: (res: any) => {
        // Nearby API 的資料在 res.data
        const list = res?.data ?? [];

        // 補上必要的 type 欄位 (如果 API 回傳沒帶 type，可以從 category 轉換或給預設值)
        const processedList = list.map((s: any) => ({
          ...s,
          type: s.type || (s.category == 'fast' ? '外送' : '團購')
        }));

        this.stores.set(processedList);

        // 更新營業狀態 (一樣用 ID 去抓)
        if (processedList.length > 0) {
          this.fetchOperatingStatus(processedList.map((s: any) => s.id));
        }
      },
      error: (err: any) => {
        console.error('搜尋附近店家失敗', err);
        this.stores.set([]);
      }
    });
  }

  // 呼叫後端 API，拿到 storeList 後存進 stores()
  // next：成功回來
  // error：失敗時把 stores 清空，避免畫面卡住
  // 修改 loadStores，載入完清單後自動抓營業狀態
  loadStores() {
    this.auths.getallstore().subscribe({
      next: (res: any) => {
        const list = res?.storeList ?? [];
        console.log('storeList raw =', list);

        const processedList = list.map((s: any) => ({
          ...s,
          type: s.type || (s.category == 'fast' ? '外送' : '團購')
        }));

        this.stores.set(processedList);

        if (processedList.length > 0) {
          this.fetchOperatingStatus(processedList.map((s: any) => s.id));
        }
      }
    });
  }

  // 新增請求營業狀態的方法 (由 HttpService 提供)
  fetchOperatingStatus(ids: number[]) {
    const payload = { filteredStoreIds: ids };
    // 假設你的 http 服務是注入在建構子
    this.auths.https.postApi('http://localhost:8080/gogobuy/store/getOperatingStores', payload)
      .subscribe((res: any) => {
        if (res.code == 200 && res.storeOperatingList) {
          this.operatingStores.set(res.storeOperatingList);
        }
      });
  }

  // 品牌下拉選單的選項（給 p-multiselect 用）
  // 需求：同樣店名只出現一次，並在後面顯示「有幾家同名」
  // 例：TEA'S 原味 (3)
  readonly storeOptions = computed(() => {
    // map：key=店名、value=出現次數
    const map = new Map<string, number>();

    for (const s of this.stores()) {
      const name = this.getStoreName(s);
      if (!name) continue;
      map.set(name, (map.get(name) ?? 0) + 1);
    }

    // 轉成 p-multiselect 要的格式：[{label, value}]
    // value 用店名，代表選到這個「品牌」
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'))
      .map(([name, count]) => ({
        label: count > 1 ? `${name} (${count})` : name,
        value: name,
      }));
  });

  // 餐點種類下拉選單的選項（type 分類）
  // 從所有店家資料裡，把 type 抽出來做分類
  readonly foodTypeOptions = computed(() => {
    // count：key=type、value=出現次數
    const count = new Map<string, number>();

    for (const s of this.stores()) {
      const t = this.getType(s);
      if (!t) continue;
      count.set(t, (count.get(t) ?? 0) + 1);
    }

    return Array.from(count.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'))
      .map(([t, n]) => ({
        label: n > 1 ? `${t}` : t,
        value: t
      }));
  });

  // 拿去卡片的店家清單
  // 規則：店家+餐點種類是同時成立（AND）
  // - 沒選店家（selectedStoreNames 是空）→ 不限制店家
  // - 沒選餐點種類（selectedFoodTypes 是空）→ 不限制餐點種類
  readonly filteredStores = computed(() => {
    const keyword = this.storeSearch().trim().toLowerCase();
    let out = this.stores();
    const selectedNames = this.selectedStoreNames();
    const selectedTypes = this.selectedFoodTypes();
    const category = this.selectedCategory();
    const status = this.selectedStatus();
    const operatingIds = new Set(this.operatingStores().map(s => s.id));

    if (keyword) {
      out = out.filter(s =>
        this.getStoreName(s).toLowerCase().includes(keyword)
      );
    }
    // 基礎篩選 (店家名稱/餐點種類)
    if (selectedNames.length) {
      out = out.filter(s => selectedNames.includes(this.getStoreName(s)));
    }
    if (selectedTypes.length) {
      out = out.filter(s => selectedTypes.includes(this.getType(s)));
    }

    // 類型篩選 (外送/團購) - 如果你的 logic 有用到這部分
    if (category !== 'all') {
      out = out.filter(s => s.category === category);
    }

    // 處理營業狀態並進行排序
    return out
      .map(s => ({
        ...s,
        isClosed: !operatingIds.has(s.id)
      }))
      .filter(s => {
        if (status === 'open') return !s.isClosed;
        if (status === 'closed') return s.isClosed;
        return true;
      })
      .sort((a, b) => {
        // 先比營業狀態 (營業中的放前面)
        if (a.isClosed !== b.isClosed) {
          return Number(a.isClosed) - Number(b.isClosed);
        }
        // 如果營業狀態一樣，再比距離 (由近到遠)
        return (a.distance ?? 0) - (b.distance ?? 0);
      });
  });

  // 前往商店頁面
  goStoreInfo(storeId: number) {
    this.router.navigate(['/management/store_info', storeId]);
  }

  //收藏功能(搬運自STORE-INFO)
  userId = ''; // 沒登入就 ""
  user: any | null = null; // 存用戶資料

  // 放收藏店家陣列
  favoriteIds: number[] = [];

  // 更新同步收藏店家陣列
  private updateLocalFavoriteList() {
    if (this.user) {
      this.favoriteIds = this.user.favoriteStore || [];
    }
  }

  // 收藏的店家
  isFavorite(storeId: number) {
    return this.favoriteIds.includes(storeId);
  }

  // 收藏店家
  toggleFavorite(storeId: number) {
    console.log('userId:', this.userId);
    // --- 樂觀更新 (Optimistic UI) ---
    // 不等 API 回傳，先直接在畫面上改掉顏色
    if (this.isFavorite(storeId)) {
      this.favoriteIds = this.favoriteIds.filter((id) => id !== storeId);
    } else {
      this.favoriteIds = [...this.favoriteIds, storeId];
    }
    const urlWithParams = `http://localhost:8080/gogobuy/updateFavoriteStore?id=${this.userId}&storesList=${storeId}`;
    this.https.postApi(urlWithParams, {}).subscribe({
      next: (res: any) => {
        if (res?.code === 200) {
          this.toastSuccess('成功', '收藏狀態已更新');
          this.auths.refreshUser(); // 後端同步
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
    if (!this.userId) {
      this.toastWarn('提醒', '請先登入才能收藏店家');
      return;
    }
    this.toggleFavorite(id);
  }

  // 狀態更新提示
  private toastSuccess(summary: string, detail: string): void {
    this.messageService.add({ severity: 'success', summary, detail });
  }
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

}
