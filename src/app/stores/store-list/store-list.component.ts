import { Component, computed, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AuthService } from '../../@service/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';
import { DropdownModule } from 'primeng/dropdown';
import { HttpService } from '../../@service/http.service';

type Store = {
  id: number;
  name: string;
  image: string;
  type: string;
  category: 'fast' | 'slow';
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
    DropdownModule
  ],
  templateUrl: './store-list.component.html',
  styleUrl: './store-list.component.scss'
})
export class StoreListComponent {
  constructor(
    public router: Router,
    public auths: AuthService,
    private https: HttpService,
  ) { }
  storeSearch!: string;
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

  // stores：存「所有店家資料」
  readonly stores = signal<Store[]>([]);

  // 暫時沒用到(因為改成搜尋店名)
  readonly selectedStoreIds = signal<number[]>([]);

  // 選到的品牌（店名）清單
  // 如果這個陣列是空的，代表「不限制品牌 = 全部」
  readonly selectedStoreNames = signal<string[]>([]);

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
    this.loadStores();
  }

  choose(category: 'all' | 'fast' | 'slow') {
    this.selectedCategory.set(category);
  }


  // 呼叫後端 API，拿到 storeList 後存進 stores()
  // next：成功回來
  // error：失敗時把 stores 清空，避免畫面卡住
  //  修改 loadStores，載入完清單後自動抓營業狀態
  loadStores() {
    this.auths.getallstore().subscribe({
      next: (res: any) => {
        const list: Store[] = res?.storeList ?? [];
        this.stores.set(list);

        // 拿到清單後，緊接著查詢營業狀態
        if (list.length > 0) {
          this.fetchOperatingStatus(list.map(s => s.id));
        }
      },
      error: (err: any) => {
        console.error('getallstore error', err);
        this.stores.set([]);
      }
    });
  }

  // 新增請求營業狀態的方法 (由 HttpService 提供)
  fetchOperatingStatus(ids: number[]) {
    const payload = { filteredStoreIds: ids };
    // 假設你的 http 服務是注入在建構子
    this.auths.https.postApi('http://localhost:8080/gogobuy/store/getOperatingStores', payload)
      .subscribe((res: any) => {
        if (res.code === 200 && res.storeOperatingList) {
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
  // 規則：品牌+餐點種類是同時成立（AND）
  // - 沒選品牌（selectedStoreNames 是空）→ 不限制品牌
  // - 沒選餐點種類（selectedFoodTypes 是空）→ 不限制餐點種類
  readonly filteredStores = computed(() => {
    let out = this.stores();
    const selectedNames = this.selectedStoreNames();
    const selectedTypes = this.selectedFoodTypes();
    const category = this.selectedCategory();
    const status = this.selectedStatus();

    // 取得營業中 ID 集合
    const operatingIds = new Set(this.operatingStores().map(s => s.id));

    // 處理原本的類型篩選
    if (category !== 'all') {
      out = out.filter(s => s.category == category);
    }

    // 處理原本的品牌篩選
    if (selectedNames.length) {
      out = out.filter(s => selectedNames.includes(this.getStoreName(s)));
    }

    // 處理原本的餐點種類篩選
    if (selectedTypes.length) {
      out = out.filter(s => selectedTypes.includes(this.getType(s)));
    }

    // 處理營業狀態篩選，並同時幫物件補上 isClosed 標記供畫面使用
    return out.map(s => ({
      ...s,
      isClosed: !operatingIds.has(s.id)
    })).filter(s => {
      if (status === 'open') return !s.isClosed;
      if (status === 'closed') return s.isClosed;
      return true; // all
    });
  });



  // 前往商店頁面
  goStoreInfo(storeId: number) {
    this.router.navigate(['/management/store_info', storeId]);
  }

}
