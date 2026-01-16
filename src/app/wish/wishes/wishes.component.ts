import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsModule } from 'primeng/tabs';
import { PaginatorModule } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

import Swal from 'sweetalert2';

import { HttpService } from '../../@service/http.service';
import { AuthService } from '../../@service/auth.service';

type WishType = '手搖店' | '餐廳' | '生鮮雜貨';
type MyFilter = 'all' | 'active' | 'finished' | 'expired';

@Component({
  selector: 'app-wishes',
  standalone: true,
  imports: [CommonModule, FormsModule, TabsModule, PaginatorModule, ToastModule, DialogModule],
  templateUrl: './wishes.component.html',
  styleUrl: './wishes.component.scss',
  providers: [MessageService],
})
export class WishesComponent implements OnInit {
  constructor(
    private http: HttpService,
    public auth: AuthService,
    private messageService: MessageService
  ) {}

  // =========================
  // TODO 測試暫用：未登入也給假 userId
  // =========================
  userId: string = '';
  timesRemaining = 3; // 測試應急用願望次數

  // =========================
  // UI 狀態
  // =========================
  isLoading = true;
  activeTab = 0; // 0: all, 1: followed, 2: mine
  myFilter: MyFilter = 'all';

  // 分頁（每個 tab 各自一套，避免互相干擾）
  pageSize = 20; // 可自行調
  pageAll = 0;
  pageFollowed = 0;
  pageMine = 0;

  // =========================
  // 資料
  // =========================
  wishes: any[] = [];

  // 隨機名稱池（匿名顯示用）
  private adjectives = ['可愛的', '閃亮的', '神祕的', '飢餓的', '開心的', '暴躁的', '溫柔的', '厭世的', '七彩的', '酷酷的'];
  private animals = ['貓咪', '狗勾', '羊駝', '企鵝', '長頸鹿', '熊寶', '小狐狸', '兔兔', '鴨鴨', '鸚鵡'];

  // 三種 type 固定（新增願望 select 也用這個）
  typeOptions: WishType[] = ['手搖店', '餐廳', '生鮮雜貨'];

  ngOnInit(): void {
    // TODO 確保有 userId（沒有就先用假資料）
    this.userId = this.auth.user?.id || '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa';

    // 先用假資料（後端上線再換成 GET）
    this.loadWishes();
  }

  // =========================
  // TODO 載入願望（假資料 / 後續改接 API）
  // =========================
  loadWishes(): void {
    this.isLoading = true;

    // 後端上線後使用：
    // this.http.getApi('http://localhost:8080/gogobuy/all_wishes').subscribe((res: any) => {
    //   this.wishes = res.allWish || [];
    //   this.afterLoad();
    // });

    // 假資料
    this.wishes = [
      {
        id: 1,
        user_id: '5274e1a0-40cd-4e2b-9528-a3779e2f84a6',
        nickname: '小林',
        title: '喝不喝五十嵐（這邊故意做很長很長用來測試省略）',
        followers: [
          '74db5f21-f331-4824-853b-0be13d633c80',
          '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
        ],
        finished: false,
        type: '手搖店',
        buildDate: '2026-01-09',
        location: '資安大樓（這邊也做很長測~~~~~~~~~~~~~~~~~~~~~~試）',
      },
      {
        id: 2,
        user_id: '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
        nickname: null,
        title: '全聯火鍋吃起來',
        followers: [],
        finished: false,
        type: '生鮮雜貨',
        buildDate: '2026-01-06',
        location: '台南市歸仁區',
      },
      {
        id: 3,
        user_id: '74db5f21-f331-4824-853b-0be13d633c80',
        nickname: null,
        title: '大祥燒臘',
        followers: ['12b7bf42-57af-4e3f-acfc-b9a2ba3342aa'],
        finished: false,
        type: '餐廳',
        buildDate: '2026-01-01',
        location: '資安大樓',
      },
      {
        id: 4,
        user_id: '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
        nickname: null,
        title: '我好想喝迷克夏',
        followers: ['74db5f21-f331-4824-853b-0be13d633c80'],
        finished: true,
        type: '手搖店',
        buildDate: '2026-01-05',
        location: '高雄小港',
      },
      {
        id: 5,
        user_id: '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
        nickname: null,
        title: '可不可要不要',
        followers: ['74db5f21-f331-4824-853b-0be13d633c80'],
        finished: false,
        type: '餐廳',
        buildDate: '2025-10-01',
        location: '資安大樓',
      },
    ];

    this.afterLoad();
  }

  private afterLoad(): void {
    this.setRandomNicknamesOnce();
    this.resetPages();
    this.isLoading = false;
  }

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
        const adj = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const ani = this.animals[Math.floor(Math.random() * this.animals.length)];
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
  getCardClass(wish: any): string {
    const expired = this.isExpired(wish.buildDate);
    const finished = this.isFinished(wish);

    // 失效灰
    if (expired) {
      return 'bg-gray-100 border-gray-200 text-gray-600';
    }

    // 已實現：偏暖橘（但不要太刺眼）
    if (finished) {
      return 'bg-[#FFE8D6] border-[#FFD2B1] text-[#5A2A16]';
    }

    // 進行中：依 type 三色淡底
    const type: WishType = wish.type;
    if (type === '手搖店') return 'bg-sky-100 border-sky-200 text-red-900';
    if (type === '餐廳') return 'bg-[#FFF1E6] border-[#FFD9C2] text-red-900';
    return 'bg-[#EAF6EF] border-[#CFE9DA] text-red-900'; // 生鮮雜貨
  }

  getTypeBadgeClass(wish: any): string {
    const expired = this.isExpired(wish.buildDate);
    const finished = this.isFinished(wish);

    if (expired) return 'bg-gray-200 text-gray-600';
    if (finished) return 'bg-[#FF9B45]/20 text-[#8A3A10]';

    const type: WishType = wish.type;
    if (type === '手搖店') return 'bg-red-900/10 text-red-900';
    if (type === '餐廳') return 'bg-[#D5451B]/10 text-[#D5451B]';
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
  // 三個 tab 的資料（先在 TS 篩好）
  // =========================
  // 大家的願望：
  // - 不顯示 expired
  // - 不顯示 finished=true
  getAllTabList(): any[] {
    return this.wishes.filter((w) => !this.isExpired(w.buildDate) && !this.isFinished(w));
  }

  // 我跟的願望：
  // - followers 有自己就顯示
  // - expired / finished 也要顯示（但點開只能看資訊）
  getFollowedTabList(): any[] {
    return this.wishes.filter((w) => this.isFollowedByMe(w));
  }

  // 我許的願望：
  // - user_id == 我
  // - 上方 filter：全部 / 進行中 / 已實現 / 已失效
  getMineTabList(): any[] {
    const list = this.wishes.filter((w) => this.isMine(w));

    if (this.myFilter === 'all') return list;
    if (this.myFilter === 'active') {
      return list.filter((w) => !this.isExpired(w.buildDate) && !this.isFinished(w));
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

    const page = mode === 'all' ? this.pageAll : mode === 'followed' ? this.pageFollowed : this.pageMine;
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

    const page = mode === 'all' ? this.pageAll : mode === 'followed' ? this.pageFollowed : this.pageMine;
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

  // =========================
  // TODO 右上角「我要許願」
  // =========================
  onCreateWish(): void {
    // 未登入防呆（目前測試會有假 userId，所以通常不會觸發）
    if (!this.userId) {
      this.toastWarn('請先登入', '登入後才可以許願喔');
      return;
    }

    if (this.timesRemaining <= 0) {
      this.toastWarn('本月已達上限', '本月許願次數已達上限');
      return;
    }

    // SweetAlert2：一次收集 title / type / location / anonymous
    Swal.fire({
      title: '我要許願',
      html: `
        <div style="text-align:left; font-size: 15px;">
          <div style="margin-bottom:10px;">
            <div style="margin-bottom:6px;">願望標題</div>
            <input id="sw_title" class="swal2-input" placeholder="例如：五十嵐" style="margin:0;">
          </div>

          <div style="margin-bottom:10px;">
            <div style="margin-bottom:6px;">類型</div>
            <select id="sw_type" class="swal2-select" style="width:100%; padding:10px; border-radius:10px;">
              <option value="手搖店">手搖店</option>
              <option value="餐廳">餐廳</option>
              <option value="生鮮雜貨">生鮮雜貨</option>
            </select>
          </div>

          <div style="margin-bottom:10px;">
            <div style="margin-bottom:6px;">地點</div>
            <input id="sw_location" class="swal2-input" placeholder="例如：資安大樓" style="margin:0;">
          </div>

          <label style="display:flex; align-items:center; gap:8px; margin-top:6px;">
            <input id="sw_anonymous" type="checkbox" />
            <span>匿名</span>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#7F1D1D', // red-900
      confirmButtonText: '送出',
      cancelButtonText: '取消',
      preConfirm: () => {
        const title = (document.getElementById('sw_title') as HTMLInputElement)?.value?.trim();
        const type = (document.getElementById('sw_type') as HTMLSelectElement)?.value as WishType;
        const location = (document.getElementById('sw_location') as HTMLInputElement)?.value?.trim();
        const anonymous = (document.getElementById('sw_anonymous') as HTMLInputElement)?.checked;

        if (!title) {
          Swal.showValidationMessage('請輸入願望標題');
          return;
        }
        if (!location) {
          Swal.showValidationMessage('請輸入地點');
          return;
        }
        return { title, type, location, anonymous };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = {
        userId: this.userId,
        title: result.value.title,
        anonymous: String(result.value.anonymous),
        type: result.value.type,
        location: result.value.location,
      };

      // 後端上線後使用（成功再刷新/更新畫面）
      // this.http.postApi('http://localhost:8080/gogobuy/add_wishes', payload).subscribe((res: any) => {
      //   if (res?.code === 200) {
      //     this.toastSuccess('成功', '創建成功');
      //     this.timesRemaining -= 1;
      //     this.loadWishes(); // 重新抓一次
      //   } else {
      //     this.toastWarn('失敗', res?.message || '創建失敗');
      //   }
      // });

      // ✅ 測試：直接前端新增
      const newWish = {
        id: Date.now(),
        user_id: this.userId,
        nickname: payload.anonymous === 'true' ? null : (this.auth.user?.nickname ?? null),
        title: payload.title,
        followers: [],
        finished: false,
        type: payload.type,
        buildDate: new Date().toISOString().slice(0, 10),
        location: payload.location,
      };

      this.wishes = [newWish, ...this.wishes];
      this.setRandomNicknamesOnce();
      this.timesRemaining -= 1;

      this.toastSuccess('成功', '創建成功');
      this.resetPages();
    });
  }

  // =========================
  // TODO 跟願 / 取消跟願（同 API）
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
    // const url = `http://localhost:8080/gogobuy/follow?id=${wish.id}&user_id=${this.userId}`;
    // this.http.postApi(url, {}).subscribe((res: any) => {
    //   if (res?.code === 200) { ... } else { ... }
    // });

    // ✅ 測試：前端直接切換
    const followers: string[] = wish.followers || [];
    const idx = followers.indexOf(this.userId);

    if (idx > -1) {
      followers.splice(idx, 1);
      this.toastInfo('已取消', '已取消跟願');
    } else {
      followers.push(this.userId);
      this.toastSuccess('成功', '跟願成功！');
    }
  }

  // dialog用變數 ----------------------------
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
  const isReadOnlyInFollowed = mode === 'followed' && (status === 'expired' || status === 'finished');
  // 「我許的願望」：已實現只能看資訊
  const isReadOnlyInMine = mode === 'mine' && status === 'finished';

  // 顯示資訊（template 不做計算）
  this.selectedWish = wish;
  this.detailStatusLabel = statusLabel;
  this.detailFollowerCount = (wish.followers || []).length;
  this.detailDisplayName = this.getDisplayName(wish);

  // 是否允許開團（依你原本邏輯）
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

closeDetail(): void {
  this.detailVisible = false;
  this.selectedWish = null;
}

startGroupFromWish(): void {
  if (!this.selectedWish) return;

  if (!this.userId) {
    this.toastWarn('請先登入', '登入後才可以開團');
    return;
  }

  const wishId = this.selectedWish.id;
  const wishTitle = encodeURIComponent(this.selectedWish.title || '');
  window.location.href = `/store_upsert?wish_id=${wishId}&wish_title=${wishTitle}`;
}

  // =========================
  // TODO 我許的願望：刪除（需接 API）
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
    }).then((r) => {
      if (!r.isConfirmed) return;

      // 後端上線後使用：
      // const url = `http://localhost:8080/gogobuy/delete?id=${wish.id}&user_id=${this.userId}`;
      // this.http.postApi(url, {}).subscribe((res: any) => {
      //   if (res?.code === 200) { ... } else { ... }
      // });

      // 測試：直接刪
      this.wishes = this.wishes.filter((w) => w.id !== wish.id);
      this.toastSuccess('成功', '刪除成功');
      this.resetPages();
      Swal.close();
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
    }).then((r) => {
      if (!r.isConfirmed) return;

      // 後端上線後使用（先新增成功 -> 再刪除原本）
      // 新增願望
      // const addPayload = { userId:this.userId, title:wish.title, anonymous:'false', type:wish.type, location:wish.location };
      // this.http.postApi('http://localhost:8080/gogobuy/add_wishes', addPayload).subscribe((res:any)=>{
      //   if(res?.code===200){
      //     // 刪除原願望
      //     const delUrl = `http://localhost:8080/gogobuy/delete?id=${wish.id}&user_id=${this.userId}`;
      //     this.http.postApi(delUrl, {}).subscribe((del:any)=>{
      //       if(del?.code===200){ ... }
      //     });
      //   }
      // });

      // 測試：前端直接模擬「新增 + 刪除」
      const cloned = {
        id: Date.now(),
        user_id: this.userId,
        nickname: wish.nickname,
        title: wish.title,
        followers: [],
        finished: false,
        type: wish.type,
        buildDate: new Date().toISOString().slice(0, 10),
        location: wish.location,
      };

      // 新增
      this.wishes = [cloned, ...this.wishes];
      this.setRandomNicknamesOnce();

      // 刪除舊的
      this.wishes = this.wishes.filter((w) => w.id !== wish.id);

      this.timesRemaining -= 1;
      this.toastSuccess('成功', '已重新發起願望！');
      this.resetPages();
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
}
