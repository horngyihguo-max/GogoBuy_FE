import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // 這邊專門放用戶資料相關API和變數
  constructor(private http: HttpClient) {}
  // TODO 用戶資料 (正式連接時用這個!)
  // user: any = null;

  // 假資料
  user: any = {
    id: '12b7bf42-57af-4e3f-acfc-b9a2ba3342aa',
    nickname: 'test',
    email: 'test3@gmail.com',
    phone: '0912345678',
    avatar_url: null,
    password: '$2a$10$84XlUdt7tG7sYTMx9XsTl.p9qQEHqyOzE.o1dgPAKBpLxGNPugxCW',
    role: 'user',
    created_at: '2026-01-08 12:02:57',
    exp: 120,
    carrier: null,
    times_remaining: 3,
  };

  // 把最新資料set進user
  setUser(user: any) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user)); // 刷新頁面也不會消失
  }

  loadUserFromStorage() {
    const raw = localStorage.getItem('user');
    this.user = raw ? JSON.parse(raw) : null;
  }

  // 刷新用戶資料
  refreshUser() {
    const id = this.user?.id;
    if (!id) return of(null);

    console.log('模擬刷新用戶資料');
    return;
    // TODO 用id去get用戶資料
  //   return this.http
  //     .get<any>(`/api/user/${id}`)
  //     .pipe(tap((res) => this.setUser(res)));
  }
}
