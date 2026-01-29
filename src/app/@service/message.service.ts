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

  // Adjust base URL if needed, assuming relative path for proxy or full path
  private apiUrl = 'http://localhost:8080/gogobuy/messages'; 

  constructor(private http: HttpClient) { }

  create(req: NotifiMesReq): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, req);
  }
}
