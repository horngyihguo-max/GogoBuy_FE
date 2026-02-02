import { Injectable } from '@angular/core';
import { AuthService } from '../@service/auth.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  constructor(
    public auths: AuthService,
    private https: HttpService
  ) { }

  // 取得用戶所有訂單
  getCart(userId: string) {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getCart?user_id=${encodeURIComponent(userId)}`);
  }

  // 硬刪除
  deleteOrderByUserIdAndEventsId(userId: string, eventsId: number) {
    const url =
      `http://localhost:8080/gogobuy/deleteOrderByUserIdAndEventsId?user_id=${encodeURIComponent(userId)}&events_id=${eventsId}`;

    return this.https.postApi(url, null);
  }

}
