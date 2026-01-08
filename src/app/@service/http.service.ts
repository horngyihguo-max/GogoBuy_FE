import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  constructor(private http: HttpClient) { }

  // 讀取
  getApi(url: string): any {
    return this.http.get(url);
  }

  // 新增
  postApi(url: string, postDate: any) {
    return this.http.post(url, postDate);
  }

  // 更新
  putApi(url: string, postDate: any) {
    return this.http.put(url, postDate);
  }

  // 刪除
  delApi(url: string) {
    return this.http.delete(url);
  }
}
