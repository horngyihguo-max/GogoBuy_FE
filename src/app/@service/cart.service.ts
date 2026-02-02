import { Injectable } from '@angular/core';
import { AuthService } from '../@service/auth.service';
import { HttpService } from './http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  constructor(
    public auths: AuthService,
    private https: HttpService
  ) { }

  // 取得開團資料
  getEventsByEventsId(id: number) {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getEventsByEventsId?id=${id}`);
  }

  // 取得該團詳細訂單
  getOrdersAll(eventId: number) {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getOrdersView?event_id=${eventId}`);
  }

  // 取得用戶所有訂單
  getCart(userId: string) {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getCart?user_id=${encodeURIComponent(userId)}`);
  }

  // 透過menuid取得訂單詳情
  getMenuByMenuId(menuIds: number[]) {
    let params = new HttpParams();
    for (const id of menuIds) {
      params = params.append('temp_menu', String(id));
    }
    return this.https.getApi(
      'http://localhost:8080/gogobuy/getMenuByMenuId', { params }
    );
  }


  // 取得用戶跟團訂單品項
  getOrders(userId: string, eventsId: number) {
    const url =
      `http://localhost:8080/gogobuy/getAllOrdersByUserIdAndEventsId?user_id=${encodeURIComponent(userId)}&events_id=${eventsId}`;
    return this.https.getApi(url);
  }


  // 硬刪除
  deleteOrderByUserIdAndEventsId(userId: string, eventsId: number) {
    const url =
      `http://localhost:8080/gogobuy/deleteOrderByUserIdAndEventsId?user_id=${encodeURIComponent(userId)}&events_id=${eventsId}`;

    return this.https.postApi(url, null);
  }

}


