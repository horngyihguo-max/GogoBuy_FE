import { Component, signal } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../@service/auth.service';
import { HttpService } from '../@service/http.service';

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

@Component({
  selector: 'app-gogo-buy',
  imports: [
    CarouselModule,
    CardModule,
    ButtonModule,
  ],
  templateUrl: './gogo-buy.component.html',
  styleUrl: './gogo-buy.component.scss'
})
export class GogoBuyComponent {
  constructor(private https: HttpService, public auths: AuthService) {
  }
  numVisible = 3;

  // ✅ 一進來就先指定中間那張 = 1（因為 page 預設從 0 開始，visible=3 中間就是 0+1）
  centerIndex = 1;

  // 取得開團中
  events = signal<any[]>([]);

  loadAllEvents() {
    this.auths.getallevent().subscribe({
      next: (res: any) => {
        // 準備一組給開團用的假圖 (可以跟店家的不同，增加多樣性)
        const eventDemoImages = [
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // 烤肉
          // 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', // 披薩
          // 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800', // 義大利麵
        ];

        const processedEvents = (res.groupbuyEvents || []).map((event: any, i: number) => ({
          ...event,
          // 如果沒有活動圖，就隨機給一張
          image: event.image || eventDemoImages[i % eventDemoImages.length]
        }));

        console.log('處理後的開團資料:', processedEvents);
        this.events.set(processedEvents);
      },
      error: (err: any) => console.error('抓取開團失敗', err)
    });
  }
  ngOnInit(): void {
    // 1. 抓取開團中
    this.loadAllEvents();

    // 2. 如果 Service 沒資料，抓取店家
    if (this.auths.store().length === 0) {
      this.auths.performSearch('');
    }
  }

  ngAfterViewInit() {
    // Carousel 相關的 UI 計算保留在這裡
    this.updateCenterIndex(0);
  }

  onCarouselPage(event: any) {
    // event.page = 當前「第一張」的 index  :contentReference[oaicite:1]{index=1}
    this.updateCenterIndex(event.page);
  }

  private updateCenterIndex(firstIndex: number) {
    const middleOffset = Math.floor(this.numVisible / 2); // 3 -> 1
    this.centerIndex = (firstIndex + middleOffset) % this.banners.length;
  }

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
}


