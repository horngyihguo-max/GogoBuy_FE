import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/internal/operators/tap';
import Swal from 'sweetalert2';
import { HttpService } from './http.service';
import { BehaviorSubject } from 'rxjs';



@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 這邊專門放用戶資料相關API和變數
  constructor(
    private https: HttpService,
    private router: Router,
    private route: ActivatedRoute,) { }

  // TODO 用戶資料 (正式連接時用這個!)
  user: any = null;

  private userSubject = new BehaviorSubject<any>(this.getUserFromStorage());
  user$ = this.userSubject.asObservable();

  private eventDemoImages = [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
  ];

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

  private fetchEvents(apiCall: any, saveAll = false) {
    apiCall.subscribe({
      next: (res: any) => {
        const list = this.normalizeEvents(res);
        this.events.set(list);
        if (saveAll) this.eventsAll.set(list);
        console.log('events 更新後:', this.events());
      },
      error: (err: any) => {
        console.error('抓取開團失敗', err);
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
    console.log("user.avatar_url" + user.avatar_url);
    console.log("user.avatarUrl" + user.avatarUrl);
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
      console.warn('刷新失敗：找不到用戶 ID');
      return;
    }
    this.https.getApi(`http://localhost:8080/gogobuy/user/get-user?id=${userId}`).subscribe({
      next: (res: any) => {
        console.log('API 回傳原始資料:', res);
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
  login(payload: any) {
    this.https.postApi('http://localhost:8080/gogobuy/user/login', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code == 200) {
            console.log('登入成功，填寫資料：', payload);
            console.log('登入成功，回傳資料：', res);
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
    this.https
      .postApi('http://localhost:8080/gogobuy/user/registration', payload)
      .subscribe({
        next: (res: any) => {
          if (res.code === 200) {
            localStorage.setItem('user_session', payload.email);
            Swal.fire({
              title: '註冊成功!<br>請返回登入頁面登入',
              icon: 'success',
            });
          }
        },
        error: (err: any) => {
          console.log(err.message);
          Swal.fire({
            title: err.message || '註冊失敗',
            icon: 'error',
            timer: 2000,
          });
        },
      });
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


  performSearch(name: string) {
    const searchName = name.trim();
    const apiCall = searchName
      ? this.searchStores(searchName)
      : this.getallstore();
    apiCall.subscribe({
      next: (res: any) => {
        const demoImages = [
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // 餐廳內裝
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // 牛排
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // 披薩
          'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800'  // 飲品
        ];

        const processedList = (res.storeList || []).map((store: any, i: number) => ({
          ...store,
          // 如果 API 回傳的 image 是 null，就從陣列輪流拿圖
          image: store.image || demoImages[i % demoImages.length]
        }));
        // 更新 Service 裡的 Signal
        this.store.set(processedList);
        if (!searchName) {
          this.events.set(this.eventsAll()); // 回到全部
        } else {
          this.filterEventsByStoreIds(processedList.map((s: { id: any; }) => s.id));
        }
        if (processedList.length == 0) {
          this.events.set([]);
          return;
        }
        this.filterEventsByStoreIds(processedList.map((s: { id: any; }) => s.id));
        console.log('API 資料已成功存入 Signal:', this.store());
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
      `http://localhost:8080/gogobuy/getGroupbuyEventByStoresName?host_nickname=${encoded}`
    );
  }

  // 查詢全部開團
  getallevent() {
    return this.https.getApi(`http://localhost:8080/gogobuy/getAll`);
  }


  // 上傳圖床
  upAvatarIHS() {

  }

}
