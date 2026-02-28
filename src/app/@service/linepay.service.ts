import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LinePayService {
  private apiUrl = 'http://localhost:8080/api/payments/linepay';

  constructor(private http: HttpClient) { }

  requestPayment(eventId: number, userId?: string): Observable<string> {
    const url = userId 
      ? `${this.apiUrl}/request/pay?eventId=${eventId}&userId=${userId}`
      : `${this.apiUrl}/request/pay?eventId=${eventId}`;
    return this.http.post(url, {}, { responseType: 'text' });
  }

  confirmPayment(transactionId: string, amount: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/confirm?transactionId=${transactionId}&amount=${amount}`, { responseType: 'text' });
  }
}
