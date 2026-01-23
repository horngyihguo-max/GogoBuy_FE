import { Component, computed, HostListener, signal, ViewChild, inject, ElementRef } from '@angular/core';
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


// 選擇欄位
type SearchMode = 'store' | 'host' | 'event';
export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  role: 'ADMIN' | 'USER';
}

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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {

  constructor(public router: Router, private http: HttpService, public auths: AuthService) {
  }
  title = 'gogobuy';



  category: Category[] = [
    { name: '店家', value: 'store' },
    { name: '團長', value: 'host' },
    { name: '團名', value: 'event' },
  ];

  // 即時監測pmenu
  @ViewChild('menu') mainMenu!: Menu;
  @ViewChild('problemMenu') problemMenu!: Menu;

  // 即時監測搜尋欄位
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // 1. 注入 Service (建議用 inject 寫法，比較現代)
  private auth = inject(AuthService);


  // 2. 【關鍵】把 toSignal 放在這裡 (類別屬性)，不要放在 ngOnInit
  // 這行程式碼會在 Component 建立的瞬間執行
  user = toSignal(this.auth.user$, { initialValue: null });


  // 3. computed 也是放在這裡
  // 這會變成一個唯讀的 Signal，Template 可以直接用 userAvatar() 讀取
  userAvatar = computed(() => {
    const u = this.user(); // 這裡會自動追蹤 user 的變化

    if (!u) return null;


    const url = u.user_avatar_url || u.avatar_url || u.avatarUrl;
    return url || '/Snoopy.jpg';
  });

  // 4. ngOnInit 現在不需要處理頭像邏輯了

  ngOnInit(): void {
    // 初始載入
    this.auths.performSearch('');
    this.auths.loadAllEventsOnce();

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
    // 清空 input
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }

    // 重置結果
    this.auths.performSearch('');        // 全部店家
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
    const q = keyword.trim();
    const mode = this.searchMode();

    // 空白搜尋：全部店家 + 全部開團
    if (!q) {
      this.auths.performSearch('');
      this.auths.events.set(this.auths.eventsAll());
      return;
    }

    // 店家搜尋
    if (mode == 'store') {
      this.auths.performSearch(q);
      return;
    }

    // 團長搜尋用使用API
    if (mode == 'host') {
      this.auths.performEventSearch(q);
      return;
    }

    // 團名搜尋用 eventsAll 在前端 filter（不用 API
    if (mode == 'event') {
      this.auths.filterEventsByName(q);
      return;
    }
  }

  // 預設頭像
  // userAvatar: string | null = null;
  // ngOnInit() {
  //   this.auth.user$.subscribe(user => {
  //     console.log('導覽列收到使用者狀態更新:', user);

  //     if (user) {
  //       this.userAvatar = user.user_avatar_url || user.avatar_url || user.avatarUrl;
  //       if (!this.userAvatar) {
  //         this.userAvatar = '/Snoopy.jpg';
  //       }
  //     } else {
  //       this.userAvatar = null;
  //     }
  //   });
  //   // this.auth.refreshUser();
  // }

  // ngAfterViewInit() {
  //   // 在這裡主動判斷資料是否有變更 (判斷 Angular 所無法判斷的部分)
  //   if (!this.userAvatar || '/Snoopy.jpg' == this.userAvatar || 'assets/default-avatar.png' == this.userAvatar) {
  //     this.auth.user$.subscribe(user => {

  //       if (user) {
  //         const newUserAvatar = user.user_avatar_url || user.avatar_url || user.avatarUrl || 'Snoopy.jpg';
  //         if (this.userAvatar != newUserAvatar) {
  //           this.userAvatar = newUserAvatar;
  //         }
  //       } else {
  //         this.userAvatar = null;
  //       }
  //     });
  //   }
  // }

  // 用戶頭向下拉選單
  items: MenuItem[] = [
    { label: '用戶首頁', icon: 'pi pi-user', routerLink: '/user/profile' },
    { label: '我的訂單', icon: 'pi pi-receipt', routerLink: '/user/orders' },
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

  //登出清除session
  logout() {
    this.auth.logout();
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

}
