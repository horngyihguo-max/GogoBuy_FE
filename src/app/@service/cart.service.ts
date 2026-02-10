import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { HttpParams } from '@angular/common/http';

export interface BasicRes {
  code: number;
  message: string;
}


/**
 * CartService：處理「購物車 / 訂單 / 團購訂單視圖」相關 API
 * 大多數 API 使用 query string 傳參數（user_id / event_id / events_id）
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  constructor(
    private https: HttpService
  ) { }

  // 取得開團資料
  getEventsByEventsId(id: number) {
    return this.https.getApi(`http://localhost:8080/gogobuy/event/getEventsByEventsId?id=${id}`);
  }

  // 透過ID取得使用者資料(這裡只是要拿頭像)
  getUserById(userId: string) {
    return this.https.getApi(`http://localhost:8080/gogobuy/user/get-user?id=${userId}`);
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
  // 透過多個 menuId 取得品項詳細資料
  // 用 HttpParams.append 逐個加上去（append 不會覆蓋，會累加）
  getMenuByMenuId(menuIds: number[]) {
    let params = new HttpParams();
    for (const id of menuIds) {
      params = params.append('temp_menu', String(id));
    }
    return this.https.getApi(
      'http://localhost:8080/gogobuy/event/getMenuByMenuId', { params }
    );
  }


  // 取得用戶跟團訂單品項
  getOrders(userId: string, eventsId: number) {
    const url =
      `http://localhost:8080/gogobuy/event/getAllOrdersByUserIdAndEventsId?user_id=${encodeURIComponent(userId)}&events_id=${eventsId}`;
    return this.https.getApi(url);
  }


  // 刪除訂單（後端用 POST 做刪除，不是 RESTful 的 DELETE）
  // body 不需要資料，所以傳 null
  deleteOrderByUserIdAndEventsId(userId: string, eventsId: number) {
    const url =
      `http://localhost:8080/gogobuy/event/deleteOrderByUserIdAndEventsId?user_id=${encodeURIComponent(userId)}&events_id=${eventsId}`;

    return this.https.postApi(url, null);
  }

  // 物理性刪除團購活動
  deleteEventPhysically(id: string) {
    const url =
      `http://localhost:8080/gogobuy/event/deleteEventPhysically?id=${encodeURIComponent(id)}`;
    return this.https.postApi(id, null);
  }
  // 刪除單筆品項
  deleteOrderById(orderId: number) {
    const url = `http://localhost:8080/gogobuy/order/deleteOrderById?order_id=${orderId}`;
    return this.https.postApi<BasicRes>(url, null);
  }



}


