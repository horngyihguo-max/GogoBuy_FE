import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { HttpService } from '../../@service/http.service';
import { Router, RouterLink } from "@angular/router";
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StoreService } from '../../@service/store.service';

@Component({
  selector: 'app-my-stores',
  imports: [
    CommonModule,
    TabsModule,
    AccordionModule,
    TagModule,
    ButtonModule,
    RouterLink
  ],
  templateUrl: './my-stores.component.html',
  styleUrl: './my-stores.component.scss'
})
export class MyStoresComponent {

  userId = '';
  allStores: any[] = [];
  publicStores: any[] = [];
  privateStores: any[] = [];
  activeTab: string = 'myCreate';

  // 展開陣列
  publicStoreExpandedIds: number[] = [];
  privateStoreExpandedIds: number[] = [];

  constructor(
    private http: HttpService,
    private router: Router,
    private storeService: StoreService,
  ) { }

  ngOnInit(): void {
    this.userId = String(localStorage.getItem('user_id') || '');
    console.log("userId", this.userId);

    this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((res: any) => {
      if (res && res.storeList) {
        const myAllStores = res.storeList.filter((item: any) => item.createdBy === this.userId);

        myAllStores.forEach((store: any) => {
          this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${store.id}`).subscribe((detail: any) => {
            store.operatingHoursVoList = detail.operatingHoursVoList;
          });
        });
        this.allStores = myAllStores;
        this.privateStores = myAllStores.filter((s: any) => s.publish === false);
      }
    });
  }

  addStore(){
    this.storeService.clearCurrentStore();
    this.router.navigate(['/management/store_upsert']);
  }

  isStoreOpen(store: any) {
    if (store.force_closed) {
      return false;
    }
    if (!store.operatingHoursVoList || store.operatingHoursVoList.length === 0) {
      return false;
    }
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" +
      now.getMinutes().toString().padStart(2, '0');

    const todaySchedules = store.operatingHoursVoList.filter((h: any) => h.week === currentDay);

    return todaySchedules.some((s: any) => {
      const start = s.openTime?.substring(0, 5);
      const end = s.closeTime?.substring(0, 5);

      return currentTime >= start && currentTime <= end;
    })
  }

}
