import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PositionService {

  constructor(
    private http: HttpClient
  ) { }

  public lastCoords: { lat: number; lng: number } | null = null;
  public lastFetchAt: number = 0;

  // 其他 Component 可以更新資料
  updatePosition(lat: number, lng: number) {
    this.lastCoords = { lat, lng };
    this.lastFetchAt = Date.now();
    console.log('PositionService 已更新來自外部的定位數據:', this.lastCoords);
  }

  // position.service.ts
  getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      let watchId: number;
      // 設定計時器，如果 10 秒內都達不到理想精確度，就用當下最好的
      const timer = setTimeout(() => {
        navigator.geolocation.clearWatch(watchId);
        if (this.lastCoords) resolve(this.lastCoords);
        else reject('定位超時');
      }, 10000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const accuracy = pos.coords.accuracy;
          console.log(`即時精確度：${accuracy} 公尺`);

          this.lastCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.lastFetchAt = Date.now();

          // 🎯 如果精確度小於 5 公尺，就認為夠準了，停止搜尋
          if (accuracy < 5) {
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timer);
            resolve(this.lastCoords);
          }
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    });
  }

  getAddressFromOSM(lat: number, lng: number) {
    // 加入 zoom=18 確保拿到街道與門牌
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-TW`;

    return this.http.get<any>(url, {
      withCredentials: false,
      headers: {
        Accept: 'application/json'
      }
    });
  }


  // 計算兩點間的距離 (公尺)
  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // 地球半徑
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
