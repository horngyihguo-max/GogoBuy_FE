import { Component, HostListener, ViewChild } from '@angular/core';
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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  "feeDescription": string,
  "deleted": boolean,
  "publish": boolean,
  "force_closed": boolean,
  "created_by": string
}

@Component({
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
  ],
  templateUrl: './gogo-buy.component.html',
  styleUrl: './gogo-buy.component.scss'
})
export class GogoBuyComponent {
  constructor(public router: Router, private http: HttpService,
    private sanitizer: DomSanitizer
  ) { }

  // 計算遮罩用
  numVisible = 3;

  // 一進來就先指定中間那張 = 1（因為 page 預設從 0 開始，visible=3 中間就是 0+1）
  centerIndex = 1;

  activeTab: any = "allstores";  // tab 預設值
  @ViewChild(Tooltip) tooltip!: Tooltip;
  storeList: Store[] = [];
  openStoreList: Store[] = [];
  closeStoreList: Store[] = [];
  private idleTimer: any;
  visibleTooltip: boolean = true;
  storeSearch!: string;
  allStoresBackup: Store[] = []; // 備份完整清單


  ngOnInit(): void {
    // this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((res:any)=>{
    //   this.storeList=res.storeList;
    // });
    this.storeList = [
      {
        id: 1, name: "清新搖搖冰", phone: "04-2345-6789", address: "台中市西區公益路200號",
        category: "飲品", type: "手搖飲", memo: "微糖微冰最推薦",
        image: "https://picsum.photos/200/300?random=1", feeDescription: "外送費 $20",
        deleted: false, publish: true, force_closed: true, created_by: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
      },
      {
        id: 2, name: "阿嬤雜貨鋪", phone: "05-5544-3322", address: "嘉義市西區中山路",
        category: "雜貨", type: "古早味百貨", memo: "什麼都有什麼都賣",
        image: "https://picsum.photos/200/300?random=2", feeDescription: "免收服務費",
        deleted: false, publish: true, force_closed: false, created_by: "e4d3c2b1-a0b9-4c8d-7e6f-5a4b3c2d1e0f"
      },
      {
        id: 3, name: "美味漢堡店", phone: "02-1234-5678", address: "台北市大安區新生南路一段1號",
        category: "美食", type: "美式料理", memo: "特製花生醬漢堡必點",
        image: "https://picsum.photos/200/300?random=3", feeDescription: "外送費 $30",
        deleted: false, publish: true, force_closed: false, created_by: "550e8400-e29b-41d4-a716-446655440000"
      },
      {
        id: 4, name: "森林系咖啡館", phone: "08-8901-2345", address: "屏東縣屏東市公園路5號",
        category: "休息", type: "咖啡店", memo: "安靜舒適，適合工作",
        image: "https://picsum.photos/200/300?random=4", feeDescription: "內用低消一杯飲品",
        deleted: false, publish: false, force_closed: false, created_by: "c9b8a7d6-e5f4-3c2b-1a0d-9e8f7a6b5c4d"
      },
      {
        id: 5, name: "潔淨洗鞋大師", phone: "06-1122-3344", address: "台南市東區大學路",
        category: "生活", type: "專業洗鞋", memo: "給愛鞋煥然一新的機會",
        image: "https://picsum.photos/200/300?random=5", feeDescription: "兩雙以上享 8 折",
        deleted: true, publish: true, force_closed: false, created_by: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c"
      },
      {
        id: 6, name: "老張牛肉麵", phone: "07-3456-7890", address: "高雄市新興區中正三路15號",
        category: "美食", type: "中式料理", memo: "湯頭濃郁，肉質軟嫩",
        image: "https://picsum.photos/200/300?random=6", feeDescription: "僅供自取",
        deleted: false, publish: true, force_closed: false, created_by: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
      },
      {
        id: 7, name: "萌寵樂園", phone: "02-5566-4433", address: "新北市板橋區文化路",
        category: "寵物", type: "寵物美容", memo: "溫柔洗澡不驚嚇",
        image: "https://picsum.photos/200/300?random=7", feeDescription: "需提前一週預約",
        deleted: false, publish: true, force_closed: false, created_by: "a4b5c6d7-e8f9-4a0b-1c2d-3e4f5a6b7c8d"
      },
      {
        id: 8, name: "醇香烘焙拿鐵", phone: "02-2233-4455", address: "台北市信義區忠孝東路四段",
        category: "飲品", type: "咖啡豆專賣", memo: "衣索比亞精品豆限量供應",
        image: "https://picsum.photos/200/300?random=8", feeDescription: "滿 $1000 免運",
        deleted: false, publish: true, force_closed: false, created_by: "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"
      },
      {
        id: 9, name: "深夜食堂拉麵", phone: "02-8765-4321", address: "台北市信義區忠孝東路五段10號",
        category: "美食", type: "日式料理", memo: "濃厚豚骨湯頭",
        image: "https://picsum.photos/200/300?random=9", feeDescription: "外送費 $50",
        deleted: false, publish: true, force_closed: false, created_by: "123e4567-e89b-12d3-a456-426614174000"
      },
      {
        id: 10, name: "綠意選物店", phone: "04-9988-7766", address: "台中市北區崇德路",
        category: "雜貨", type: "生活選物", memo: "文青最愛的設計單品",
        image: "https://picsum.photos/200/300?random=10", feeDescription: "宅配運費 $80",
        deleted: false, publish: true, force_closed: false, created_by: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"
      },
      {
        id: 11, name: "快速裁縫鋪", phone: "03-2233-1122", address: "新竹市北區北大路",
        category: "生活", type: "修改衣服", memo: "阿姨手工精細",
        image: "https://picsum.photos/200/300?random=11", feeDescription: "依內容報價",
        deleted: false, publish: true, force_closed: false, created_by: "c1b2a3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
      },
      {
        id: 12, name: "泰想吃", phone: "03-7890-1234", address: "新竹市東區光復路二段80號",
        category: "美食", type: "泰式料理", memo: "打拋豬超下飯",
        image: "https://picsum.photos/200/300?random=12", feeDescription: "團購滿 $1000 九折",
        deleted: false, publish: true, force_closed: false, created_by: "3d9a1f2b-6c4e-4b8a-9d0f-1e2a3b4c5d6e"
      },
      {
        id: 13, name: "找茶趣", phone: "03-5566-7788", address: "桃園市中壢區實踐路",
        category: "飲品", type: "現泡茶", memo: "高山青茶清甜回甘",
        image: "https://picsum.photos/200/300?random=13", feeDescription: "買五送一",
        deleted: false, publish: true, force_closed: false, created_by: "f1a2b3c4-d5e6-4b7c-8a9d-0e1f2a3b4c5d"
      },
      {
        id: 14, name: "午后漫步書屋", phone: "02-6677-8899", address: "新北市永和區中正路",
        category: "休息", type: "獨立書店", memo: "閱讀配甜點",
        image: "https://picsum.photos/200/300?random=14", feeDescription: "滿 $500 享 9 折",
        deleted: false, publish: true, force_closed: false, created_by: "d5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a"
      },
      {
        id: 15, name: "喵喵罐頭工廠", phone: "04-7788-9900", address: "彰化縣彰化市中山路",
        category: "寵物", type: "寵物食品", memo: "無添加天然肉塊",
        image: "https://picsum.photos/200/300?random=15", feeDescription: "整箱購買優惠",
        deleted: false, publish: true, force_closed: false, created_by: "e1d2c3b4-a5f6-4a7b-8c9d-0e1f2a3b4c5d"
      }
    ];
    this.storeList = this.storeList.filter(store => !store.deleted && store.publish);
    this.allStoresBackup = this.storeList;
    this.openStoreList = this.storeList.filter(store => !store.force_closed);
    this.closeStoreList = this.storeList.filter(store => store.force_closed);
  }

  // 監聽全域滑鼠移動
  @HostListener('document:mousemove')
  onMouseMove() {
    this.resetIdleTimer();
  }
  private resetIdleTimer() {
    if (this.tooltip) {
      // 滑鼠動就隱藏
      this.tooltip.deactivate();
      // 清除舊的計時器
      clearTimeout(this.idleTimer);
      // 設定 2 秒無動作後自動開啟
      this.idleTimer = setTimeout(() => {
        this.showTooltip();
      }, 1000);
    }
  }
  private showTooltip() {
    if (this.tooltip && !this.tooltip.disabled) {
      this.tooltip.activate();
    }
  }

  ngAfterViewInit() {
    this.updateCenterIndex(0);
  }

  ngOnDestroy() {
    // 組件銷毀時清除計時器，防止記憶體洩漏
    clearTimeout(this.idleTimer);
  }

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
        displayImage: e.image || s?.image || '',
      };
    });
  });

  // 假資料
  // stores: Stores[] = [
  //   {
  //     id: 1,
  //     name: '可不可熟成紅茶 台南育德店',
  //     phone: '06-251-8899',
  //     address: '台南市北區育德路58號',
  //     category: '餐點',
  //     type: '手搖飲',
  //     memo: '主打熟成紅茶，甜度可調整',
  //     image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800',
  //     fee_description: [
  //       { km: 5, fee: 15 },
  //       { km: 10, fee: 20 },
  //       { km: 15, fee: 25 },
  //     ],
  //     is_deleted: false,
  //     is_public: true,
  //     created_by: 'user_1001',
  //     force_closed: false,
  //   },
  //   {
  //     id: 2,
  //     name: '得正 台南公園計劃',
  //     phone: '06-223-7788',
  //     address: '台南市中西區公園路123號',
  //     category: '餐點',
  //     type: '手搖飲',
  //     memo: null,
  //     image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800',
  //     fee_description: [
  //       { km: 3, fee: 10 },
  //       { km: 8, fee: 18 },
  //       { km: 12, fee: 25 },
  //     ],
  //     is_deleted: false,
  //     is_public: true,
  //     created_by: 'user_1002',
  //     force_closed: false,
  //   },
  //   {
  //     id: 3,
  //     name: '喜得炭火燒三明治 西門北安店',
  //     phone: '06-282-5566',
  //     address: '台南市北區北安路一段88號',
  //     category: '餐點',
  //     type: '早餐',
  //     memo: '尖峰時段請耐心等候',
  //     image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
  //     fee_description: [
  //       { km: 2, fee: 10 },
  //       { km: 5, fee: 15 },
  //     ],
  //     is_deleted: false,
  //     is_public: true,
  //     created_by: 'user_1003',
  //     force_closed: false,
  //   },
  //   {
  //     id: 4,
  //     name: '路易莎咖啡 小北店',
  //     phone: '06-251-3322',
  //     address: '台南市北區小北路45號',
  //     category: '餐點',
  //     type: '咖啡',
  //     memo: '可提供大量訂購',
  //     image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
  //     fee_description: [
  //       { km: 5, fee: 20 },
  //       { km: 10, fee: 30 },
  //     ],
  //     is_deleted: false,
  //     is_public: true,
  //     created_by: 'user_1004',
  //     force_closed: true, // 突發公休
  //   },
  //   {
  //     id: 5,
  //     name: '全聯福利中心 台南育賢店',
  //     phone: '06-283-9988',
  //     address: '台南市北區育賢街12號',
  //     category: '生鮮雜貨',
  //     type: '超市',
  //     memo: '部分商品不提供外送',
  //     image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
  //     fee_description: [
  //       { km: 3, fee: 30 },
  //       { km: 6, fee: 50 },
  //       { km: 10, fee: 80 },
  //     ],
  //     is_deleted: false,
  //     is_public: true,
  //     created_by: 'admin_001',
  //     force_closed: false,
  //   },
  // ];

  //輪播圖片
  banners: Banner[] = [
    {
      image: 'fastFood.png',
      title: '速食限時優惠'
    },
    {
      //位置
      image: 'Bubble.png',
      //圖片無法顯示時文字
      title: '揪團喝珍奶'
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
    return [...new Set(this.storeList.map(item => item.category))];
  }

  // 即時搜尋
  @ViewChild('storeTabs') storeTabs: any;
  letterSearch() {
    const searchKey = this.storeSearch.toLowerCase().trim();
    if (!searchKey) {  // 搜尋資料不存在，還原成完整清單
      this.storeList = [...this.allStoresBackup];
      this.openStoreList = this.storeList.filter(store => !store.force_closed);
      this.closeStoreList = this.storeList.filter(store => store.force_closed);
      this.activeTab = 'allstores';
    }
    if (searchKey && searchKey.length > 0) {  // 有搜尋資料，tab回到"全部店家"
      this.activeTab = 'allstores';
    }
    const eachLetter = searchKey.split('');
    this.storeList = this.allStoresBackup.filter((store: any) => {
      const storeName = store.name.toLowerCase();
      return eachLetter.every(char => storeName.includes(char));
    });
    this.openStoreList = this.storeList.filter(store => !store.force_closed);
    this.closeStoreList = this.storeList.filter(store => store.force_closed);
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
    this.router.navigate(['/management/store']);
  }
}


