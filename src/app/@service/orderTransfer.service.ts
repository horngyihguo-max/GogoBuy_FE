import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class OrderTransferService {
  latestOrderTime = signal<string>('');
}
