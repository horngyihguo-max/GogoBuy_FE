import { Component, HostListener, ViewChild, computed, signal } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule, Tooltip } from 'primeng/tooltip';
import { Subject, timer, Subscription } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { HttpService } from '../@service/http.service';
import { Router } from '@angular/router';
import { PanelModule } from 'primeng/panel';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../@service/auth.service';
import { SelectModule } from 'primeng/select';
import { FeeDescriptionVoList, StoreService } from '../@service/store.service';


export type Stores = {
  id: number;
  name: string;
  phone: string;
  address: string;
  category: string;
  type: string;
  memo: string | null;
  image: string;
  fee_description: DeliveryFeeRule[];
  is_deleted: boolean;
  is_public: boolean;
  created_by: string;
  force_closed: boolean;
};

export type DeliveryFeeRule = {
  km: number;
  fee: number;
};

export type StoreCardView = {
  id: number;
  name: string;
  image: string;
  isOpen: boolean;
};

export interface Banner {
  image: string;
  title?: string;
  link?: string;
}


export interface Store {
  "id": number,
  "name": string,
  "phone": string,
  "address": string,
  "category": string,
  "type": string,
  "memo": string,
  "image": string,
  "feeDescription": any,
  "deleted": boolean,
  "publish": boolean,
  "force_closed": boolean,
  "created_by": string
}

@Component({
  template: `
    <div class="card">
      <p-tabs value="0" scrollable>
        <p-tablist>
          @for (tab of scrollableTabs; track tab.value) {
              <p-tab [value]="tab.value">
                  {{ tab.title }}
              </p-tab>
          }
        </p-tablist>
        <p-tabpanels>
          @for (tab of scrollableTabs; track tab.value) {
              <p-tabpanel [value]="tab.value">
                  <p class="m-0">{{ tab.content }}</p>
              </p-tabpanel>
          }
        </p-tabpanels>
      </p-tabs>
    </div>`,
  standalone: true,
  selector: 'app-gogo-buy',
  imports: [
    CarouselModule,
    CardModule,
    ButtonModule,
    DialogModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputNumberModule,
    FloatLabelModule,
    TabsModule,
    TooltipModule,
    PanelModule,
    SelectModule,
  ],
  templateUrl: './gogo-buy.component.html',
  styleUrl: './gogo-buy.component.scss'
})
export class GogoBuyComponent {
  constructor(
    public router: Router,
    private http: HttpService,
    private sanitizer: DomSanitizer,
    public auths: AuthService,
    private storeService: StoreService,
  ) { }

  readonly storeStage = signal<0 | 1>(0);
  readonly storeInitial = 5;   // 初始顯示
  readonly storeExpanded = 10;  // 第一次查看更多後顯示

  visibleStores = computed(() => {
    const limit = this.storeStage() === 0 ? this.storeInitial : this.storeExpanded;
    return this.auths.store().slice(0, limit);

  });

  storeCtaLabel = computed(() => this.storeStage() === 0 ? '查看更多' : '查看全部');

  onStoreCtaClick() {
    if (this.storeStage() === 0) this.storeStage.set(1);
    else this.router.navigate(['/gogobuy/list']); // 店家列表頁
  }


  // 計算遮罩用
  numVisible = 3;

  // 一進來就先指定中間那張 = 1（因為 page 預設從 0 開始，visible=3 中間就是 0+1）
  centerIndex = 1;

  activeTab: any = "allstores";  // tab 預設值
  @ViewChild(Tooltip) tooltip!: Tooltip;
  storeList: Store[] = [];
  fastStoreList: Store[] = [];
  slowStoreList: Store[] = [];
  openStoreList: Store[] = [];
  closeStoreList: Store[] = [];
  private idleTimer: any;
  visibleTooltip: boolean = true;
  storeSearch!: string;
  allStoresBackup: Store[] = []; // 備份完整清單
  scrollableTabs!: any[];


  ngOnInit(): void {
    // 全部開團
    this.auths.loadAllEventsOnce();
    // this.auths.performEventSearch('');

    // 店家
    if (this.auths.store().length == 0) {
      this.auths.performSearch('');

    }

    this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((res:any)=>{
      const rawData = res.storeList || [];
      this.storeList = rawData.map((store: any) => {
        let parsedFees:FeeDescriptionVoList[] = [];
        // 檢查是否有值且為字串，才進行解析
        if (store.feeDescription && typeof store.feeDescription === 'string') {
          try {
            parsedFees = JSON.parse(store.feeDescription);
          } catch (e) {
            console.error('解析運費失敗:', e, store.feeDescription);
            parsedFees = []; // 解析失敗給空陣列
          }
        } else if (Array.isArray(store.feeDescription)) {
          parsedFees = store.feeDescription; // 如果已經是物件就直接賦值
        }

        return {
          ...store,
          feeDescription: parsedFees // 這裡就是你要的正常物件陣列
        };
      });
      this.storeList = this.storeList.filter(store => !store.deleted && store.publish);  // 未刪除且公開
      this.allStoresBackup = this.storeList;
      this.fastStoreList = this.storeList.filter(store => !store.force_closed && store.category == "fast");
      console.log(this.fastStoreList);
      this.slowStoreList = this.storeList.filter(store => store.category == "slow");  // 只有團購可以顯示未營業，外送不可
      this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
      this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
    });
    // 假資料，待後端串接
    // this.storeList = [
    //   {
    //     id: 1, name: "清新搖搖冰", phone: "04-2345-6789", address: "台中市西區公益路200號",
    //     category: "外送", type: "飲品A", memo: "微糖微冰最推薦",
    //     image: "https://picsum.photos/200/300?random=1", feeDescription: "外送費 $20",
    //     deleted: false, publish: true, force_closed: true, created_by: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    //   },
    //   {
    //     id: 2, name: "阿嬤雜貨鋪", phone: "05-5544-3322", address: "嘉義市西區中山路",
    //     category: "外送", type: "雜貨B", memo: "什麼都有什麼都賣",
    //     image: "https://picsum.photos/200/300?random=2", feeDescription: "免收服務費",
    //     deleted: false, publish: true, force_closed: false, created_by: "e4d3c2b1-a0b9-4c8d-7e6f-5a4b3c2d1e0f"
    //   },
    //   {
    //     id: 3, name: "美味漢堡店", phone: "02-1234-5678", address: "台北市大安區新生南路一段1號",
    //     category: "外送", type: "美食C", memo: "特製花生醬漢堡必點",
    //     image: "https://picsum.photos/200/300?random=3", feeDescription: "外送費 $30",
    //     deleted: false, publish: true, force_closed: false, created_by: "550e8400-e29b-41d4-a716-446655440000"
    //   },
    //   {
    //     id: 4, name: "森林系咖啡館", phone: "08-8901-2345", address: "屏東縣屏東市公園路5號",
    //     category: "外送", type: "飲品D", memo: "安靜舒適，適合工作",
    //     image: "https://picsum.photos/200/300?random=4", feeDescription: "內用低消一杯飲品",
    //     deleted: false, publish: false, force_closed: false, created_by: "c9b8a7d6-e5f4-3c2b-1a0d-9e8f7a6b5c4d"
    //   },
    //   {
    //     id: 5, name: "潔淨洗鞋大師", phone: "06-1122-3344", address: "台南市東區大學路",
    //     category: "團購", type: "其他E", memo: "給愛鞋煥然一新的機會",
    //     image: "https://picsum.photos/200/300?random=5", feeDescription: "兩雙以上享 8 折",
    //     deleted: true, publish: true, force_closed: true, created_by: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c"
    //   },
    //   {
    //     id: 6, name: "老張牛肉麵", phone: "07-3456-7890", address: "高雄市新興區中正三路15號",
    //     category: "外送", type: "美食F", memo: "湯頭濃郁，肉質軟嫩",
    //     image: "https://picsum.photos/200/300?random=6", feeDescription: "僅供自取",
    //     deleted: false, publish: true, force_closed: false, created_by: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    //   },
    //   {
    //     id: 7, name: "萌寵樂園", phone: "02-5566-4433", address: "新北市板橋區文化路",
    //     category: "團購", type: "其他", memo: "溫柔洗澡不驚嚇",
    //     image: "https://picsum.photos/200/300?random=7", feeDescription: "需提前一週預約",
    //     deleted: false, publish: true, force_closed: false, created_by: "a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d"
    //   },
    //   {
    //     id: 8, name: "醇香烘焙拿鐵", phone: "02-2233-4455", address: "台北市信義區忠孝東路四段",
    //     category: "外送", type: "飲品", memo: "衣索比亞精品豆限量供應",
    //     image: "https://picsum.photos/200/300?random=8", feeDescription: "滿 $1000 免運",
    //     deleted: false, publish: true, force_closed: false, created_by: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"
    //   },
    //   {
    //     id: 9, name: "深夜食堂拉麵", phone: "02-8765-4321", address: "台北市信義區忠孝東路五段10號",
    //     category: "外送", type: "美食", memo: "濃厚豚骨湯頭",
    //     image: "https://picsum.photos/200/300?random=9", feeDescription: "外送費 $50",
    //     deleted: false, publish: true, force_closed: false, created_by: "123e4567-e89b-12d3-a456-426614174000"
    //   },
    //   {
    //     id: 10, name: "綠意選物店", phone: "04-9988-7766", address: "台中市北區崇德路",
    //     category: "團購", type: "雜貨", memo: "文青最愛的設計單品",
    //     image: "https://picsum.photos/200/300?random=10", feeDescription: "宅配運費 $80",
    //     deleted: false, publish: true, force_closed: false, created_by: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"
    //   },
    //   {
    //     id: 11, name: "快速裁縫鋪", phone: "03-2233-1122", address: "新竹市北區北大路",
    //     category: "團購", type: "其他", memo: "阿姨手工精細",
    //     image: "https://picsum.photos/200/300?random=11", feeDescription: "依內容報價",
    //     deleted: false, publish: true, force_closed: true, created_by: "c1b2a3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
    //   },
    //   {
    //     id: 12, name: "泰想吃", phone: "03-7890-1234", address: "新竹市東區光復路二段80號",
    //     category: "外送", type: "美食", memo: "打拋豬超下飯",
    //     image: "https://picsum.photos/200/300?random=12", feeDescription: "團購滿 $1000 九折",
    //     deleted: false, publish: true, force_closed: false, created_by: "3d9a1f2b-6c4e-4b8a-9d0f-1e2a3b4c5d6e"
    //   },
    //   {
    //     id: 13, name: "找茶趣", phone: "03-5566-7788", address: "桃園市中壢區實踐路",
    //     category: "外送", type: "飲品", memo: "高山青茶清甜回甘",
    //     image: "https://picsum.photos/200/300?random=13", feeDescription: "買五送一",
    //     deleted: false, publish: true, force_closed: false, created_by: "f1a2b3c4-d5e6-4b7c-8a9d-0e1f2a3b4c5d"
    //   },
    //   {
    //     id: 14, name: "午后漫步書屋", phone: "02-6677-8899", address: "新北市永和區中正路",
    //     category: "團購", type: "其他", memo: "閱讀配甜點",
    //     image: "https://picsum.photos/200/300?random=14", feeDescription: "滿 $500 享 9 折",
    //     deleted: false, publish: true, force_closed: false, created_by: "d5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a"
    //   },
    //   {
    //     id: 15, name: "喵喵罐頭工廠", phone: "04-7788-9900", address: "彰化縣彰化市中山路",
    //     category: "團購", type: "其他", memo: "無添加天然肉塊",
    //     image: "https://picsum.photos/200/300?random=15", feeDescription: "整箱購買優惠",
    //     deleted: false, publish: true, force_closed: false, created_by: "e1d2c3b4-a5f6-4a7b-8c9d-0e1f2a3b4c5d"
    //   }
    // ];
  }

  // 監聽全域滑鼠移動
  @HostListener('document:mousemove')
  @HostListener('document:touchstart')
  onUserActivity() {
    this.resetIdleTimer();
  }
  private resetIdleTimer() {
    if (this.tooltip) {
      // 只要有動作，先立刻隱藏目前的 Tooltip
      this.tooltip.deactivate();
      // 清除舊的計時器，防止重複觸發
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }
      // 設定靜止時間後自動開啟
      this.idleTimer = setTimeout(() => {
        this.showTooltip();
      }, 2000);
    }
  }
  private showTooltip() {
    if (this.tooltip && !this.tooltip.disabled) {
      this.tooltip.activate();
    }
  }

  // 手機板輪播修改設定
  responsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  isMobile = window.innerWidth <= 560;

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 560;
  }


  // Carousel 初始後，設定中心卡片
  ngAfterViewInit() {
    this.updateCenterIndex(0);
  }

  ngOnDestroy() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    for (const url of this.objectUrlPool) URL.revokeObjectURL(url);
    this.objectUrlPool = [];
  }

  // event.page 是頁數d
  onCarouselPage(event: any) {
    // event.page = 當前「第一張」的 index  :contentReference[oaicite:1]{index=1}
    this.updateCenterIndex(event.page);
  }

  private updateCenterIndex(firstIndex: number) {
    const middleOffset = Math.floor(this.numVisible / 2); // 3 -> 1
    this.centerIndex = (firstIndex + middleOffset) % this.banners.length;
  }

  // eventCards：把 events 依 storeId join 到 store 清單，補上 storeName/type/address + displayImage fallback
  // 注意：store 尚未載入時，storeName 會 fallback（避免 undefined）
  eventCards = computed(() => {
    const stores = this.auths.store();
    const storeMap = new Map(stores.map(s => [s.id, s]));

    return this.auths.events().map(e => {
      const sid = Number(e.storeId ?? e.storesId);
      const s = storeMap.get(sid);

      return {
        ...e,
        store: s,
        storeName: s?.name ?? e.storeName ?? '未知店家',
        storeType: s?.type ?? '',
        storeAddress: s?.address ?? '',
        displayImage: s?.image || e.image || '',
      };
    });
  });

  //輪播圖片
  banners: Banner[] = [
    {
      image: 'fastFood.png',
      title: '速食限時優惠',
      link:'https://v19.primeng.org/carousel'
    },
    {
      //位置
      image: 'Bubble.png',
      //圖片無法顯示時文字
      title: '揪團喝珍奶',
      link:'https://v19.primeng.org/carousel'
    },
    {
      image: 'JapaneseFood.png',
      title: '日式料理團購開團中'
    },
    {
      image: 'fastFood.png',
      title: '速食限時優惠'
    }
    ,
    {
      //位置
      image: 'Bubble.png',
      //圖片無法顯示時文字
      title: '揪團喝珍奶'
    }
  ];


  visible: boolean = false;
  showDialog() {
    this.visible = true;
    this.disableScroll();
    this.storeSearch = "";  // 搜尋初始化
    this.letterSearch();  // 資料回整
  }
  disableScroll() {
    // 1. 取得當前滾動位置，防止畫面跳動
    const scrollY = window.scrollY;
    const body = document.body;
    // 2. 將 body 固定住
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflowY = 'hidden';
  }
  enableScroll() {
    const body = document.body;
    const scrollY = body.style.top;
    // 3. 還原 body 樣式
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflowY = '';
    // 4. 滾動回原本位置
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }
  get uniqueTabs() {
    // 提取所有的 category 並透過 Set 過濾重複，再轉回陣列
    return [...new Set(this.storeList.map(item => item.type))];
  }

  get filteredFastStoreList() {
    return this.fastStoreList.filter(store =>
      this.activeTab === 'allstores' || store.type === this.activeTab
    );
  }
  get filteredSlowStoreList() {
    return this.slowStoreList.filter(store =>
      this.activeTab === 'allstores' || store.type === this.activeTab
    );
  }
  get filteredOpenStoreList() {
    return this.openStoreList.filter(store =>
      this.activeTab === 'allstores' || store.type === this.activeTab
    );
  }
  get filteredCloseStoreList() {
    return this.closeStoreList.filter(store =>
      this.activeTab === 'allstores' || store.type === this.activeTab
    );
  }


  // 即時搜尋
  fast: Store[] = [];  //備份模糊搜尋
  slow: Store[] = [];  //備份模糊搜尋
  @ViewChild('storeTabs') storeTabs: any;
  letterSearch() {
    const searchKey = this.storeSearch.toLowerCase().trim();
    if (!searchKey) {  // 搜尋資料不存在，還原成完整清單
      this.storeList = [...this.allStoresBackup];
      this.fastStoreList = this.storeList.filter(store => !store.force_closed && store.category == "fast");
      this.slowStoreList = this.storeList.filter(store => store.category == "slow");  // 只有團購可以顯示未營業，外送不可
      this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
      this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
      this.activeTab = 'allstores';
    }
    if (searchKey && searchKey.length > 0) {  // 有搜尋資料，tab回到"全部店家"，下拉選單回不選狀態
      this.activeTab = 'allstores';
      this.choice = "";
    }
    const eachLetter = searchKey.split('');
    this.storeList = this.allStoresBackup.filter((store: any) => {
      const storeName = store.name.toLowerCase();
      return eachLetter.every(char => storeName.includes(char));
    });
    this.fastStoreList = this.storeList.filter(store => !store.force_closed && store.category == "fast");
    this.slowStoreList = this.storeList.filter(store => store.category == "slow");  // 只有團購可以顯示未營業，外送不可
    this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
    this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
    this.fast = [...this.fastStoreList];
    this.slow = [...this.slowStoreList];
  }
  highlight(text: string): SafeHtml {
    // 1. 如果沒有搜尋字串、沒有內容，或是搜尋字串全是空白，直接回傳原文字
    if (!this.storeSearch || !this.storeSearch.trim() || !text) {
      return text;
    }
    // 2. 轉義特殊正則字元，並過濾掉空白字元，只保留有意義的字母/漢字
    // 使用 Set 去除重複輸入的字，例如輸入 "天天" 只會處理一個 "天"
    const searchChars = Array.from(new Set(
      this.storeSearch.toLowerCase().split('').filter(char => char.trim() !== '')
    ));
    if (searchChars.length === 0) return text;
    // 3. 組成正則表達式，例如 "貨|店"
    const pattern = searchChars
      .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    // 4. 進行取代
    const result = text.replace(regex, '<span style="color: #2894FF; font-weight: bold;">$1</span>');
    // 5. 告訴 Angular 這個 HTML 是安全的
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  addStore() {
    // 跳轉前手動銷毀 Tooltip，防止文字殘留
    if (this.tooltip) {
      this.tooltip.deactivate();
      this.tooltip.hide();
    }
    clearTimeout(this.idleTimer);
    this.visible = false;
    this.enableScroll();
    this.storeService.clearCurrentStore();
    this.router.navigate(['/management/store_upsert']);
  }
  goStoreInfo(storeId: number) {
    // 跳轉前手動銷毀 Tooltip，防止文字殘留
    if (this.tooltip) {
      this.tooltip.deactivate();
      this.tooltip.hide();
    }
    clearTimeout(this.idleTimer);
    this.visible = false;
    this.enableScroll();
    this.router.navigate(['/management/store_info', storeId]);
  }

  open = false;
  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.open = !this.open;
  }
  choice!: string;
  choose(category: string) {
    this.activeTab = "allstores";
    if (this.storeSearch.trim().length > 0) {
      if (category == "fast") {
        this.choice = "外送";
        this.fastStoreList = [...this.fast];
        this.storeList = [...this.fast];  // tab篩選用
        this.uniqueTabs;
        this.slowStoreList = [];
        this.openStoreList = [];
        this.closeStoreList = [];
      } else if (category == "slow") {
        this.choice = "團購";
        this.slowStoreList = [...this.slow];
        this.storeList = [...this.slow];  // tab篩選用
        this.uniqueTabs;
        this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
        this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
        this.fastStoreList = [];
      } else if (category == "all") {
        this.choice = "不限";
        this.fastStoreList = [...this.fast];  // 復原
        this.slowStoreList = [...this.slow];  // 復原
        this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
        this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
        this.storeList = [...this.fastStoreList, ...this.slowStoreList];  // tab篩選用
        this.uniqueTabs;
      }
    } else {
      if (category == "fast") {
        this.choice = "外送";
        this.storeList = this.allStoresBackup.filter(store => !store.force_closed && store.category == "fast");  // tab篩選用
        this.uniqueTabs;
        this.fastStoreList = this.allStoresBackup.filter(store => !store.force_closed && store.category == "fast");
        this.slowStoreList = [];
        this.openStoreList = [];
        this.closeStoreList = [];
      } else if (category == "slow") {
        this.choice = "團購";
        this.storeList = this.allStoresBackup.filter(store => store.category == "slow");  // tab篩選用
        this.uniqueTabs;
        this.fastStoreList = [];
        this.slowStoreList = this.allStoresBackup.filter(store => store.category == "slow");  // 只有團購可以顯示未營業，外送不可
        this.openStoreList = this.slowStoreList.filter(store => store.force_closed);
        this.closeStoreList = this.slowStoreList.filter(store => !store.force_closed);
      } else if (category == "all") {
        this.choice = "不限";
        this.storeList = this.allStoresBackup;  // tab篩選用
        this.uniqueTabs;
        this.fastStoreList = this.allStoresBackup.filter(store => !store.force_closed && store.category == "fast");
        this.slowStoreList = this.allStoresBackup.filter(store => store.category == "slow");  // 只有團購可以顯示未營業，外送不可
        this.openStoreList = this.slowStoreList.filter(store => !store.force_closed);
        this.closeStoreList = this.slowStoreList.filter(store => store.force_closed);
      }
    }

    this.close();
  }
  close() {
    this.open = false;
  }
  @HostListener('document:click')
  onDocumentClick() {
    this.open = false;
  }
  /* 開團 TYPE filtered */
  // 在 p-select 改值，這個 signal 就會更新，進而觸發下面的 computed 重新計算(正在開團中的TYPE)
  readonly selectedType = signal<string>('ALL');

  // 取 type 的工具(.trim()避免後端塞空白造成「看起來一樣、其實字串不同」)
  private getEventType(e: any): string {
    return (e.type).trim();
  }

  // p-select 的 options
  readonly eventTypeOptions = computed(() => {

    // 從 events 抽出每筆的 type
    const types = this.auths.events().map(e => this.getEventType(e));

    // 統計各 type 出現次數
    const count = new Map<string, number>();
    for (const t of types) count.set(t, (count.get(t) ?? 0) + 1);

    // 變成 p-select 要的 [{label, value}] 格式
    const unique = Array.from(count.keys()).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

    // 額外加一個「全部」
    return [
      { label: `全部`, value: 'ALL' },
      ...unique.map(t => ({ label: `${t}`, value: t })),
    ];
  });

  // 取 status（避免欄位名不同 / 空白）
  private getEventStatus(e: any): string {
    return String(e.status)
      .trim()
      .toUpperCase();
  }

  // 「正在開團」的狀態（依後端定義調整）
  private readonly ACTIVE_STATUS = new Set(['OPEN']);
  // 如果你後端還有 ONGOING / IN_PROGRESS，就加進去：
  // new Set(['OPEN', 'ONGOING', 'IN_PROGRESS'])

  // 篩選開團
  readonly filteredEventCards = computed(() => {

    // 使用者選到的類別
    const t = this.selectedType();

    // 先把 FINISHED / 非 OPEN 的過濾掉
    const activeCards = this.eventCards().filter(c => this.ACTIVE_STATUS.has(this.getEventStatus(c)));

    if (t === 'ALL') return activeCards;
    return activeCards.filter(c => this.getEventType(c) === t);
  });

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

  private objectUrlPool: string[] = [];

  storeImgSrc(store: any): string {
    const img = store?.image;

    // 1) null/空字串 → 直接用 fallback
    if (!img) return `https://picsum.photos/800/600?random=${store?.id ?? Math.random()}`;

    // 2) string：可能是 URL / dataURL / base64
    if (typeof img === 'string') {
      const s = img.trim();

      // 已經是可用的 src
      if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') || s.startsWith('data:image/')) {
        return s;
      }

      // 看起來像純 base64（iVBORw0K...），幫它補 dataURL 前綴
      const looksLikeBase64 = s.length > 50 && /^[A-Za-z0-9+/=\r\n]+$/.test(s);
      if (looksLikeBase64) return `data:image/png;base64,${s}`;

      // 其他亂碼（例如你之前看到的 �PNG）就只能 fallback
      return `https://picsum.photos/800/600?random=${store?.id ?? Math.random()}`;
    }

    // 3) number[]：byte array → 轉成 blob: URL
    if (Array.isArray(img) && img.length > 0 && typeof img[0] === 'number') {
      const blob = new Blob([new Uint8Array(img)], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      this.objectUrlPool.push(url);
      return url;
    }

    // 4) 常見包裝：{ data: number[] } / { bytes: number[] }
    const maybeArr = img?.data ?? img?.bytes;
    if (Array.isArray(maybeArr) && maybeArr.length > 0 && typeof maybeArr[0] === 'number') {
      const blob = new Blob([new Uint8Array(maybeArr)], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      this.objectUrlPool.push(url);
      return url;
    }

    return `https://picsum.photos/800/600?random=${store?.id ?? Math.random()}`;
  }

}
