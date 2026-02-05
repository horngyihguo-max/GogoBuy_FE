import { OperatingHoursVoList } from './../../@service/store.service';

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { HttpService } from '../../@service/http.service';
import { Stores } from '../../@service/store.service';
import { RouterLink } from "@angular/router";
import { scheduled } from 'rxjs';

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
  ) { }

  ngOnInit(): void {
    this.userId = String(localStorage.getItem('user_id') || '');
    console.log("userId", this.userId);

    this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((res: any) => {
      if (res && Array.isArray(res.storeList)) {
        const myAllStores = res.storeList.filter((item: any) => item.createdBy === this.userId);

        this.allStores = myAllStores;
        this.privateStores = myAllStores.filter((s: any) => s.publish === false);
      }
    });
  }

  isStoreOpen(store: any){
    if(store.force_closed){
      return false;
    }
    if(!store.operatingHoursVoList || store.operatingHoursVoList.length === 0){
      return false;
    }
    const now = new Date();
    const currentDay = now.getDate() === 0 ? 7 : now.getDate();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" +
      now.getMinutes().toString().padStart(2, '0');

    const todaySchedules = store.operatingHoursVoList.filter((h: any) => h.week === currentDay);

    return todaySchedules.some((s: any) => {
      return currentTime >= s.startTime && currentTime <= s.endTime;
    })
  }

}
