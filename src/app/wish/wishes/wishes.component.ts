import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { TabsModule } from 'primeng/tabs';
import { PaginatorModule } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

import Swal from 'sweetalert2';

import { HttpService } from '../../@service/http.service';
import { AuthService } from '../../@service/auth.service';

type MyFilter = 'all' | 'active' | 'finished' | 'expired';
type FoFilter = 'all' | 'active' | 'finished' | 'expired';

@Component({
  selector: 'app-wishes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    PaginatorModule,
    ToastModule,
    DialogModule,
    TooltipModule,
  ],
  templateUrl: './wishes.component.html',
  styleUrl: './wishes.component.scss',
  providers: [MessageService],
})
export class WishesComponent implements OnInit {
  constructor(
    private http: HttpService,
    public auth: AuthService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  // =========================
  // 用戶資料(ngOnInt注入)
  // =========================
  userId: string = '';
  timesRemaining = 0;

  // =========================
  // UI 狀態
  // =========================
  isLoading = true; // 這是判斷 "是否還在讀取中"
  activeTab = 0; // 0: all, 1: followed, 2: mine
  myFilter: MyFilter = 'all';
  foFilter: FoFilter = 'all';

  // 分頁（每個 tab 各自一套，避免互相干擾）
  pageSize = 10; // 可自行調
  pageAll = 0;
  pageFollowed = 0;
  pageMine = 0;

  // =========================
  // 資料
  // =========================
  wishes: any[] = [];

  // 隨機名稱池（匿名顯示用）
  private adjectives = [
    '可愛的',
    '閃亮的',
    '神祕的',
    '飢餓的',
    '開心的',
    '暴躁的',
    '溫柔的',
    '厭世的',
    '七彩的',
    '酷酷的',
  ];
  private animals = [
    '貓咪',
    '狗勾',
    '羊駝',
    '企鵝',
    '長頸鹿',
    '熊寶',
    '小狐狸',
    '兔兔',
    '鴨鴨',
    '鸚鵡',
  ];

  // 三種 type 固定（新增願望 select 也是用這個）
  typeOptions: any[] = ['手搖店', '餐廳', '生鮮雜貨'];

  ngOnInit(): void {
    // 訂閱 User 狀態流
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.userId = user.id;
        this.timesRemaining = user.timesRemaining;
        this.role = user.role;
      }
    });
    // 刷新資料
    this.auth.refreshUser();

    this.loadWishes();
  }

  // =========================
  // 載入願望
  // =========================
  loadWishes(): void {
    this.isLoading = true;

    // 路由定位特定卡片 =========================
    this.route.queryParamMap.subscribe((qp) => {
      const tab = qp.get('tab');
      const filter = qp.get('filter');
      const wishIdStr = qp.get('wishId');

      this.pendingTab =
        tab === 'all' || tab === 'followed' || tab === 'mine' ? tab : null;

      this.pendingFilter =
        filter === 'all' ||
        filter === 'active' ||
        filter === 'finished' ||
        filter === 'expired'
          ? filter
          : null;

      this.pendingWishId = wishIdStr ? Number(wishIdStr) : null;
    });
    // ========================================

    // 後端上線後使用：
    this.http
      .getApi('http://localhost:8080/gogobuy/wish/all_wishes')
      .subscribe((res: any) => {
        this.wishes = res.allWish || [];
        this.afterLoad();
        this.applyScrollAndHighlight();
      });
  }

  // 讀取完資料後的整理小工具
  private afterLoad(): void {
    this.setRandomNicknamesOnce();
    this.resetPages();
    this.isLoading = false;
  }

  // 頁面重置
  private resetPages(): void {
    this.pageAll = 0;
    this.pageFollowed = 0;
    this.pageMine = 0;
  }

  // =========================
  // 匿名顯示：只生成一次，避免每次刷新 UI 名字亂跳
  // =========================
  private setRandomNicknamesOnce(): void {
    this.wishes.forEach((wish) => {
      if (!wish.nickname && !wish.tempNickname) {
        const adj =
          this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const ani =
          this.animals[Math.floor(Math.random() * this.animals.length)];
        wish.tempNickname = `${adj}${ani}`;
      }
    });
  }

  getDisplayName(wish: any): string {
    if (!wish) return '';
    return wish.nickname ? wish.nickname : wish.tempNickname;
  }

  // =========================
  // 狀態判斷（過期 / 已實現 / 自己的）
  // =========================
  isExpired(buildDate: string): boolean {
    const created = new Date(buildDate);
    if (Number.isNaN(created.getTime())) return false;

    const today = new Date();
    const diffMs = today.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  }

  isFinished(wish: any): boolean {
    return !!wish?.finished;
  }

  isMine(wish: any): boolean {
    return wish?.user_id === this.userId;
  }

  isFollowedByMe(wish: any): boolean {
    const followers: string[] = wish?.followers || [];
    return followers.includes(this.userId);
  }

  // =========================
  // 三種 type 顏色 + 狀態顏色
  // =========================
  // 把英文轉成中文顯示
  typeforHtml(type: string) {
    if (type === 'beverage') {
      return '手搖店';
    }
    if (type === 'restaurant') {
      return '餐廳';
    }
    return '生鮮雜貨';
  }

  getCardClass(wish: any): string {
    const expired = this.isExpired(wish.buildDate);
    const finished = this.isFinished(wish);

    // 失效灰
    if (expired) {
      return 'bg-gray-100 border-gray-200 text-gray-600';
    }

    // 已實現：黃
    if (finished) {
      return 'bg-yellow-50 border-yellow-200 text-[#5A2A16]';
    }

    // 進行中：依 type 三色淡底
    const type = wish.type;
    if (type === 'beverage') return 'bg-sky-100 border-sky-200 text-red-900';
    if (type === 'restaurant')
      return 'bg-[#FFF1E6] border-[#FFD9C2] text-red-900';
    return 'bg-[#EAF6EF] border-[#CFE9DA] text-red-900'; // 生鮮雜貨
  }

  getTypeBadgeClass(wish: any): string {
    const expired = this.isExpired(wish.buildDate);
    const finished = this.isFinished(wish);

    if (expired) return 'bg-gray-200 text-gray-600';
    if (finished) return 'bg-amber-100 text-amber-600';

    const type = wish.type;
    if (type === 'beverage') return 'bg-blue-900/10 text-blue-800';
    if (type === 'restaurant') return 'bg-[#D5451B]/10 text-[#D5451B]';
    return 'bg-emerald-700/10 text-emerald-800';
  }

  getStatusTag(wish: any): 'expired' | 'finished' | 'active' {
    if (this.isExpired(wish.buildDate)) return 'expired';
    if (this.isFinished(wish)) return 'finished';
    return 'active';
  }

  getStatusLabel(wish: any): string {
    const s = this.getStatusTag(wish);
    if (s === 'expired') return '已失效';
    if (s === 'finished') return '已實現';
    return '';
  }

  // =========================
  // 三個 tab 的資料
  // =========================
  // 大家的願望：
  // - 不顯示 expired
  // - 不顯示 finished=true
  getAllTabList(): any[] {
    return this.wishes.filter(
      (w) => !this.isExpired(w.buildDate) && !this.isFinished(w),
    );
  }

  // 我跟的願望：
  // - followers 有自己就顯示
  // - expired / finished 也要顯示（但點開只能看資訊）
  getFollowedTabList(): any[] {
    // 先找我跟的
    let list = this.wishes.filter((w) => this.isFollowedByMe(w));

    // 再依 foFilter 篩選
    if (this.foFilter === 'active') {
      list = list.filter((w) => this.getStatusTag(w) === 'active');
    } else if (this.foFilter === 'finished') {
      list = list.filter((w) => this.getStatusTag(w) === 'finished');
    } else if (this.foFilter === 'expired') {
      list = list.filter((w) => this.getStatusTag(w) === 'expired');
    }
    // foFilter === 'all' → 不動

    return list;
  }

  // 我許的願望：
  // - user_id == 我(全部)
  getMineTabList(): any[] {
    const list = this.wishes.filter((w) => this.isMine(w));

    if (this.myFilter === 'all') return list;
    if (this.myFilter === 'active') {
      return list.filter(
        (w) => !this.isExpired(w.buildDate) && !this.isFinished(w),
      );
    }
    if (this.myFilter === 'finished') {
      return list.filter((w) => this.isFinished(w));
    }
    // expired
    return list.filter((w) => this.isExpired(w.buildDate));
  }

  // =========================
  // 分頁：回傳目前頁要顯示的資料
  // =========================
  getPagedList(mode: 'all' | 'followed' | 'mine'): any[] {
    const list =
      mode === 'all'
        ? this.getAllTabList()
        : mode === 'followed'
          ? this.getFollowedTabList()
          : this.getMineTabList();

    const page =
      mode === 'all'
        ? this.pageAll
        : mode === 'followed'
          ? this.pageFollowed
          : this.pageMine;
    const start = page * this.pageSize;
    const end = start + this.pageSize;
    return list.slice(start, end);
  }

  getTotal(mode: 'all' | 'followed' | 'mine'): number {
    if (mode === 'all') return this.getAllTabList().length;
    if (mode === 'followed') return this.getFollowedTabList().length;
    return this.getMineTabList().length;
  }

  getRangeText(mode: 'all' | 'followed' | 'mine'): string {
    const total = this.getTotal(mode);
    if (total === 0) return '第 0 至 0 條，共 0 條';

    const page =
      mode === 'all'
        ? this.pageAll
        : mode === 'followed'
          ? this.pageFollowed
          : this.pageMine;
    const start = page * this.pageSize + 1;

    const end = Math.min((page + 1) * this.pageSize, total);
    return `第 ${start} 至 ${end} 條，共 ${total} 條`;
  }

  onPageChange(mode: 'all' | 'followed' | 'mine', event: any): void {
    const newPage = event.page || 0;
    if (mode === 'all') this.pageAll = newPage;
    if (mode === 'followed') this.pageFollowed = newPage;
    if (mode === 'mine') this.pageMine = newPage;
  }

  // 我許的願望：切 filter 時重置分頁
  setMyFilter(filter: MyFilter): void {
    this.myFilter = filter;
    this.pageMine = 0;
  }

  // 我跟的願望：切 filter 時重置分頁
  setFoFilter(filter: FoFilter): void {
    this.foFilter = filter;
    this.pageFollowed = 0;
  }

  // 這邊是專門用來路由導向特定卡片 ======================================
  // 有一部分在ngOnInt
  // Deep-link 定位用
  pendingWishId: number | null = null;
  pendingTab: 'all' | 'followed' | 'mine' | null = null;
  pendingFilter: 'all' | 'active' | 'finished' | 'expired' | null = null;

  // 特定卡片暫時高光
  highlightWishId: number | null = null;

  applyScrollAndHighlight(): void {
    if (!this.pendingWishId) return;

    // 1️. 切 tab（如果有指定）
    if (this.pendingTab === 'all') this.activeTab = 0;
    if (this.pendingTab === 'followed') this.activeTab = 1;
    if (this.pendingTab === 'mine') this.activeTab = 2;

    // 2️. 套 filter（該 tab 有支援才套）
    if (this.pendingFilter) {
      if (this.pendingTab === 'mine') {
        this.setMyFilter(this.pendingFilter as any);
      }
      if (this.pendingTab === 'followed') {
        this.setFoFilter(this.pendingFilter as any);
      }
    }

    const wishId = this.pendingWishId;

    // 3. 等畫面 render（關鍵）
    setTimeout(() => {
      const el = document.getElementById(this.getWishDomId(wishId));
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.flashHighlight(wishId);
    }, 0);
  }

  // 定位小工具
  getWishDomId(wishId: number): string {
    return `wish-card-${wishId}`;
  }

  flashHighlight(wishId: number): void {
    this.highlightWishId = wishId;

    setTimeout(() => {
      if (this.highlightWishId === wishId) {
        this.highlightWishId = null;
      }
    }, 2000);
  }

  /*
    許願池路由使用方法:
    tab = all(大家的願望), followed(我跟的願望), mine(我許的願望) | (沒寫就是all)
    filter = active(進行中), finished(已實現), expired(已失效) | (沒寫就是全部)
    wishId = 願望id

    找不到不會報錯，但就是只會導到指定位置不會有卡片高光。

    注意:
    tab 的 all 只有進行中的願望，篩選、已實現、已失效的願望導到這什麼都不會發生。

    範例:
    /user/wishes?tab=mine&filter=expired&wishId=5
    ▲ 將導到"我許的願望"、篩選在"已失效"、捲到id為5的卡片並出現2秒高光。
  */

  // =========================
  // Create Wish Dialog (創建願望)
  // =========================
  createVisible = false;
  // 表單資料（先用最小可行）
  createForm = {
    title: '',
    type: '手搖店',
    location: '',
    anonymous: false,
  };
  // optional：送出中（避免連點）
  isCreating = false;

  // =========================
  // 右上角「我要許願」
  // =========================
  onCreateWish(): void {
    // 未登入防呆
    if (!this.userId) {
      this.toastWarn('請先登入', '登入後才可以許願喔');
      return;
    }

    if (this.timesRemaining <= 0) {
      this.toastWarn('本月已達上限', '本月許願次數已達上限');
      return;
    }

    // 打開 PrimeNG Dialog
    this.openCreateDialog();
  }

  // 開啟 dialog（每次開啟先重置表單）
  openCreateDialog(): void {
    this.createForm = {
      title: '',
      type: '手搖店',
      location: '',
      anonymous: false,
    };
    this.createVisible = true;
    this.disableScroll();
  }

  // 關閉 dialog
  closeCreateDialog(): void {
    this.createVisible = false;
    this.isCreating = false;
  }

  typeChange(type: string) {
    if (type === '手搖店') {
      return 'beverage';
    }
    if (type === '餐廳') {
      return 'restaurant';
    }
    return 'groceries';
  }

  // 送出（dialog 的送出按鈕呼叫）
  submitCreateWish(): void {
    if (this.isCreating) return;

    const title = this.createForm.title?.trim();
    const location = this.createForm.location?.trim();
    const type = this.typeChange(this.createForm.type);
    const anonymous = this.createForm.anonymous;

    if (!title) {
      this.toastWarn('提醒', '請輸入願望標題');
      return;
    }
    if (!location) {
      this.toastWarn('提醒', '請輸入地點');
      return;
    }

    const payload = {
      userId: this.userId,
      title,
      anonymous: String(anonymous),
      type,
      location,
    };

    this.isCreating = true;

    // 後端上線後使用（成功再刷新/更新畫面）
    this.http
      .postApi('http://localhost:8080/gogobuy/wish/add_wishes', payload)
      .subscribe((res: any) => {
        this.isCreating = false;
        if (res?.code === 200) {
          this.toastSuccess('成功', '創建成功');
          this.timesRemaining -= 1;
          this.closeCreateDialog();
          this.loadWishes(); // 重新抓一次
        } else {
          this.toastWarn('失敗', res?.message || '創建失敗');
        }
      });
  }

  // =========================
  // 跟願 / 取消跟願（同 API）
  // =========================
  onToggleFollow(wish: any): void {
    if (!this.userId) {
      this.toastWarn('請先登入', '登入後才可以跟願');
      return;
    }

    if (this.isMine(wish)) {
      this.toastWarn('提醒', '自己的願望不能跟願喔！');
      return;
    }

    // 後端上線後使用：
    const url = `http://localhost:8080/gogobuy/wish/follow_wish?id=${wish.id}&userId=${this.userId}`;
    this.http.postApi(url, {}).subscribe((res: any) => {
      if (res?.code === 200) {
        if (idx > -1) {
          followers.splice(idx, 1);
          this.toastInfo('已取消', '已取消跟願');
        } else {
          followers.push(this.userId);
          this.toastSuccess('成功', '跟願成功！');
        }
      } else {
        this.toastWarn('失敗', res?.message || '請重新操作');
      }
    });

    // 測試：前端直接切換
    const followers: string[] = wish.followers || [];
    const idx = followers.indexOf(this.userId);
  }

  // p-dialog用變數 ----------------------------
  detailVisible = false;
  selectedWish: any = null;

  detailStatusLabel = '';
  detailFollowerCount = 0;
  detailDisplayName = '';

  showStartGroupBtn = false;
  disableStartGroupBtn = false;
  showDeleteBtn = false;
  showReWishBtn = false;
  // ----------------------------------------

  // =========================
  // 卡片點擊：顯示詳情（PrimeNG Dialog）
  // =========================
  onOpenDetail(mode: 'all' | 'followed' | 'mine', wish: any): void {
    const status = this.getStatusTag(wish); // 'active' | 'expired' | 'finished'
    const statusLabel = this.getStatusLabel(wish);

    // 這兩個狀態在「我跟的願望」要限制：只能看資訊
    const isReadOnlyInFollowed =
      mode === 'followed' && (status === 'expired' || status === 'finished');
    // 「我許的願望」：已實現只能看資訊
    const isReadOnlyInMine = mode === 'mine' && status === 'finished';

    // 顯示資訊（template 不做計算）
    this.selectedWish = wish;
    this.detailStatusLabel = statusLabel;
    this.detailFollowerCount = (wish.followers || []).length;
    this.detailDisplayName = this.getDisplayName(wish);

    // 是否允許開團
    const canStartGroup =
      !!this.userId &&
      !isReadOnlyInFollowed &&
      !isReadOnlyInMine &&
      !(mode === 'mine' && status === 'expired');

    this.showStartGroupBtn = canStartGroup;
    this.disableStartGroupBtn = !this.userId;

    // 是否顯示「再許一次」
    this.showReWishBtn = mode === 'mine' && status === 'expired';

    // 是否顯示刪除
    this.showDeleteBtn = mode === 'mine' && status === 'active';

    this.detailVisible = true;
  }

  // 關閉p-dialog
  closeDetail(): void {
    this.detailVisible = false;
    this.selectedWish = null;
  }

  role = 'user';
  startGroupFromWish(): void {
    if (!this.selectedWish) return;
    if (!this.userId) {
      this.toastWarn('請先登入', '登入後才可以開團');
      return;
    }

    const wishId = this.selectedWish.id;
    const wishTitle = encodeURIComponent(this.selectedWish.title || '');
    sessionStorage.removeItem('temp_order_info');
    window.location.href = `/management/store_upsert?wish_id=${wishId}&wish_title=${wishTitle}`;
  }

  // =========================
  // 刪除願望
  // =========================
  onDeleteWish(wish: any): void {
    if (!this.userId) {
      this.toastWarn('請先登入', '登入後才可以刪除');
      return;
    }

    Swal.fire({
      title: '確定要刪除願望嗎？',
      text: `「${wish.title}」將被刪除`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D5451B',
      confirmButtonText: '刪除',
      cancelButtonText: '取消',
      didOpen: () => {
        const container = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (container) container.style.zIndex = '20000';
      },
    }).then((r) => {
      if (!r.isConfirmed) return;

      // 後端上線後使用：
      const url = `http://localhost:8080/gogobuy/wish/delete_wish?id=${wish.id}&userId=${this.userId}`;
      this.http.postApi(url, {}).subscribe((res: any) => {
        if (res?.code === 200) {
          this.toastSuccess('成功', '刪除成功');
          this.closeDetail();
          this.loadWishes();
        } else {
          this.toastWarn('失敗', res?.message || '刪除失敗');
        }
      });
    });
  }

  // =========================
  // 我許的願望：再許一次
  // 流程：防呆 timesRemaining -> 確認 -> 新增 -> 成功後刪掉舊的
  // =========================
  onReWish(wish: any): void {
    if (this.timesRemaining <= 0) {
      this.toastWarn('本月已達上限', '本月許願次數已達上限');
      return;
    }

    Swal.fire({
      title: '確定要重許相同的願望嗎？',
      text: `將重許「${wish.title}」並刪除舊願望`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7F1D1D',
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      didOpen: () => {
        const container = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (container) container.style.zIndex = '20000';
      },
    }).then((r) => {
      if (!r.isConfirmed) return;

      // 後端上線後使用（先新增成功 -> 再刪除原本）
      // 新增願望
      const addPayload = {
        userId: this.userId,
        title: wish.title,
        anonymous: 'false',
        type: wish.type,
        location: wish.location,
      };
      this.http
        .postApi('http://localhost:8080/gogobuy/wish/add_wishes', addPayload)
        .subscribe((res: any) => {
          if (res?.code === 200) {
            // 刪除原願望
            const delUrl = `http://localhost:8080/gogobuy/wish/delete_wish?id=${wish.id}&userId=${this.userId}`;
            this.http.postApi(delUrl, {}).subscribe((del: any) => {
              if (res?.code === 200) {
                this.toastSuccess('成功', '已刪除原願望');
                this.closeDetail();
                this.timesRemaining -= 1;
                this.resetPages();
                this.loadWishes();
              } else {
                this.toastWarn('失敗', res?.message || '原願望刪除失敗');
              }
            });
          }
        });
      Swal.close();
    });
  }

  // =========================
  // 小工具：Toast
  // =========================
  private toastSuccess(summary: string, detail: string): void {
    this.messageService.add({ severity: 'success', summary, detail });
  }
  private toastInfo(summary: string, detail: string): void {
    this.messageService.add({ severity: 'info', summary, detail });
  }
  private toastWarn(summary: string, detail: string): void {
    this.messageService.add({ severity: 'warn', summary, detail });
  }

  // =========================
  // SweetAlert2 HTML 安全：避免 title/location 有特殊字元把版面弄壞
  // =========================
  private escapeHtml(str: string): string {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // 這邊是防止 dialog 開啟但畫面可滾 ----------------------------
  disableScroll() {
    const scrollY = window.scrollY;
    const body = document.body;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
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
}
