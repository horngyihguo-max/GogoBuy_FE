import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from './@service/auth.service';
import { TooltipModule } from 'primeng/tooltip';

type Mode = 'idle' | 'auto' | 'manual';

@Component({
  selector: 'app-nearby-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, InputTextModule, DialogModule, TooltipModule],
  templateUrl: './nearby-bar.component.html',
})
export class NearbyBarComponent implements OnInit, OnDestroy {
  private auths = inject(AuthService);

  dialogVisible = false;

  mode = signal<Mode>('idle');
  status = signal('');

  radius = signal<5 | 10 | 15 | 20>(5);
  radiusOptions = [
    { label: '5 km', value: 5 },
    { label: '10 km', value: 10 },
    { label: '15 km', value: 15 },
    { label: '20 km', value: 20 },
  ];

  address = signal('');

  private watchId: number | null = null;
  private lastLatLng: { lat: number; lng: number } | null = null;
  private lastFetchAt = 0;

  ngOnInit() {
    this.startAutoOnce();
  }

  ngOnDestroy() {
    this.stopWatch();
  }

  openDialog() {
    this.dialogVisible = true;
  }

  startAutoOnce() {
    if (!navigator.geolocation) {
      this.mode.set('manual');
      this.status.set('此裝置不支援定位，請改用地址搜尋');
      return;
    }

    this.mode.set('auto');
    this.status.set('定位中...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.lastLatLng = { lat, lng };
        this.fetchByGeo(lat, lng);
        this.dialogVisible = false;
        this.status.set('完成');
      },
      () => {
        this.mode.set('manual');
        this.status.set('定位被拒絕/失敗，請改用地址搜尋');
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }


  stopWatch() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  onRadiusChange(v: number) {
    const allowed = [5, 10, 15, 20] as const;
    const next = allowed.includes(v as any) ? (v as 5 | 10 | 15 | 20) : 5;
    this.radius.set(next);

    // 半徑改變就重查
    if (this.mode() == 'auto' && this.lastLatLng) {
      this.fetchByGeo(this.lastLatLng.lat, this.lastLatLng.lng);
    }
    if (this.mode() == 'manual' && this.address().trim()) {
      this.fetchByAddress(this.address().trim());
    }
  }

  fetchByGeo(lat: number, lng: number) {
    this.status.set(`搜尋附近店家（${this.radius()}km）...`);
    this.auths.loadNearbyByGeo(lat, lng, this.radius()).subscribe({
      next: (res: any) => this.status.set(res.message ?? '完成'),
      error: (err: any) => this.status.set(err?.error?.message ?? 'API 失敗'),
    });
  }

  fetchByAddress(addr: string) {
    if (!addr) {
      this.status.set('請先輸入地址');
      return;
    }
    this.mode.set('manual');
    this.status.set(`地址搜尋（${this.radius()}km）...`);
    this.auths.loadNearbyByAddress(addr, this.radius()).subscribe({
      next: (res: any) => {
        this.status.set(res.message ?? '完成');
        this.dialogVisible = false;
      },
      error: (err: any) => this.status.set(err?.error?.message ?? 'API 失敗'),
    });
  }

  clearNearby() {
    this.stopWatch();
    this.mode.set('idle');
    this.status.set('');

    // 回到原本「全部店家 + 全部開團」
    this.auths.performSearch('');
    this.auths.events.set(this.auths.eventsAll());
  }
}
