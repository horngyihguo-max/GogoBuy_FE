import { Injectable, signal, effect } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class OrderTransferService {

  latestOrderTime = signal<string>(
    localStorage.getItem('latestOrderTime') || ''
  );

  constructor() {
    // 當 signal 改變時，同步寫入 localStorage
    effect(() => {
      const value = this.latestOrderTime();
      localStorage.setItem('latestOrderTime', value);
    });
  }
}
