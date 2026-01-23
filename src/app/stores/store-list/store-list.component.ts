import { Component, computed, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { AuthService } from '../../@service/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';


type Store = {
  id: number;
  name: string;
  image: string;
  type: string;
};

@Component({
  selector: 'app-store-list',
  imports: [
    MultiSelectModule,
    FormsModule,
    InputTextModule,
  ],
  templateUrl: './store-list.component.html',
  styleUrl: './store-list.component.scss'
})
export class StoreListComponent {
  constructor(
    public router: Router,
    public auths: AuthService,
  ) { }
  storeSearch!: string;

  // stores：存「所有店家資料」
  readonly stores = signal<Store[]>([]);

  // 暫時沒用到(因為改成搜尋店名)
  readonly selectedStoreIds = signal<number[]>([]);

  // 選到的品牌（店名）清單
  // 如果這個陣列是空的，代表「不限制品牌 = 全部」
  readonly selectedStoreNames = signal<string[]>([]);

  // 選到的餐點總類（type）清單
  readonly selectedFoodTypes = signal<string[]>([]);

  // 取店名用的小工具，使用 trim() 消除前後空白
  private getStoreName(s: Store): string {
    return String(s?.name ?? '').trim();
  }

  // 取餐點總類用的小工具，同樣做 trim 避免空白問題
  private getType(s: Store): string {
    return String(s?.type ?? '').trim();
  }

  // 呼叫loadStores()：去後端拿全部店家資料
  ngOnInit() {
    this.loadStores();
  }

  // 呼叫後端 API，拿到 storeList 後存進 stores()
  // next：成功回來
  // error：失敗時把 stores 清空，避免畫面卡住
  loadStores() {
    this.auths.getallstore().subscribe({
      next: (res: any) => {
        const list: Store[] = res?.storeList ?? [];
        this.stores.set(list);
      },
      error: (err: any) => {
        console.error('getallstore error', err);
        this.stores.set([]);
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

  // 餐點總類下拉選單的選項（type 分類）
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
        label: n > 1 ? `${t} (${n})` : t,
        value: t
      }));
  });

  // 拿去卡片的店家清單
  // 規則：品牌+餐點總類是同時成立（AND）
  // - 沒選品牌（selectedStoreNames 是空）→ 不限制品牌
  // - 沒選餐點總類（selectedFoodTypes 是空）→ 不限制餐點總類
  readonly filteredStores = computed(() => {
    const list = this.stores();
    const selectedNames = this.selectedStoreNames?.() ?? [];
    const selectedTypes = this.selectedFoodTypes();

    let out = list;

    // 有選品牌才過濾，沒選=全部
    if (selectedNames.length) {
      out = out.filter(s => selectedNames.includes(String(s.name ?? '').trim()));
    }

    // 有選餐點總類才過濾，沒選=全部
    if (selectedTypes.length) {
      out = out.filter(s => selectedTypes.includes(this.getType(s)));
    }

    return out;
  });

  // 前往商店頁面
  goStoreInfo(storeId: number) {
    this.router.navigate(['/management/store_info', storeId]);
  }

}
