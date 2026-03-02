import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { HttpService } from '../../@service/http.service';
import { RouterLink } from "@angular/router";
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../@service/auth.service';

@Component({
  selector: 'app-my-stores',
  imports: [
    CommonModule, ConfirmPopupModule,
    TabsModule, ToastModule,
    AccordionModule, DialogModule,
    TagModule,
    ButtonModule,
    RouterLink
  ],
  templateUrl: './my-stores.component.html',
  styleUrl: './my-stores.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class MyStoresComponent {

  user: any | null = null;
  userId = '';
  privateStores: any[] = [];
  favoriteStoreIds: number[] = [];
  selectedStoreIds: number[] = [];

  // 收藏分類
  activeTab: string = 'favorite';
  favoriteStores: any[] = [];
  favoriteFastStores: any[] = [];
  favoriteSlowStores: any[] = [];

  // Dialog
  displayRemoveConfirm: boolean = false;

  // 展開陣列
  publicStoreExpandedIds: number[] = [];
  privateStoreExpandedIds: number[] = [];

  constructor(
    private http: HttpService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private auth: AuthService,
  ) { }

  ngOnInit(): void {
    this.userId = String(localStorage.getItem('user_id') || '');

    this.user = localStorage.getItem('user_info');
    // 刷新用戶資料
    this.auth.refreshUser();
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.favoriteStoreIds = user.favoriteStore || [];
      }
    });

    this.favoriteStores = [];

    this.favoriteStoreIds.forEach((id: number) => {
      this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${id}`).subscribe((store: any) => {
        if (store.storeList && store.storeList.length > 0) {
          const storeInfo = store.storeList[0];

          const fullStoreData = {
            ...storeInfo,
            operatingHoursVoList: store.operatingHoursVoList,
            menuCategoriesVoList: store.menuCategoriesVoList,
            productOptionGroupsVoList: store.productOptionGroupsVoList
          };

          this.favoriteStores.push(fullStoreData);
          this.favoriteFastStores = this.favoriteStores.filter(s => s.category === 'fast');
          this.favoriteSlowStores = this.favoriteStores.filter(s => s.category === 'slow');
        }

      });
    });

  }

  // 店家目前營業狀態
  isStoreOpen(store: any) {
    if (store.force_closed || !store.operatingHoursVoList?.length) {
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

      if (!start || !end) return false;
      // 處理跨日邏輯
      if (end < start) {
        return currentTime >= start || currentTime <= end;
      }

      return currentTime >= start && currentTime <= end;
    });
  }

  // 收藏按鈕
  handleFavoriteClick(event: Event, storeId: number) {
    event.stopPropagation();

    if (this.isFavorite(storeId)) {
      // 已收藏 彈窗確認移除
      this.confirmCancelFavorite(event, storeId);
    } else {
      // 未收藏
      this.executeAddFavorite(storeId);
    }
  }

  // 取消收藏彈出視窗
  confirmCancelFavorite(event: Event, storeId: number) {
    this.confirmationService.confirm({
      target: event.currentTarget as EventTarget,
      message: '確定要移除此店家嗎？',
      accept: () => {
        const updatedIds = this.favoriteStoreIds.filter(id => id !== storeId);
        this.syncFavoriteToServer(updatedIds, '移除成功');
      }
    });
  }

  // 未收藏 -> 收藏
  executeAddFavorite(storeId: number) {
    const updatedIds = [...this.favoriteStoreIds, storeId];
    this.syncFavoriteToServer(updatedIds, '已加入最愛喵！');
  }

  // 處理後端
  private syncFavoriteToServer(updatedIds: number[], successMsg: string) {
    const idParams = updatedIds.map(id => `storesList=${id}`).join('&');
    const url = `http://localhost:8080/gogobuy/updateFavoriteStore?id=${this.userId}${idParams ? '&' + idParams : ''}`;

    this.http.postApi(url, {}).subscribe({
      next: () => {
        this.favoriteStoreIds = updatedIds;
        this.favoriteStores = this.favoriteStores.filter(s => updatedIds.includes(s.id));

        this.messageService.add({ severity: 'success', summary: '成功', detail: successMsg, life: 2000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: '錯誤', detail: '同步失敗，請稍後再試' });
      }
    });
  }

  isFavorite(id: number): boolean {
    return this.favoriteStoreIds.includes(id);
  }

  // 判斷是否全選
  get isAllSelected(): boolean {
    return this.favoriteStores.length > 0 && this.selectedStoreIds.length === this.favoriteStores.length;
  }

  // 全選按鈕
  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.selectedStoreIds = this.favoriteStores.map(s => s.id);
    } else {
      this.selectedStoreIds = [];
    }
  }

  // 選擇店家
  toggleStoreSelection(storeId: number) {
    const index = this.selectedStoreIds.indexOf(storeId);
    if (index > -1) {
      this.selectedStoreIds.splice(index, 1);
    } else {
      this.selectedStoreIds.push(storeId);
    }
  }

  // 是否被勾選
  isStoreSelected(storeId: number): boolean {
    return this.selectedStoreIds.includes(storeId);
  }

  // 按鈕 移除選取 刪除
  removeFavorite() {
    if (this.selectedStoreIds.length === 0) {
      this.displayRemoveConfirm = false;
      return;
    }

    const deletedCount = this.selectedStoreIds.length;
    const remainingIds = this.favoriteStoreIds.filter(id => !this.selectedStoreIds.includes(id));
    const idParams = remainingIds.map(id => `storesList=${id}`).join('&');

    let url = `http://localhost:8080/gogobuy/updateFavoriteStore?id=${this.userId}`;
    if (idParams) {
      url += `&${idParams}`;
    } else {
      url += `&storesList=`;
    }
    this.http.postApi(url, {}).subscribe({
      next: (res) => {
        this.favoriteStoreIds = remainingIds;
        this.favoriteStores = this.favoriteStores.filter(s => remainingIds.includes(s.id));

        this.favoriteFastStores = this.favoriteStores.filter(s => s.category === 'fast');
        this.favoriteSlowStores = this.favoriteStores.filter(s => s.category !== 'fast');

        this.messageService.add({
          severity: 'success',
          summary: '移除成功',
          detail: `已移除 ${this.selectedStoreIds.length} 間店家`,
          life: 2000
        });

        this.selectedStoreIds = [];
        this.displayRemoveConfirm = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: '系統錯誤',
          detail: '無法更新收清單，請稍後再試'
        });
        this.displayRemoveConfirm = false;
      }
    })

  }
}
