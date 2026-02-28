import { FeeDescriptionVoList, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, PriceLevel, ProductOptionGroupsVoList, Stores } from './../../@service/store.service';
import { Component, NgZone, ViewChild } from '@angular/core';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { Dialog } from "primeng/dialog";
import { PickListModule } from 'primeng/picklist';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FormsModule } from "@angular/forms";
import { DatePickerModule } from 'primeng/datepicker';
import { PrimeNG } from 'primeng/config';
import Swal from 'sweetalert2';
import { TabsModule } from 'primeng/tabs';
import { Popover } from 'primeng/popover';
import * as L from 'leaflet';
import { PositionService } from '../../@service/position.service';



@Component({
  template: `
    <div class="card">
      <p-tabs value="0" scrollable>
        <p-tablist>
          @for (tab of scrollableTabs; track tab.value) {
            <p-tab [value]="tab.value">
                {{ tab.title }}
            </p-tab>
          }
        </p-tablist>
        <p-tabpanels>
          @for (tab of scrollableTabs; track tab.value) {
            <p-tabpanel [value]="tab.value">
                <p class="m-0">{{ tab.content }}</p>
            </p-tabpanel>
          }
        </p-tabpanels>
      </p-tabs>
    </div>`,
  standalone: true,
  selector: 'app-group-event',
  imports: [
    CommonModule, Dialog, PickListModule, DragDropModule,
    InputGroupModule, InputGroupAddonModule, InputNumberModule, FloatLabelModule,
    FormsModule, DatePickerModule, TabsModule,
    Popover
  ],
  templateUrl: './group-event.component.html',
  styleUrl: './group-event.component.scss'
})
export class GroupEventComponent {
  constructor(
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private primeng: PrimeNG,
    private location: Location,
    private ngZone: NgZone,
    private positionService: PositionService
  ) { };

  storeList: Stores | null = null;
  operatingHoursVoList: OperatingHoursVoList[] = [];
  menuVoList: MenuVoList[] = [];
  menuCategoriesVoList: MenuCategoriesVoList[] = [];
  productOptionGroupsVoList: ProductOptionGroupsVoList[] = [];
  feeDescriptionVoList: FeeDescriptionVoList[] = [];

  eventName!: string;
  endTime!: Date;
  // splitType!: string;
  announcement!: string;
  type!: string;
  tempMenu: number[] = [];  //存品項id
  recommend: number[] = [];  //存推薦id
  recommendDescription!: string;
  limitation!: number;
  pickTime!: Date;
  pickLocation!: string;
  shippingFee: number = 0;

  scrolllabelTabs: any = [];
  isExist: boolean = true;  //判斷店家存在
  userId!: string;
  storeId!: number;
  // wishId?: number;
  eventId?: number;
  storeIdFromEvent!: number;
  isOpen!: boolean;
  operateString!: string;
  nextOperating!: string;
  isPreview!: boolean;
  useAll!: boolean;
  minDate: Date = new Date();
  maxEndDate: Date = new Date(new Date().setMonth(new Date().getMonth() + 2));
  maxPickDate!: Date;
  previewTab!: number;
  isLoadingLocation = false;
  currentLocation: any = null;
  currentAddress!: string;


  dateFormat(date: Date) {  //後端回傳營業間轉換
    const dateString = date.toString();
    const weekday = dateString.split(' ')[0];
    const weekMap: any = {
      'Sun': '7',
      'Mon': '1',
      'Tue': '2',
      'Wed': '3',
      'Thu': '4',
      'Fri': '5',
      'Sat': '6'
    };
    return weekMap[weekday];
  }
  formatToFullDateTime(date: Date | null): string {  //資料存進後端前轉換
    if (!date) return '';
    const d = new Date(date);
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}:00`;
  }

  loginFirst() {  //登入警告
    Swal.fire({
      title: "請先登入",
      width: 400,
      padding: "3em",
      customClass: {
        container: 'my-glass-backdrop' // 自定義遮罩類別
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: true,
      showConfirmButton: true,
      confirmButtonText: "確定",
      confirmButtonColor: "#662222"
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/gogobuy/login']);
      }
    });
  }
  showAlert(title: string, text: string) {  //必填警告、營業時間警告
    Swal.fire({
      icon: 'warning',
      title: title,
      text: text,
      width: 600,
      confirmButtonColor: '#7F1D1D',
      confirmButtonText: '我知道了',
      didOpen: () => {
        const c = document.querySelector('.swal2-container') as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }
  // operatingAlert() {  //營業時間警告
  //   Swal.fire({
  //     title: "截止時間不在店家營業時間內",
  //     text: "確定要繼續嗎?",
  //     icon: "warning",
  //     showConfirmButton: true,
  //     confirmButtonText: "繼續",
  //     showCancelButton: true,
  //     cancelButtonText: "取消",
  //     reverseButtons: true,  //左右交換位置
  //     customClass: {
  //       confirmButton: 'px-8 py-3 bg-[#7F1D1D] text-white rounded-xl mx-3 hover:bg-[#F4E7E1] hover:text-black active:scale-85 transition duration-150',
  //       cancelButton: 'px-8 py-3 bg-slate-400 text-white rounded-xl mx-3 hover:bg-slate-400/50 hover:text-black active:scale-85 transition duration-150'
  //     },
  //     buttonsStyling: false
  //   }).then((result) => {
  //     if (result.isConfirmed) {
  //       this.isPreview = true;
  //     } else {
  //       this.isPreview = false;
  //     }
  //   });
  // }
  usualAlert(title: string) {  //一般警告
    Swal.fire({
      icon: 'warning',
      title: title,
      text: '即將返回上一頁',
      width: 600,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    }).then((result) => {
      if (window.history.length > 1) {
        this.location.back();
      } else {
        this.router.navigate(['/gogobuy/home']);
      }
    });
  }
  positionSpinnerAlert() {
    Swal.fire({
      title: '正在定位請稍後',
      allowOutsideClick: false,
      showConfirmButton: false,
      width: '300px',
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
  positionSuccessAlert() {
    Swal.fire({
      icon: 'success',
      title: '定位更新成功',
      text: this.currentAddress,
      timer: 2000,
      showConfirmButton: false
    });
  }


  ngOnInit(): void {
    this.userId = String(localStorage.getItem('user_id'));
    if (!this.userId || this.userId === 'null') {
      this.loginFirst();
    }
    if (this.positionService.lastCoords) {
      this.currentLocation = this.positionService.lastCoords;
      console.log('載入快取位置:', this.currentLocation);
    }
    this.route.queryParams.subscribe(params => {
      if (params['event_id']) {
        this.eventId = Number(params['event_id']);
      }
    });
    this.route.queryParams.subscribe(params => {
      if (params['store_id']) {
        this.storeId = Number(params['store_id']);
      }
    });
    this.isPreview = false;
    this.useAll = false;
    // 設定中文語系
    this.primeng.setTranslation({
      dayNames: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
      dayNamesShort: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
      dayNamesMin: ["日", "一", "二", "三", "四", "五", "六"],
      monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
      monthNamesShort: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"],
      today: '今天',
      clear: '清除',
      dateFormat: 'yy/mm/dd',
      weekHeader: '週'
    });

    //行為判斷：有 storeId 沒 eventId 是新增；有 eventId 沒 storeId 是修改
    if (this.storeId && !this.eventId) {
      this.http.getApi('http://localhost:8080/gogobuy/store/searchId?id=' + this.storeId).subscribe((res: any) => {
        if (res.code == 200) {
          this.getStore(res);
        } else {
          this.isExist = false;
        }
      });
    } else if (this.eventId && !this.storeId) {
      this.http.getApi('http://localhost:8080/gogobuy/event/getEventsByEventsId?id=' + this.eventId).subscribe((eventRes: any) => {
        if (eventRes.code == 200) {
          this.http.getApi('http://localhost:8080/gogobuy/store/searchId?id=' + eventRes.groupbuyEvents[0].storeId).subscribe((storeRes: any) => {
            if (storeRes.code == 200) {
              this.getStore(storeRes);
              if (this.userId == eventRes.groupbuyEvents[0].hostId) {
                this.eventName = eventRes.groupbuyEvents[0].eventName;
                this.storeIdFromEvent = eventRes.groupbuyEvents[0].storeId;

                const rawEndTime = eventRes.groupbuyEvents[0].endTime; // "2026-02-25T11:08:00"
                if (rawEndTime) {
                  this.endTime = new Date(rawEndTime);
                }

                // this.isConfirmed = true;
                // this.splitType = eventRes.groupbuyEvents[0].splitType;
                // this.choose(this.splitType);
                this.announcement = eventRes.groupbuyEvents[0].announcement;
                this.type = eventRes.groupbuyEvents[0].eventType;
                this.shippingFee = eventRes.groupbuyEvents[0].shippingFee || 0;

                this.tempMenu = eventRes.groupbuyEvents[0].tempMenuList
                if (this.tempMenu.length > 0) {
                  this.selectedItems = this.menuVoList.filter(item => this.tempMenu.includes(item.id));
                  this.updateDisplaySource();
                } else {
                  this.updateDisplaySource();
                };

                const rawRecommend = eventRes.groupbuyEvents[0].recommendList;
                if (rawRecommend) {
                  let recommendArray: any[] = [];
                  try {
                    if (Array.isArray(rawRecommend)) {
                      recommendArray = rawRecommend;
                    } else if (typeof rawRecommend === 'string') {
                      recommendArray = JSON.parse(rawRecommend);
                    }
                  } catch (e) {
                    // 萬一 JSON.parse 失敗（例如格式真的是 "1021,1020"），回退到 split
                    console.warn('JSON parse 失敗，嘗試使用 split 切割');
                    recommendArray = String(rawRecommend).replace(/[\[\]]/g, '').split(',');
                  }
                  const savedIds: number[] = recommendArray.map(id => Number(id)).filter(id => !isNaN(id));
                  this.recommend = [];
                  savedIds.forEach(id => {
                    // 搜尋對象建議包含 menuVoList 與 selectedItems 確保兩邊都標記到
                    const product = this.selectedItems.find(item => Number(item.id) === id);
                    if (product) {
                      product.isRecommended = true;
                      this.recommend.push(id);
                    }
                  });
                  this.updateDisplaySource();
                } else {
                  this.recommend = [];
                }

                this.recommendDescription = eventRes.groupbuyEvents[0].recommendDescription;
                this.limitation = eventRes.groupbuyEvents[0].limitation;

                const rawPickTime = eventRes.groupbuyEvents[0].pickupTime;
                if (rawPickTime) {
                  this.pickTime = new Date(rawPickTime);
                }

                this.pickLocation = eventRes.groupbuyEvents[0].pickLocation;
              } else {
                Swal.fire({
                  icon: 'warning',
                  title: '您沒有權限修改此活動資訊',
                  text: '即將返回上一頁',
                  width: 600,
                  timer: 2000,
                  showConfirmButton: false,
                  timerProgressBar: true,
                  didOpen: () => {
                    const c = document.querySelector('.swal2-container') as HTMLElement | null;
                    if (c) c.style.zIndex = '20000';
                  }
                }).then((result) => {
                  if (window.history.length > 1) {
                    this.location.back();
                  } else {
                    this.router.navigate(['/gogobuy/home']);
                  }
                });
              }
            } else {
              this.isExist = false;
            }
          });
        } else {
          this.usualAlert(eventRes.message);
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: '無效網址',
        text: '即將跳轉至首頁',
        width: 600,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        didOpen: () => {
          const c = document.querySelector('.swal2-container') as HTMLElement | null;
          if (c) c.style.zIndex = '20000';
        }
      }).then((result) => {
        this.router.navigate(['/gogobuy/home']);
      });
    }

  }

  getStore(res: any) {
    const now = new Date();
    const today = this.dateFormat(now);
    const time = now.getHours() * 100 + now.getMinutes();

    this.isExist = true;
    this.storeList = res.storeList[0];
    if (this.storeList) {
      this.type = this.storeList.type;
    }
    this.menuVoList = res.menuVoList.filter((item: any) => item.available) || [];
    this.menuCategoriesVoList = res.menuCategoriesVoList || [];
    if (this.menuCategoriesVoList?.length > 0) {
      const categoryMap = new Map(
        this.menuCategoriesVoList.map(cat => [cat.id, cat])
      );
      for (const cate of this.menuVoList) {
        const matchedCategory = categoryMap.get(cate.categoryId);
        const perPrice: PriceLevel[] = [];
        const base = Number(cate.basePrice) || 0;
        if (matchedCategory?.priceLevel && matchedCategory.priceLevel.length > 0) {
          matchedCategory.priceLevel.forEach(level => {
            perPrice.push({
              name: level.name,
              price: (level.price || 0) + base
            });
          });
        } else {
          perPrice.push({
            name: '單價',
            price: base
          });
        }
        cate.basePrice = perPrice;
      }
      this.activeTab = this.menuCategoriesVoList[0]?.id;
    }
    this.productOptionGroupsVoList = res.productOptionGroupsVoList;
    this.feeDescriptionVoList = res.FeeDescription;

    this.operatingHoursVoList = res.operatingHoursVoList.sort((a: any, b: any) => a.openTime.localeCompare(b.openTime));  // 排序 (字串比較)
    const todayList = this.operatingHoursVoList
      .filter(each => each.week == today)
      .sort((a, b) => a.openTime.localeCompare(b.openTime));  // 排序 (字串比較)
    // --------有return放最後面--------
    const yesterday = today === 1 ? 7 : today - 1;
    // 找昨天「最後一段」營業時間
    const yesterdayLastShift = this.operatingHoursVoList
      .filter(each => each.week == yesterday)
      .sort((a, b) => a.openTime.localeCompare(b.openTime))
      .pop(); // 取最後一段
    // 檢查是否處於「昨天跨過來」的營業時間
    if (yesterdayLastShift) {
      const yOpen = (+yesterdayLastShift.openTime.split(":")[0]) * 100 + (+yesterdayLastShift.openTime.split(":")[1]);
      let yClose = (+yesterdayLastShift.closeTime.split(":")[0]) * 100 + (+yesterdayLastShift.closeTime.split(":")[1]);
      if (yClose < yOpen && yClose !== 0) {
        if (time < yClose) {
          this.isOpen = true;
          this.operateString = "營業至 " + yesterdayLastShift.closeTime.slice(0, 5);

          // 下一段是今天的第 0 段
          if (todayList.length > 0) {
            this.nextOperating = "下次開始營業時間為 " + todayList[0].openTime.slice(0, 5);
          } else {
            this.nextOperating = this.getFutureOpenTime(today);
          }
          return; // 確定營業中，直接結束
        }
      }
    }
    if (todayList.length > 0) {
      for (let i = 0; i < todayList.length; i++) {
        const open = (+todayList[i].openTime.split(":")[0]) * 100 + (+todayList[i].openTime.split(":")[1]);
        let close = (+todayList[i].closeTime.split(":")[0]) * 100 + (+todayList[i].closeTime.split(":")[1]);
        if (close == 0) {
          close = 2400;
        }
        const isOvernight = close < open;
        const isCurrentOpen = isOvernight
          ? (time >= open || time <= close)   // 跨夜：大於開始時間「或」小於結束時間
          : (time >= open && time <= close); // 正常：介於兩者之間
        // --- 營業中 ---
        if (isCurrentOpen) {
          this.isOpen = true;
          this.operateString = "營業至 " + todayList[i].closeTime.slice(0, 5);

          if ((i + 1) < todayList.length) {
            this.nextOperating = "下次開始營業時間為 " + todayList[i + 1].openTime.slice(0, 5);
          } else {
            this.nextOperating = this.getFutureOpenTime(today); // 抓明天的 function
          }
          return; // 找到狀態，跳出
        }
        // --- 休息中：但今天稍後還有開門 ---
        // 因為 todayList 排過序，第一個滿足 time < open 的就是最近的開門時間。
        if (!isOvernight && time < open) {
          this.isOpen = false;
          this.operateString = "休息中";
          this.nextOperating = "下次開始營業時間為 " + todayList[i].openTime.slice(0, 5);
          return;
        }
      }
      // --- 休息中：今天所有的時段都已經結束了 ---
      this.isOpen = false;
      this.operateString = "休息中";
      this.nextOperating = this.getFutureOpenTime(today);
    } else {
      // 今日整天公休
      this.isOpen = false;
      this.operateString = "休息中";
      this.nextOperating = this.getFutureOpenTime(today);
    }
  }
  getFutureOpenTime(currentDay: number): string {
    const weekNames = ["", "週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    if (!this.operatingHoursVoList || this.operatingHoursVoList.length === 0) {
      return "近期無營業時段";
    }
    // offset 代表「幾天後」，從 1 (明天) 開始找，最多找 7 天 (繞一週)
    for (let offset = 1; offset <= 7; offset++) {
      // 循環公式：確保週日(7)加 1 天後會回到週一(1)
      const targetWeek = (Number(currentDay) + offset - 1) % 7 + 1;
      const nextList = this.operatingHoursVoList
        .filter(each => Number(each.week) === targetWeek)
        .sort((a, b) => a.openTime.localeCompare(b.openTime));
      // 只要這天有資料，就回傳並結束 Function
      if (nextList.length > 0) {
        let dayLabel = "";
        if (offset === 1) {
          dayLabel = "明天";
        } else {
          dayLabel = weekNames[targetWeek];
        }
        return `下次開始營業時間為 ${dayLabel} ${nextList[0].openTime.slice(0, 5)}`;
      }
    }
    return "近期無營業時段";  // 繞了一圈 7 天都沒資料
  }


  splitOpen = false;
  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.splitOpen = !this.splitOpen;
  }
  // choice!: string;
  // choose(choice: string) {
  //   if (choice == "EQUAL") {
  //     this.choice = "平分制";
  //     this.splitType = "EQUAL";
  //   } else {
  //     this.choice = "權重制";
  //     this.splitType = "WEIGHT";
  //   }
  //   this.splitOpen = false;
  // }
  // close() {
  //   this.splitOpen = false;
  // }
  // openDialog: boolean = false;
  // dialog() {
  //   this.openDialog = true;
  // }
  // isConfirmed!: boolean;
  // onCheckChange(event: any) {
  //   this.isConfirmed = event.target.checked;
  // }


  useAllChange(event: any) {
    this.useAll = event.target.checked;
    if (this.useAll) {
      this.selectedItems = this.menuVoList;
      this.updateDisplaySource();  //雖然fixPaddingPosition裡已經有呼叫updateDisplaySource，但為避免畫面延遲，先自己呼叫一次
      this.fixPaddingPosition();
    } else {
      this.selectedItems.map(item => item.isRecommended = false);
      this.selectedItems = [this.paddingItem];
      this.recommend = [];
      this.updateDisplaySource();
      this.fixPaddingPosition();
    }
  }
  calculatePaddingHeight(): string {
    // 減掉 1 是因為 selectedItems 裡面包含墊片
    const itemCount = this.selectedItems.length - 1;
    const totalHeight = 480; // 內部容器高度
    const itemHeight = 95;  // product-item 估計高度
    const remainingHeight = totalHeight - (itemCount * itemHeight);
    // 確保墊片最少有 50px，最高不超過 480px
    const finalHeight = Math.max(remainingHeight, 50);
    return `${finalHeight}px`;
  }
  calculateSourcePaddingHeight(): string {
    // 減掉 1 是因為 selectedItems 裡面包含墊片
    const itemCount = this.displaySource.length - 1;
    const totalHeight = 480; // 內部容器高度
    const itemHeight = 95;  // product-item 估計高度
    const remainingHeight = totalHeight - (itemCount * itemHeight);
    // 確保墊片最少有 50px，最高不超過 480px
    const finalHeight = Math.max(remainingHeight, 50);
    return `${finalHeight}px`;
  }
  // 給 PickList 顯示用的實體陣列
  sourcePaddingItem = { id: 'SOURCE_PADDING', isPadding: true };
  paddingItem = { id: 'BOTTOM_PADDING', isPadding: true };
  displaySource: any[] = [];  // 來源清單
  selectedItems: any[] = [this.paddingItem];  // 目標清單
  // 監控 Tab 切換 (在 p-tabs 綁定了 (valueChange) 或透過 activeTab 的 setter)
  private _activeTab: any;
  get activeTab() { return this._activeTab; }
  set activeTab(val: any) {
    this._activeTab = val;
    this.updateDisplaySource(); // 每次切換 Tab 就更新一次
  }
  updateDisplaySource() {  // 更新顯示清單的方法
    this.displaySource = this.menuVoList.filter(item =>
      item.categoryId == this._activeTab &&
      !this.selectedItems.some(s => s.id === item.id)
    );
    if (this.displaySource.length === 0) {
      this.displaySource = [this.sourcePaddingItem];
    } else {
      this.displaySource.push(this.sourcePaddingItem);
    }
  }
  onMoveToTarget(event: any) {  // 選中
    this.fixPaddingPosition();
  }
  onMoveToSource(event: any) {  // 取消選中 (從 Target 搬回 Source)
    const movedItems = event.items;
    movedItems.forEach((item: any) => {
      this.recommend = this.recommend.filter(id => id !== item.id);
    });
    this.useAll = false;
    this.fixTabAndRecommend(event);
    this.fixPaddingPosition();
  }
  isItemInTarget(product: any): boolean {    // 檢查這個項目是否在已選清單中
    return this.selectedItems.some(item => item.id === product.id);
  }
  onMoveAllToSource(event: any) {
    this.recommend = [];
    this.useAll = false;
    this.fixTabAndRecommend(event);
    this.fixPaddingPosition();
  }
  onMoveAllToTarget(event: any) {
    this.fixPaddingPosition();
  }
  fixPaddingPosition() {
    // 給 PrimeNG 內建邏輯 50ms 的緩衝，確保它跑完
    setTimeout(() => {
      // 處理 Target
      this.selectedItems = [
        ...this.selectedItems.filter(i => i.id !== 'BOTTOM_PADDING' && i.id !== 'SOURCE_PADDING'),
        this.paddingItem
      ];
      // 處理 Source
      this.displaySource = [
        ...this.displaySource.filter(i => i.id !== 'SOURCE_PADDING' && i.id !== 'BOTTOM_PADDING'),
        this.sourcePaddingItem
      ];
      this.updateDisplaySource();
    }, 10);
  }
  private fixTabAndRecommend(event: any) {
    if (event && event.items && Array.isArray(event.items)) {
      const movedItems = event.items.filter((item: any) => !item.isPadding);
      movedItems.forEach((item: any) => item.isRecommended = false);
      const tabSet = new Set(movedItems.map((item: any) => item.categoryId));
      if (tabSet.size == 1) {
        // 從 Set 中取出第一個（也是唯一一個）值
        const singleCategoryId = tabSet.values().next().value;
        // 確保不把 paddingItem 的 ID 誤存進去 (墊片沒有 categoryId)
        if (singleCategoryId !== undefined) {
          this.activeTab = singleCategoryId;
        }
      } else {
        this.activeTab = this.menuCategoriesVoList[0].id;
      }
    } else if (event && event.categoryId) {
      this.activeTab = event.categoryId;
      event.isRecommended = false;
    }
  }
  // getPaddingHeight() {
  //   const containerHeight = 9; // 總高度 18rem
  //   const itemCount = this.selectedItems.filter(i => !i.isPadding).length;
  //   const occupiedHeight = itemCount * 3.5;    // 假設一個項目加上間距大約佔 3.5rem
  //   const remaining = containerHeight - occupiedHeight;
  //   return `${Math.max(remaining, 3)}rem`;  // 最小高度設為 3rem
  // }
  removeItem(product: any, event: MouseEvent) {
    // 阻止事件冒泡，防止觸發 PickList 的選取效果
    event.stopPropagation();
    // 將項目從已選清單移除
    this.selectedItems = this.selectedItems.filter(item => item.id != product.id);
    this.recommend = this.recommend.filter(id => id != product.id);
    // 將項目加回來源清單 (如果不在裡面的話)
    if (!this.displaySource.find(item => item.id === product.id)) {
      this.displaySource = [...this.displaySource, product];
    }
    this.useAll = false;
    this.fixTabAndRecommend(product);
    this.fixPaddingPosition();
    this.updateDisplaySource();
  }
  toggleRecommend(product: any, event: MouseEvent) {
    // 阻止事件冒泡，避免觸發 PickList 的選取/拖拽動作
    event.stopPropagation();
    // 切換選中狀態
    product.isRecommended = !product.isRecommended;
    if (product.isRecommended == true) {
      this.recommend.push(product.id);
    } else {
      this.recommend = this.recommend.filter(id => id != product.id);
    }
  }


  updatePickTimeRange() {
    if (this.endTime) {
      const max = new Date(this.endTime);
      max.setMonth(max.getMonth() + 1);
      this.maxPickDate = max;
      if (this.pickTime && this.pickTime > this.maxPickDate) {
        this.pickTime = new Date(this.maxPickDate);
      }
    }
    if (this.pickTime) {
      if (this.pickTime <= this.endTime) {
        // 如果取貨時間變得早於或等於新的結單時間，自動更新為結單後 30 分鐘
        const autoCorrect = new Date(this.endTime);
        autoCorrect.setMinutes(autoCorrect.getMinutes() + 30);
        this.pickTime = autoCorrect;

        // 這裡可以選擇是否要彈 Swal 提示，或是靜默更新
        console.log('偵測到結單時間變動，已自動推遲取貨時間');
      } else if (this.pickTime > this.maxPickDate) {
        // 如果原本選的時間太遠，超過了一個月，就縮回到最大值
        this.pickTime = new Date(this.maxPickDate);
      }
    } else {
      // 如果原本沒選取貨時間，直接預設一個
      this.handlePickupOnShow();
    }
  }
  handleOnShow() {
    if (!this.endTime) {
      const nextMinute = new Date();
      nextMinute.setMinutes(nextMinute.getMinutes() + 5);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      // 設定初始預設時間
      this.endTime = new Date(nextMinute);
      // 同步更新 minDate 防止選回過去
      this.minDate = new Date(nextMinute);
    }
  }
  // onTimeChange(value: Date) {
  //   // 檢查是否為有效的 Date 物件
  //   if (value instanceof Date && !isNaN(value.getTime())) {
  //     const now = new Date();
  //     // 只有當時間真的「落後現在太多」且不是在打字中的狀態才校正
  //     // 或者乾脆只在 DatePicker 選取時才校正，手動輸入則交給後端或最後送出前驗證
  //     if (value < now) {
  //       console.warn("選擇的時間不能早於現在");
  //       // 這裡可以選擇不強制覆寫，而是顯示錯誤訊息
  //     }
  //   }
  // }
  handleBlur() {
    setTimeout(() => {
      const activeEl = document.activeElement;
      if (activeEl?.closest('.p-datepicker')) return;

      if (!this.endTime) return;

      let rawValue = String(this.endTime).trim();
      rawValue = rawValue.replace(/-/g, '/').replace(/\s+/g, ' ');

      // 處理全數字格式
      const allNumericRegex = /^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})$/;
      if (allNumericRegex.test(rawValue)) {
        rawValue = rawValue.replace(allNumericRegex, '$1/$2/$3 $4:$5');
      }

      // 處理時間位數與冒號 (略，同你目前的邏輯...)
      // ... (這部分維持你目前的代碼) ...

      let parsedDate = new Date(rawValue);

      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        const compareParsed = new Date(parsedDate).setSeconds(0, 0);
        const compareNow = new Date(now).setSeconds(0, 0);

        if (compareParsed <= compareNow) {
          // (自動修正邏輯...)
          const nextMinute = new Date();
          nextMinute.setMinutes(nextMinute.getMinutes() + 1, 0, 0);
          this.endTime = nextMinute;
        } else {
          this.endTime = parsedDate; // 這裡確定 endTime 是乾淨的 Date 物件了
        }

        // ✅ 關鍵點：在這裡才執行 PickTime 的範圍更新
        this.updatePickTimeRange();

      } else {
        this.endTime = this.minDate ? new Date(this.minDate) : new Date();
        this.updatePickTimeRange();
      }
    }, 200);
  }
  // --- 取貨時間相關邏輯 ---
  handlePickupOnShow() {
    if (!this.pickTime) {  // 預設取貨時間為結單時間 + 30 分鐘，給店家準備
      const defaultDate = this.endTime ? new Date(this.endTime) : new Date();
      defaultDate.setMinutes(defaultDate.getMinutes() + 30);
      defaultDate.setSeconds(0);
      defaultDate.setMilliseconds(0);
      this.pickTime = defaultDate;
    }
  }
  // onPickupTimeChange(value: Date) {
  //   if (value instanceof Date && !isNaN(value.getTime())) {
  //     // 如果取貨時間早於結單時間，可以在此 console 提示，或等 Blur 再修正
  //     if (this.endTime && value < this.endTime) {
  //       console.warn("取貨時間不應早於結單時間");
  //     }
  //   }
  // }
  handlePickupBlur() {
    // 核心：延遲執行檢查邏輯
    setTimeout(() => {
      // 檢查目前焦點是否還在 DatePicker 內部
      const activeEl = document.activeElement;
      if (activeEl?.closest('.p-datepicker')) {
        return;
      }

      if (!this.pickTime) return;

      // 將輸入轉為字串並統一清理
      let rawValue = String(this.pickTime).trim();

      // 1. 統一將 '-' 換成 '/'，並處理多餘空白
      rawValue = rawValue.replace(/-/g, '/').replace(/\s+/g, ' ');

      // 2. 【新增】處理全數字格式 (例如 20260218 1300 -> 2026/02/18 13:00)
      const allNumericRegex = /^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})$/;
      if (allNumericRegex.test(rawValue)) {
        rawValue = rawValue.replace(allNumericRegex, '$1/$2/$3 $4:$5');
      }

      // 3. 【核心修復】處理時間位數不足 (例如 14:5 -> 14:05, 8:9 -> 08:09)
      const timeParts = rawValue.match(/(\d{1,2}):(\d{1,2})$/);
      if (timeParts) {
        const hh = timeParts[1].padStart(2, '0');
        const mm = timeParts[2].padStart(2, '0');
        rawValue = rawValue.replace(/\d{1,2}:\d{1,2}$/, `${hh}:${mm}`);
      }

      // 4. 【格式修復】處理忘記打冒號的情況 (例如 2026/02/14 1405 -> 14:05)
      const noColonRegex = /(\d{4}\/\d{1,2}\/\d{1,2})\s+(\d{2})(\d{2})$/;
      if (noColonRegex.test(rawValue)) {
        rawValue = rawValue.replace(noColonRegex, '$1 $2:$3');
      }

      // 5. 嘗試解析
      let parsedDate = new Date(rawValue);

      // 6. 檢查解析結果
      if (!isNaN(parsedDate.getTime())) {
        // 取貨時間的檢查基準是 endTime
        const baseTime = this.endTime ? new Date(this.endTime) : new Date();

        const compareParsed = new Date(parsedDate).setSeconds(0, 0);
        const compareBase = new Date(baseTime).setSeconds(0, 0);

        if (compareParsed <= compareBase) {
          // 如果取貨早於或等於結單，自動修正為結單時間 + 10 分鐘
          const autoCorrect = new Date(compareBase);
          autoCorrect.setMinutes(autoCorrect.getMinutes() + 10);

          this.pickTime = autoCorrect;
          Swal.fire({
            title: "取貨時間不得早於或等於結束時間",
            text: "已將取貨時間設定為結束時間後 10 分鐘",
            icon: "warning",
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
          });
        } else {
          this.pickTime = parsedDate;
        }
      } else {
        // 7. 解析失敗，重設為結單時間 + 30 分鐘
        console.error("無法解析取貨時間格式:", rawValue);
        const fallback = this.endTime ? new Date(this.endTime) : new Date();
        fallback.setMinutes(fallback.getMinutes() + 30, 0, 0);
        this.pickTime = fallback;
      }
    }, 200);
  }


  get uniqueTabs() {
    const uniqueIds = [...new Set(this.selectedItems.map(item => item.categoryId))];
    return uniqueIds.map(catId => {
      const category = this.menuCategoriesVoList.find(cat => cat.id === catId);
      return {
        id: catId,
        categoryName: category?.name
      };
    });
  }


  checkPickupTime() {
    const finishDate = this.dateFormat(this.pickTime);
    const operatingTime: { open: string; close: string; }[] = [];
    let openCount = 0;
    for (let each of this.operatingHoursVoList) {
      if (each.week == finishDate) {
        operatingTime.push({
          open: each.openTime,
          close: each.closeTime
        });
      }
    }
    if (operatingTime.length === 0) {
      const timeInfo = '該店當日不營業，請選擇其他日期。';
      this.showAlert('您選擇的取貨時間不在店家營業時間內', timeInfo);
      return false;
    } else {
      // 取得 pickTime 的年月日，作為基準日期物件
      const year = this.pickTime.getFullYear();
      const month = this.pickTime.getMonth();
      const date = this.pickTime.getDate();
      // 目標時間的總分鐘數 (基準：1970/01/01 以來)
      const pickTimestamp = Math.floor(this.pickTime.getTime() / 60000);
      operatingTime.forEach(each => {
        // 1. 解析營業時間字串 "08:00:00" -> [8, 0, 0]
        const [openH, openM, openS] = each.open.split(':').map(Number);
        const [closeH, closeM, closeS] = each.close.split(':').map(Number);
        // 2. 將基準日期配上營業時間，建立「同一天」的 Date 物件
        const openDate = new Date(year, month, date, openH, openM, openS || 0);
        const closeDate = new Date(year, month, date, closeH, closeM, closeS || 0);
        // 3. 轉成分鐘 Timestamp
        const openTimestamp = Math.floor(openDate.getTime() / 60000);
        const closeTimestamp = Math.floor(closeDate.getTime() / 60000);
        if (openTimestamp <= closeTimestamp) {
          // 一般時段
          if (pickTimestamp >= openTimestamp && pickTimestamp <= closeTimestamp) {
            openCount++;
          }
        } else {
          // 跨夜時段
          if (pickTimestamp >= openTimestamp || pickTimestamp <= closeTimestamp) {
            openCount++;
          }
        }
      });
    }
    if (openCount == 0) {
      // 這裡同樣可以組合營業時間顯示
      const timeInfo = operatingTime.map(t => `${t.open.substring(0, 5)} ~ ${t.close.substring(0, 5)}`).join('、');
      this.showAlert('您選擇的取貨時間不在店家營業時間內', `該店當日營業時段為：${timeInfo}`);
      return false;
    } else {
      return true;
    }
  }
  goHome() {
    this.router.navigate(['/gogobuy/home']);
  }

  cancel() {
    this.location.back();
  }
  goCheck() {
    this.tempMenu = this.selectedItems.filter(item => item.id !== this.paddingItem.id).map(item => item.id);
    const missingFields: string[] = [];
    if (!this.eventName) missingFields.push('開團名稱');
    // if (!this.choice) missingFields.push('運費拆帳方式');
    // if (!this.isConfirmed) missingFields.push('同意拆帳規則');
    if (!this.tempMenu) missingFields.push('菜單品項')
    if (this.limitation && this.limitation < 1) {
      missingFields.push('成團門檻金額至少為1');
    } else if (!this.limitation) {
      missingFields.push('成團門檻金額');
    } else if (this.limitation % 1 != 0) {
      missingFields.push('請輸入新台幣整數金額(須為阿拉伯數字)');
    }
    if (!this.pickLocation) missingFields.push('取貨地點');
    if (!this.endTime) {
      missingFields.push('截止日期與時間');
    } else {
      const now = new Date();
      // 如果要排除「當下」，通常是因為 endTime 只選擇到分鐘
      // 將比對精準度設在「分鐘」
      const endTimestamp = Math.floor(this.endTime.getTime() / 60000); // 取得分鐘數
      const nowTimestamp = Math.floor(now.getTime() / 60000);
      if (endTimestamp === nowTimestamp) {
        missingFields.push('截止時間不可為當下時間');
      } else if (endTimestamp < nowTimestamp) {
        missingFields.push('截止時間已過請重新輸入');
      }
    }
    if (!this.pickTime) {
      missingFields.push('取貨時間');
    } else {
      if (this.checkPickupTime() == false) {
        return;
      }
    }
    if (missingFields.length > 0) {    // 如果有漏填，觸發 Swal 警告
      const fieldList = missingFields.join('、'); // 將陣列轉為 "欄位A、欄位B"
      this.showAlert('資料未填寫完整', `請輸入以下欄位：${fieldList}`);
      return; // 攔截，不執行後續邏輯
    }
    if (!this.userId || this.userId === 'null') {
      this.loginFirst();
      return;
    }
    // 通過檢查
    this.isPreview = true;
    const tabs = this.uniqueTabs;
    if (tabs && tabs.length > 0) {
      this.previewTab = tabs[0].id;
    }
  }

  revise() {
    this.isPreview = false;
  }
  addEvent() {
    // this.route.queryParams.subscribe(params => {  //若有wishId取來發通知
    //   if (params['wish_id']) {
    //     this.wishId = Number(params['wish_id']);
    //   }
    // });
    const missingFields: string[] = [];
    if (!this.endTime) {
      missingFields.push('截止日期與時間');
    } else {
      const now = new Date();
      // 如果要排除「當下」，通常是因為 endTime 只選擇到分鐘
      // 將比對精準度設在「分鐘」
      const endTimestamp = Math.floor(this.endTime.getTime() / 60000); // 取得分鐘數
      const pickTimestamp = Math.floor(this.pickTime.getTime() / 60000);
      const nowTimestamp = Math.floor(now.getTime() / 60000);
      if (endTimestamp === nowTimestamp) {
        missingFields.push('截止時間不可為當下時間');
        if (pickTimestamp <= nowTimestamp) {
          missingFields.push('取貨時間必須晚於結束時間');
        }
      } else if (endTimestamp < nowTimestamp) {
        missingFields.push('截止時間已過請重新輸入');
        if (pickTimestamp <= nowTimestamp) {
          missingFields.push('取貨時間必須晚於結束時間');
        }
      } else if (pickTimestamp <= endTimestamp) {
        missingFields.push('取貨時間必須晚於結束時間');
      }
    }
    if (!this.pickTime) {
      missingFields.push('取貨時間');
    } else {
      if (this.checkPickupTime() == false) {
        return;
      }
    }
    if (missingFields.length > 0) {    // Swal 警告
      const fieldList = missingFields.join('、'); // 將陣列轉為 "欄位A、欄位B"
      this.showAlert('資料未填寫完整', `請檢查以下欄位：${fieldList}`);
      return;
    }
    if (!this.userId || this.userId === 'null') {
      this.loginFirst();
      return;
    }

    const end = this.formatToFullDateTime(this.endTime);
    const pick = this.formatToFullDateTime(this.pickTime);
    const req = {
      id: 0,
      hostId: this.userId,
      storesId: this.storeId,
      eventName: this.eventName,
      endTime: end,
      status: "OPEN",
      shippingFee: this.shippingFee || 0,
      // splitType: this.splitType,
      splitType: 'EQUAL',
      announcement: this.announcement,
      type: this.type,
      tempMenuList: [...this.tempMenu],
      recommendList: [...this.recommend],
      recommendDescription: this.recommendDescription,
      totalOrderAmount: 0,
      limitation: this.limitation,
      deleted: false,
      pickupTime: pick,
      pickLocation: this.pickLocation
    }
    if (this.storeId && !this.eventId) {
      this.http.postApi('http://localhost:8080/gogobuy/event/addEvent', req).subscribe({
        next: (res: any) => {
          console.log(req);
          console.log(res);
          if (res && res.id) {
            // if (this.wishId) {  // 有許願，先結案再跳轉
            //   const finishUrl = `http://localhost:8080/gogobuy/wish/finish_wish?id=${this.wishId}&userId=${this.userId}&targetUrl=http://localhost:4200/groupbuy-event/group-follow/${res.id}`;
            //   this.http.postApi(finishUrl, {}).subscribe({
            //     next: () => this.router.navigate(['/groupbuy-event/group-follow', res.id]),
            //     error: (err) => {
            //       console.error('許願結案失敗', err);
            //     }
            //   });
            // } else {  // 沒有許願，直接跳轉
            this.router.navigate(['/groupbuy-event/group-follow', res.id]);
            // }
          } else if (res && res.code == 400) {
            const error: string[] = [];
            error.push(res.message);
            if (error.length > 0) {    // Swal 警告
              const fieldList = error.join('、'); // 將陣列轉為 "欄位A、欄位B"
              this.showAlert('新增失敗', `${fieldList}`);
            }
          }
        }
      });
    } else if (this.eventId && !this.storeId) {
      req.id = this.eventId;
      req.storesId = this.storeIdFromEvent;
      console.log(JSON.stringify(req));
      this.http.postApi('http://localhost:8080/gogobuy/event/updateEvent', req).subscribe({
        next: (res: any) => {
          console.log(req);
          console.log(res);
          if (res && res.code == 200) {
            this.router.navigate(['/groupbuy-event/group-follow', req.id]);
          } else if (res && res.code == 400) {
            const error: string[] = [];
            error.push("網站出現問題，請稍後再試");
            if (error.length > 0) {    // Swal 警告
              const fieldList = error.join('、'); // 將陣列轉為 "欄位A、欄位B"
              this.showAlert('修改失敗', `${fieldList}`);
            }
          }
        }
      });
    }
  }


  async getGeolocation() {
    const now = Date.now();
    const cooldown = 15000;
    if (now - this.positionService.lastFetchAt < cooldown && this.positionService.lastCoords) {
      this.currentLocation = this.positionService.lastCoords;
      Swal.fire({
        icon: 'info',
        title: '位置已是最新的',
        text: '請稍後再試 (冷卻時間 15s)',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }
    this.isLoadingLocation = true;
    if (this.isLoadingLocation == true) {
      this.positionSpinnerAlert();
    }
    try {
      // 取得新座標
      const newCoords = await this.positionService.getCurrentPosition();
      // 計算新舊距離差距
      if (this.currentLocation && this.currentAddress) {
        const distance = this.positionService.getDistance(
          this.currentLocation.lat, this.currentLocation.lng,
          newCoords.lat, newCoords.lng
        );
        // 如果移動距離小於 10 公尺，就不重新抓地址，避免門牌跳動
        if (distance < 10) {
          console.log(`移動距離僅 ${distance.toFixed(1)}m，忽略更新以穩定地址`);
          this.isLoadingLocation = false;
          this.positionSuccessAlert();
          return;
        }
      }
      this.currentLocation = newCoords;
      // 呼叫地址解析
      this.positionService.getAddressFromOSM(this.currentLocation.lat, this.currentLocation.lng).subscribe({
        next: (res) => {
          const addr = res.address;
          let hNum = addr.house_number || '';
          if (hNum && !hNum.includes('號')) hNum += '號';
          const addressParts = [
            addr.city || addr.town || addr.county || '',
            addr.suburb || addr.district || addr.village || '',
            addr.road || addr.pedestrian || '',
            hNum
          ];
          this.currentAddress = addressParts.filter(part => !!part).join('');
          if (this.currentAddress.length < 5) {
            this.currentAddress = res.display_name;
          }
          this.pickLocation = this.currentAddress;
          this.positionSuccessAlert();
        },
        error: (err) => {
          console.error('解析失敗', err);
          this.currentAddress = '無法解析詳細地址';
        }
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: '定位失敗',
        text: '請確認瀏覽器定位權限'
      });
    } finally {
      this.isLoadingLocation = false;
    }
  }
  @ViewChild('op') op!: Popover;
  selectedLat: number = 22.997; // 預設台南座標
  selectedLng: number = 120.211;
  // Leaflet 實例
  map!: L.Map;
  marker!: L.Marker;
  /**
   * 💡 當 Popover 顯示時初始化地圖
   * 必須在 Popover 顯示後才 init，否則地圖容器寬高為 0 會導致破圖
   */
  onMapShow() {
    if (this.currentLocation) {
      this.selectedLat = this.currentLocation.lat;
      this.selectedLng = this.currentLocation.lng;
    }
    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => {
        if (this.map) {
          // 解決 RWD 寬度變動後地圖顯示異常
          this.map.invalidateSize();
        } else {
          this.initMap();
        }
      });
    }, 300); // 延遲時間避開動畫
  }
  private initMap() {
    // 1. 初始化地圖中心
    this.map = L.map('map').setView([this.selectedLat, this.selectedLng], 16);
    // 2. 載入 OpenStreetMap 圖資
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    // 3. 建立可拖拽的標記
    this.marker = L.marker([this.selectedLat, this.selectedLng], {
      draggable: true
    }).addTo(this.map);
    // 4. 監聽標記拖拽結束
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.updateLocation(pos.lat, pos.lng);
    });
    // 5. 監聽地圖點擊
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.updateLocation(e.latlng.lat, e.latlng.lng);
    });
    console.log('Map Container:', document.getElementById('map'));
  }

  /**
   * 搜尋地點功能 (連動 OpenStreetMap API)
   */
  searchLocation(event: any) {
    const query = event.target.value;
    if (!query) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          this.ngZone.run(() => {
            this.map.setView([lat, lon], 16);
            this.marker.setLatLng([lat, lon]);
            this.updateLocation(lat, lon);
          });
        }
      });
  }
  /**
   * 更新經緯度並反查地址
   */
  private updateLocation(lat: number, lng: number) {
    this.selectedLat = lat;
    this.selectedLng = lng;
    // 反查地址 API
    // fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    //   .then(res => res.json())
    //   .then(data => {
    //     this.ngZone.run(() => {
    //       this.pickLocation = data.display_name;
    //       console.log(data);
    //     });
    //   });
    this.positionService.getAddressFromOSM(lat, lng).subscribe({
      next: (res) => {
        console.log(res);
        if (res.name.length > 0) {
          this.pickLocation = res.name;
        } else {
          const addr = res.address;
          let hNum = addr.house_number || '';
          if (hNum && !hNum.includes('號')) hNum += '號';
          const addressParts = [
            addr.city || addr.town || addr.county || '',
            addr.suburb || addr.district || addr.village || '',
            addr.road || addr.pedestrian || '',
            hNum
          ];
          this.currentAddress = addressParts.filter(part => !!part).join('');
          if (this.currentAddress.length < 5) {
            this.currentAddress = res.display_name;
          }
          this.pickLocation = this.currentAddress;
        }
      },
      error: (err) => {
        console.error('解析失敗', err);
        this.currentAddress = '無法解析詳細地址';
      }
    });
  }

  /**
   * 確認選取，可整合進你的後端 API 串接分工 [cite: 2026-02-12]
   */
  confirmLocation() {
    console.log('最終選定位置:', this.pickLocation, { lat: this.selectedLat, lng: this.selectedLng });
    // 這裡可以呼叫 SweetAlert2 提示 [cite: 2026-02-12]
  }
}
