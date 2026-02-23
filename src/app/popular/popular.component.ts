import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { PopularService } from '../@service/popular.service';

interface StatusOption {
  label: string;
  value: string;
}

interface SalesLeaderboardProjection {
  storeName: string;
  productName: string;
  salesVolume: number;
  menuId: number;
}

@Component({
  selector: 'app-popular',
  imports: [
    SelectModule,
    FormsModule,
    CommonModule
  ],
  templateUrl: './popular.component.html',
  styleUrl: './popular.component.scss'
})
export class PopularComponent {

  constructor(private popularService: PopularService) { }

  salesDetailList = signal<SalesLeaderboardProjection[]>([]);

  // 篩選條件
  statusFilter = signal<'ALL' | 'YEAR' | 'MONTHLY' | 'WEEKLY' | 'DAILY'>('ALL');

  // 排行榜資料
  top10List = signal<any[]>([]);

  statusOptions: StatusOption[] = [
    { label: '顯示全部時間', value: 'ALL' },
    { label: '顯示 1 年', value: 'YEAR' },
    { label: '顯示 1 個月', value: 'MONTHLY' },
    { label: '顯示 1 個禮拜', value: 'WEEKLY' },
    { label: '顯示 1 天', value: 'DAILY' },
  ];

  ngOnInit() {
    this.loadTop10();
  }

  onStatusChange(value: any) {
    this.statusFilter.set(value);
    this.loadTop10();
  }

  loadTop10() {
    this.popularService.getTop10().subscribe({
      next: (res: any) => {
        // 從 API 回傳把 salesDetailList 更新到 signal
        this.salesDetailList.set(res.salesDetailList ?? []);
      },
      error: (err: any) => console.error(err),
    });
  }

}
