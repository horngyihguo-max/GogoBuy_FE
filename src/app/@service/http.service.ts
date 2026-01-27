import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  constructor(private http: HttpClient) { }

  // 讀取
  getApi(url: string): any {
    return this.http.get(url, {
      withCredentials: true
    });

  }

  // 新增
  postApi(url: string, postDate: any) {
    return this.http.post(url, postDate, {
      withCredentials: true
    });
  }

  // 更新
  putApi(url: string, putDate: any) {
    return this.http.put(url, putDate);
  }

  // PATCH
  patchApi(url: string, body: any) {
    return this.http.patch(url, body, { withCredentials: true });
  }

  // 刪除
  delApi(url: string) {
    return this.http.delete(url);
  }

  // 拿行政區域 
  getDApi(url: string, withCreds = true) {
    return this.http.get(url, {
      withCredentials: withCreds
    });
  }
}
