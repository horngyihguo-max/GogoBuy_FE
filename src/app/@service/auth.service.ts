import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs';
import Swal from 'sweetalert2';
import { HttpService } from './http.service';
import { BehaviorSubject } from 'rxjs';


/*
 * AuthService（目前同時包含三種功能）
 * (1) 使用者：登入/登出/註冊/更新資料、localStorage 同步、user$ 推播
 * (2) 店家：取得/搜尋店家、公開/刪除狀態過濾、附近搜尋結果套用
 * (3) 開團：取得/搜尋開團、把不同 API 回傳格式 normalize 成同一種 events 資料結構
 * (4) 如果要分開三種功能可以切出 UserService / StoreService / EventService
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 這邊專門放用戶資料相關API和變數
  constructor(
    private https: HttpService,
    private router: Router,
    private route: ActivatedRoute,) { }
  user: any = null;

  // userSubject 用來讓「畫面上的 component」可以訂閱 user 變化（不用一直去讀 localStorage）
  // localStorage 用來讓「F5 刷新後」還保有登入狀態
  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  user$ = this.userSubject.asObservable();

  private eventDemoImages = [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
  ];

  /*
   * normalizeEvents：把各種不同 API 回傳格式，整理成前端統一可用的事件資料結構
   * 補齊缺的欄位（例如 image 沒回就給 demo 圖）
   */
  private normalizeEvents(res: any) {
    const raw = Array.isArray(res)
      ? res
      : (res.groupsSearchViewList ??
        res.groupbuyEvents ??
        res.eventList ??
        res.events ??
        res.data?.groupbuyEvents ??
        []);

    return (raw || []).map((e: any, i: number) => ({
      ...e,
      id: e.id ?? e.eventId,
      storeId: e.storesId ?? e.storeId,
      status: e.status ?? e.eventStatus,
      type: e.type ?? e.eventType,
      eventName: e.eventName ?? '',
      announcement: e.announcement ?? '',
      recommendDescription: e.recommendDescription ?? '',
      image: e.image || this.eventDemoImages[i % this.eventDemoImages.length],
    }));
  }

  /**
 * fetchEvents：統一處理「API 取得 events」後的流程
 * - normalizeEvents：整理資料格式
 * - events：目前畫面要顯示的清單（可能被搜尋/篩選後）
 * - eventsAll：完整原始清單（只在首頁初始化時存一次，之後做 filter 用）
 * saveAll=true 用在「第一次載入所有開團」，把完整資料存進 eventsAll
 */
  private fetchEvents(apiCall: any, saveAll = false) {
    apiCall.subscribe({
      next: (res: any) => {
        const list = this.normalizeEvents(res);
        this.events.set(list);
        if (saveAll) this.eventsAll.set(list);
      },
      error: (err: any) => {
        this.events.set([]);
        if (saveAll) this.eventsAll.set([]);
      }
    });
  }


  private getUserFromStorage() {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  }

  // 把最新頭像資料set進user
  setUser(user: any) {
    const formattedUser = {
      ...user,
      user_avatar_url: user.avatar_url || user.avatarUrl
    };
    this.user = formattedUser;
    localStorage.setItem('user_info', JSON.stringify(formattedUser));
    this.userSubject.next(formattedUser);
  }

  loadUserFromStorage() {
    const raw = localStorage.getItem('user');
    this.user = raw ? JSON.parse(raw) : null;
  }

  // 刷新用戶資料
  refreshUser() {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      return;
    }
    this.https.getApi(`http://localhost:8080/gogobuy/user/get-user?id=${userId}`).subscribe({
      next: (res: any) => {
        const userData = res;
        localStorage.setItem('user_avatar_url', res.avatarUrl);
        if (userData && (userData.id || userData.userId)) {
          this.setUser(userData);
        }
      },
      error: (err: any) => {
        console.error('API 請求發生錯誤:', err);
      }
    });
  }

  // 登入API
  // 登入成功後：
  // (1) 先把 login 回傳結果暫存
  // (2) 再呼叫 refreshUser() 取得「完整使用者資料」
  // (3) 最後導回 returnUrl() (登入時若點選的是用戶首頁，登入後返回用戶首頁)
  login(payload: any) {
    this.https.postApi('http://localhost:8080/gogobuy/user/login', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code == 200) {
            this.user = res;
            this.setUser(res);
            localStorage.setItem('user_id', res.id);
            localStorage.setItem('user_email', payload.email);
            this.refreshUser();
            Swal.fire({
              toast: true,
              position: 'top',
              icon: 'success',
              title: `歡迎回來!`,
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
            });
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/gogobuy';
            setTimeout(() => {
              this.router.navigateByUrl(returnUrl);
            }, 500);
          } else {
            Swal.fire({
              title: res.message || '登入失敗',
              icon: 'error',
              showConfirmButton: false,
              timer: 1000
            });
          }
        },
        error: (err: any) => {
          Swal.fire({
            title: err.message || '連線伺服器失敗',
            icon: 'error',
            showConfirmButton: false,
            timer: 1000
          });
        },
      });
  }

  // 登出API
  logout() {
    this.https.postApi('http://localhost:8080/gogobuy/user/logout', { withCredentials: true })
      .subscribe(() => {
        this.user = null;
        this.userSubject.next(null);
        // 清除前端紀錄
        localStorage.clear();
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: `已登出!`,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        // 回到首頁
        this.router.navigate(['/gogobuy']);
      });
  }

  // 註冊API
  register(payload: any) {
    return this.https.postApi(
      'http://localhost:8080/gogobuy/user/registration',
      payload
    );
  }




  // 修改用戶資訊 (暱稱、大頭貼、載具)
  updateProfile(id: string, updateDto: any) {
    const url = `http://localhost:8080/gogobuy/user/change-profile?id=${id}`;

    return this.https.patchApi(url, updateDto).pipe(
      tap((res: any) => {
        if (res.code === 200) {

          // 取得目前暫存在 localStorage 的完整資料
          const currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');

          // 將更新後的欄位合併進去
          const updatedUser = { ...currentUser, ...updateDto };

          // 更新 Service 狀態與 localStorage
          this.setUser(updatedUser);

          // 更新個別欄位
          if (updateDto.nickname) localStorage.setItem('user_nickname', updateDto.nickname);
          if (updateDto.avatar_url) localStorage.setItem('user_avatar_url', updateDto.avatar_url);
          if (updateDto.carrier) localStorage.setItem('user_carrier', updateDto.carrier);
        }
      })
    );
  }

  // 修改密碼
  changePassword(password: any) {
    const userId = this.user?.id;
    this.https
      .postApi(`http://localhost:8080/gogobuy/user/change-password?id=${userId}`, password)
      .subscribe({
        next: (res: any) => {
          Swal.fire('密碼修改成功，請重新登入');
        },
        error: (err) => {
          Swal.fire(err?.error?.message ?? '修改失敗');
        },
      });
  }

  // 忘記密碼
  resetPassword(email: string, otpCode: string, newPassword: string) {
    const req = {
      email: email,
      otpCode: otpCode,
      newPassword: newPassword
    };

    return this.https.putApi(`http://localhost:8080/gogobuy/user/reset-password`, req);
  }


  // 發送OTP驗證碼
  sendOtp() {
    const userId = this.user?.id;
    const userEmail = this.user?.email;

    if (!userId || !userEmail) {
      console.error('缺少使用者 ID 或 Email');
      return;
    }

    const body = { email: userEmail };

    const url = `http://localhost:8080/gogobuy/user/send-otp?id=${userId}`;

    this.https.postApi(url, body).subscribe({
      next: (res) => {
        console.log('OTP 已發送', res);
      },
      error: (err) => {
        console.error('發送失敗', err);
      }
    });
  }

  //根據email發送OTP驗證碼
  sendOtpEmail(email: string) {
    return this.https.postApi(`http://localhost:8080/gogobuy/user/send-otp-email`, email);
  }

  // 確認OTP驗證碼並更改email
  emailVerify(id: string, newEmail: string, otpCode: string) {
    const url = `http://localhost:8080/gogobuy/user/email-verify?id=${id}`;

    const body = {
      newEmail: newEmail,
      otpCode: otpCode
    };

    return this.https.putApi(url, body);
  }

  // 更新手機號碼
  connectPhone(id: string, phone: string) {
    const req = {
      phone: phone
    };

    const url = `http://localhost:8080/gogobuy/user/connect-phone?id=${id}`;

    return this.https.postApi(url, req.phone);
  }

  // 全域可用(因為要從AppComponent輸入，GogoBuyComponent更新資訊)
  store = signal<{ id: number; name: string; type: string; address: string; image: string; }[]>([]);
  eventsAll = signal<any[]>([]);
  events = signal<any[]>([]);
  private isPublicStore(s: any): boolean {
    const v = s.publish
    return v == 1 || v == '1' || v == true || v == 'true';
  }

  private isDeletedStore(s: any): boolean {
    const v = s.deleted;
    return v == 1 || v == '1' || v == true || v == 'true';
  }

  /**
   * performSearch：搜尋店家後，會讓首頁畫面「店家清單」跟「開團清單」連動
   * - 沒輸入：載入全部店家 + events 回到全部
   * - 有輸入：店家清單變搜尋結果 + events 只顯示這些店家的開團
   */
  performSearch(name: string) {
    const searchName = name.trim();
    const apiCall = searchName
      ? this.searchStores(searchName)
      : this.getallstore();

    apiCall.subscribe({
      next: (res: any) => {
        const demoImages = [
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
          'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800'
        ];

        const processedList = (res.storeList || [])
          .map((store: any, i: number) => ({
            ...store,
            image: store.image || demoImages[i % demoImages.length],
          }))
          .filter((s: any) => this.isPublicStore(s) && !this.isDeletedStore(s));
        // 更新店家清單
        this.store.set(processedList);
        // 沒輸入 → 回到全部開團（不 filter）
        if (!searchName) {
          this.events.set(this.eventsAll());
          return;
        }
        // 有輸入但找不到店家 → 開團清空
        if (processedList.length === 0) {
          this.events.set([]);
          return;
        }
        const storeIds = processedList.map((s: { id: any; }) => s.id);
        this.filterEventsByStoreIds(storeIds);
      },
      error: (err: any) => console.error('API 錯誤:', err)
    });
  }


  performEventSearch(hostNickname: string) {
    const q = hostNickname.trim();
    const apiCall = q ? this.getGroupbuyEventByName(q) : this.getallevent();
    this.fetchEvents(apiCall, !q);
  }

  // 依店家 id 篩開團
  filterEventsByStoreIds(storeIds: number[]) {
    const idSet = new Set(storeIds.map(Number));
    const base = this.eventsAll();

    this.events.set(
      base.filter(e => idSet.has(Number(e.storeId ?? e.storesId ?? e.storeId)))
    );
  }

  // 只需要在首頁一開始呼叫一次
  loadAllEventsOnce() {
    this.fetchEvents(this.getallevent(), true);
  }

  // 團名搜尋：只 filter
  filterEventsByName(keyword: string) {
    const q = keyword.trim().toLowerCase();
    const base = this.eventsAll();

    this.events.set(!q
      ? base
      : base.filter(e => (e.eventName || '').toLowerCase().includes(q))
    );
  }


  // 取得全部店家
  getallstore() {
    return this.https.getApi(`http://localhost:8080/gogobuy/store/all`);
  }

  // 搜尋店家
  searchStores(name: string) {
    const encodedName = encodeURIComponent(name);
    return this.https.getApi(`http://localhost:8080/gogobuy/store/searchName?name=${encodedName}`);
  }

  // 查詢開團者暱稱搜尋團
  getGroupbuyEventByName(hostNickname: string) {
    const encoded = encodeURIComponent(hostNickname);
    return this.https.getApi(
      `http://localhost:8080/gogobuy/getGroupbuyEventByNickName?host_nickname=${encoded}`
    );
  }

  // 查詢全部開團
  getallevent() {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getAll`);
  }

  // 查詢全部user
  getAllUser() {
    return this.https.getApi(`http://localhost:8080/gogobuy/user/get-all-user`);
  }

  // 搜尋附近商家(座標或地址)
  searchNearbyStore(lat?: number, lng?: number, address?: string, radius: number = 5) {
    const qs: string[] = [];
    if (lat != null) qs.push(`lat=${encodeURIComponent(String(lat))}`);
    if (lng != null) qs.push(`lng=${encodeURIComponent(String(lng))}`);
    if (address) qs.push(`address=${encodeURIComponent(address)}`);
    qs.push(`radius=${encodeURIComponent(String(radius))}`);

    return this.https.getApi(`http://localhost:8080/gogobuy/store/searchNearby?${qs.join('&')}`);
  }

  loadNearbyByGeo(lat: number, lng: number, radius: number = 5) {
    return this.searchNearbyStore(lat, lng, undefined, radius).pipe(
      tap((res: any) => this.applyNearbyStoreResult(res))
    );
  }

  loadNearbyByAddress(address: string, radius: number = 5) {
    return this.searchNearbyStore(undefined, undefined, address, radius).pipe(
      tap((res: any) => this.applyNearbyStoreResult(res))
    );
  }

  // 套用附近搜尋結果：
  // (1) store signal 直接改成附近店家清單
  // (2) events 立刻用店家 id 去篩（讓首頁開團清單同步變成附近店家的開團）
  private applyNearbyStoreResult(res: any) {
    const demoImages = [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
    ];

    const list = (res.storeList ?? res.stores ?? res.data ?? [])
      .map((s: any, i: number) => ({
        ...s,
        image: s.image || demoImages[i % demoImages.length],
      }))
    // 讓「原本首頁」自動連動：店家清單變附近、開團跟著篩
    this.store.set(list);
    this.filterEventsByStoreIds(list.map((x: any) => x.id));
  }
}
