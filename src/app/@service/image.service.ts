import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/*
 * 後端允許的上傳類型 private final List<String> ALLOWED_TYPES = List.of("avatars", "stores", "menu");
 * "avatars", "stores", "menu"
 */
export type ImageType = 'avatars' | 'stores' | 'menu';

@Injectable({ providedIn: 'root' })
export class ImageService {
  /*
   * 後端使用 "/upload/{type}" ，讓各頁面單獨判斷要上傳到哪一個資料夾
   * POST http://localhost:8080/image/upload/avatars
   * POST http://localhost:8080/image/upload/stores
   * POST http://localhost:8080/image/upload/menu
   *
   * 在需要上傳頁面的TS輸入type: ImageType = ' ';進行判斷，空格內填入"avatars", "stores", "menu"
  */
  private readonly baseUrl = 'http://localhost:8080/image';

  constructor(private http: HttpClient) { }

  /*
   * 上傳圖片（讓後端回傳圖床網址，但不直接上傳到資料庫)
   * type 圖片類型：avatars / stores / menu
   * file 要上傳的圖片檔案
   * Observable<string> 後端回傳的URL
   */
  upload(type: ImageType, file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(`${this.baseUrl}/upload/${type}`, form, {
      responseType: 'text',
    });
  }
}
