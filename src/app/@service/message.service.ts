import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum NotifiCategoryEnum {
  GROUP_BUY = 'GROUP_BUY',
  SYSTEM = 'SYSTEM',
  WISH = 'WISH'
}

export interface NotifiMesReq {
  id?: number;
  category: NotifiCategoryEnum;
  title: string;
  content: string;
  targetUrl?: string; // Optional
  expiredAt?: string; // String format for backend
  createdAt?: string;
  userId?: string;
  eventId?: number;
  userNotificationVoList?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  // 團員公告 API
  private apiUrl = 'http://localhost:8080/gogobuy/messages'; 

  constructor(private http: HttpClient) { }

  create(req: NotifiMesReq): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, req);
  }

  // 管理者發送 SSE 公告
  setGlobalNotice(req: { msg: string, time?: string, minutes?: number }): Observable<any> {
    const url = 'http://localhost:8080/api/sse/set-notice';
    return this.http.post(url, req, { responseType: 'text' });
  }

  // 取得公告列表
  getGlobalNoticeHistory(): Observable<any> {
    const url = 'http://localhost:8080/api/sse/history';
    return this.http.get(url);
  }
}
