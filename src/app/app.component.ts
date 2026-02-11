import { Component, computed, HostListener, signal, ViewChild, inject, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from './@service/auth.service';
import { HttpService } from './@service/http.service';
import { NotificationBellComponent } from './account/notification-bell/notification-bell.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { NearbyBarComponent } from './nearby-bar.component';
import { Subscription } from 'rxjs';
import { filter, distinctUntilChanged, map } from 'rxjs/operators';
import { SseService } from './@service/sse.service';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';


// 選擇欄位
type SearchMode = 'store' | 'host' | 'event';

export interface Category {
  name: string;
  value: SearchMode;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    InputTextModule,
    RouterLink,
    MenuModule,
    CommonModule,
    NotificationBellComponent,
    InputGroupModule,
    InputGroupAddonModule,
    FloatLabelModule,
    SelectModule,
    FormsModule,
    NearbyBarComponent,
    AvatarModule,
    TooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {

  private sub?: Subscription;

  showAdminBtn: boolean = false;

  constructor(
    public router: Router,
    private http: HttpService,
    public auths: AuthService,
    public sse: SseService) {
  }
  title = 'gogobuy';

  geoMode = signal<'auto' | 'manual'>('manual'); // auto=定位即時，manual=手動地址
  geoState = signal<'unknown' | 'granted' | 'prompt' | 'denied'>('unknown');

  nearbyStatus = signal('');                 // 顯示提示文字
  nearbyRadiusKm = signal<5 | 10 | 15 | 20>(5);
  manualAddress = signal('');                // 手動地址

  radiusOptions = [
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '15 km', value: 15 },
    { label: '20 km', value: 20 },
  ];

  private watchId: number | null = null;
  private lastFetchAt = 0;
  private lastLatLng: { lat: number; lng: number } | null = null;

  category: Category[] = [
    { name: '店家', value: 'store' },
    { name: '團長', value: 'host' },
    { name: '團名', value: 'event' }
  ];


  // 即時監測pmenu
  @ViewChild('menu') mainMenu!: Menu;
  @ViewChild('problemMenu') problemMenu!: Menu;

  // 即時監測搜尋欄位
  @ViewChildren('searchInput') searchInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // 1. 注入 Service (建議用 inject 寫法，比較現代)
  private auth = inject(AuthService);


  // 2. 【關鍵】把 toSignal 放在這裡 (類別屬性)，不要放在 ngOnInit
  // 這行程式碼會在 Component 建立的瞬間執行
  user = toSignal(this.auth.user$, { initialValue: null });


  // 3. computed 也是放在這裡
  // 這會變成一個唯讀的 Signal，Template 可以直接用 userAvatar() 讀取
  userAvatar = computed(() => {
    const u: any = this.user();
    if (!u) return null;
    console.log(u.user_avatar_url)
    console.log(u.avatar_url)
    console.log(u.avatarUrl)
    return u.user_avatar_url || u.avatar_url || u.avatarUrl || '/default_avatar.png';
  });

  ngOnInit(): void {
    // 初始載入
    this.auths.performSearch('');
    this.auths.loadAllEventsOnce();
    this.sub = this.auth.user$
      .pipe(
        filter((u: any) => !!u && !!u.id),
        map((u: any) => u.id),
        distinctUntilChanged()
      )
      .subscribe((userId: string) => {
        this.sse.connect(userId);
      });
    this.auth.refreshUser();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.stopNearbyWatch();
  }

  isAdmin(): boolean {
    try {
      const raw = localStorage.getItem('user_info');
      if (!raw) return false;

      const user = JSON.parse(raw);

      const userRole = user.role;

      return userRole == 'admin';
    } catch {
      return false;
    }
  }

  // 切換搜尋模式
  searchMode = signal<SearchMode>('store');
  onSearchModeChangePrime(e: any) {
    // e.value 會是你 optionValue 指定的 value（也就是 'store'|'host'|'event'）
    this.searchMode.set(e.value as SearchMode);
    this.resetSearch();
  }


  // 切換搜尋類型時清空輸入(回到「全部店家 / 全部開團」狀態)，避免不同模式結果混在一起
  private resetSearch() {
    // 清空所有同名 #searchInput
    this.searchInputs?.forEach(ref => ref.nativeElement.value = '');

    // 回到全部
    this.auths.performSearch('');
    this.auths.events.set(this.auths.eventsAll());
  }

  // 切換類型時，input對應類型顯示內容
  searchPlaceholder = computed(() => {
    switch (this.searchMode()) {
      case 'store': return '輸入店家名稱...';
      case 'host': return '輸入團長暱稱...';
      case 'event': return '輸入團名...';
      default: return '搜尋...';
    }
  });


  // 搜尋
  onSearch(keyword: string) {
    const q = (keyword ?? '').trim();
    const mode = this.searchMode();

    // 原本三種保持不變
    if (!q) {
      this.auths.performSearch('');
      this.auths.events.set(this.auths.eventsAll());
      return;
    }
    if (mode == 'store') return this.auths.performSearch(q);
    if (mode == 'host') return this.auths.performEventSearch(q);
    if (mode == 'event') return this.auths.filterEventsByName(q);
  }

  // 用戶頭向下拉選單
  items: MenuItem[] = [
    { label: '用戶首頁', icon: 'pi pi-user', routerLink: '/user/profile' },
    { label: '我的訂單', icon: 'pi pi-receipt', routerLink: '/user/orders' },
    { label: '我的店家', icon: 'pi pi-shop', routerLink: '/user/my_store' },
    { label: '許願池', icon: 'pi pi-sparkles', routerLink: '/user/wishes' },
    { label: '登入', icon: 'pi pi-sign-in', routerLink: '/gogobuy/login' },
    { label: '登出', icon: 'pi pi-sign-out', command: () => { this.logout(); } }
  ];

  // 手機端常見問題選單
  problems: MenuItem[] = [
    { label: '隱私政策', icon: 'pi pi-shield', routerLink: '/support/privacy' },
    { label: '服務條款', icon: 'pi pi-book', routerLink: '/support/conditions' },
    { label: '常見問題', icon: 'pi pi-headphones', routerLink: '/support/faq' },
  ];

  // startsWith：讓 /gogobuy/home 及其子路由都顯示搜尋欄
  get showSearch(): boolean {
    return this.router.url.startsWith('/gogobuy/home');
  }

  // 滾動時收起 PrimeNG Menu，避免遮擋內容與定位錯亂
  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.mainMenu?.visible) {
      this.mainMenu.hide();
    }
    if (this.problemMenu?.visible) {
      this.problemMenu.hide();
    }
  }

  // 手機板我的選單
  onUserClick(event: any, menu: any) {
    const items = this.filteredItems;
    if (items && items.length > 0) {
      event.stopPropagation();
      menu.toggle(event);
    } else {
      console.log('選單內容為空');
    }
  }

  // 判斷是否已登入
  get isLoggedIn(): boolean {
    return !!localStorage.getItem('user_id');
  }

  // 判斷是否為手機
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // 使用session判斷選單出現列表
  // 手機版：只顯示登入/登出(排除個人資訊、訂單)
  // 桌機版：依登入狀態顯示登入或登出
  get filteredItems() {
    const loggedIn = this.isLoggedIn;
    const mobile = this.isMobile;
    return this.items.filter(item => {
      // 如果偵測到session顯示登出
      if (item.label == '登出') {
        return loggedIn;
      }

      // 如果沒有偵測到session顯示登入
      if (item.label == '登入') {
        return !loggedIn;
      }

      if (loggedIn && mobile) {
        return false;
      }

      if (!loggedIn && mobile) {
        return false;
      }

      return true;
    });
  }

  // 跳轉購物車頁面
  gocart() {
    this.router.navigate(['/user/cart']);
  }

  toDashboard() {
    this.router.navigate(['/admin']);
  }

  // 登出清除session
  logout() {
    this.auths.logout();
    this.sse.disconnect();
    // 清除前端紀錄
    localStorage.clear();
    // 回到首頁
    this.router.navigate(['/gogobuy']);
    Swal.fire({
      title: '已登出',
      icon: 'success',
      showConfirmButton: false,
      timer: 1000
    });
  };

  // 查權限狀態
  private async refreshGeoPermissionState() {
    try {
      // permissions API 不是每個瀏覽器都有
      const anyNav: any = navigator;
      if (!anyNav.permissions?.query) {
        this.geoState.set('unknown');
        return;
      }
      const p = await anyNav.permissions.query({ name: 'geolocation' });
      this.geoState.set(p.state as any); // 'granted' | 'prompt' | 'denied'
    } catch {
      this.geoState.set('unknown');
    }
  }

  // 使用定位（允許後即時搜尋）
  enableNearbyAuto() {
    // 防止重複註冊 watchPosition
    if (this.watchId != null) {
      // 已經在追蹤了，就不要再開新的
      return;
      // 或者你想每次都重開：就改成 stopNearbyWatch(); 再繼續往下
      // this.stopNearbyWatch();
    }

    if (!navigator.geolocation) {
      this.geoMode.set('manual');
      this.nearbyStatus.set('此裝置不支援定位，請改用地址搜尋');
      return;
    }

    this.geoMode.set('auto');
    this.nearbyStatus.set('定位中...');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const now = Date.now();
        if (now - this.lastFetchAt < 15000) return;

        this.lastFetchAt = now;
        this.lastLatLng = { lat, lng };

        this.fetchNearbyByGeo(lat, lng);
      },
      async () => {
        await this.refreshGeoPermissionState();
        this.geoMode.set('manual');
        this.nearbyStatus.set('定位失敗/被拒絕，請改用地址搜尋');
        this.stopNearbyWatch();
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }

  enableNearbyManual() {
    this.geoMode.set('manual');
    this.nearbyStatus.set(''); // 清空提示
    this.stopNearbyWatch(); // 停掉 watchPosition
    this.lastLatLng = null; // 避免半徑變更又用舊座標重查
  }

  contactUs() {
    this.router.navigate(['/support/faq'],
      { state: { scrollToBottom: true } }
    )
  }


  stopNearbyWatch() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // 半徑變更：若 auto 有座標就重新查；manual 有地址就重新查
  onNearbyRadiusChange(v: 5 | 10 | 15 | 20) {
    this.nearbyRadiusKm.set(v);

    if (this.geoMode() == 'auto' && this.lastLatLng) {
      this.fetchNearbyByGeo(this.lastLatLng.lat, this.lastLatLng.lng);
    }

    if (this.geoMode() == 'manual' && this.manualAddress().trim()) {
      this.fetchNearbyByAddress(this.manualAddress().trim());
    }
  }

  fetchNearbyByGeo(lat: number, lng: number) {
    const r = this.nearbyRadiusKm();
    this.nearbyStatus.set(`定位搜尋中（${r}km）...`);

    this.auths.searchNearbyStore(lat, lng, undefined, r).subscribe({
      next: (res: any) => {
        this.applyNearbyResult(res);
        this.nearbyStatus.set(res.message ?? '完成');
      },
      error: (err: any) => this.nearbyStatus.set(err?.error?.message ?? 'API 失敗')
    });
  }

  fetchNearbyByAddress(address: string) {
    const r = this.nearbyRadiusKm();
    this.nearbyStatus.set(`地址搜尋中（${r}km）...`);

    this.auths.searchNearbyStore(undefined, undefined, address, r).subscribe({
      next: (res: any) => {
        this.applyNearbyResult(res);
        this.nearbyStatus.set(res.message ?? '完成');
      },
      error: (err: any) => this.nearbyStatus.set(err?.error?.message ?? 'API 失敗')
    });
  }

  // 更新 auths.store + 用 storeIds 篩 events
  private demoImages = [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
  ];

  private applyNearbyResult(res: any) {
    const list = (res.storeList ?? res.stores ?? res.data ?? []).map((s: any, i: number) => ({
      ...s,
      image: s.image || this.demoImages[i % this.demoImages.length],
    }));

    this.auths.store.set(list);
    this.auths.filterEventsByStoreIds(list.map((x: any) => x.id));
  }

}
