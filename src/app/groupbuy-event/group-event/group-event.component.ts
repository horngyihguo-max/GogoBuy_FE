import { filter } from 'rxjs/operators';
import { FeeDescriptionVoList, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, PriceLevel, ProductOptionGroupsVoList, Stores } from './../../@service/store.service';
import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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



@Component({
  template: `
    <div
      class="
        card
      "
    >
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
                  <p
                    class="
                      m-0
                    "
                  >{{ tab.content }}</p>
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
    FormsModule, DatePickerModule, TabsModule
  ],
  templateUrl: './group-event.component.html',
  styleUrl: './group-event.component.scss'
})
export class GroupEventComponent {
  constructor(
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private primeng: PrimeNG
  ) { };

  storeList: Stores | null = null;
  operatingHoursVoList: OperatingHoursVoList[] = [];
  menuVoList: MenuVoList[] = [];
  menuCategoriesVoList: MenuCategoriesVoList[] = [];
  productOptionGroupsVoList: ProductOptionGroupsVoList[] = [];
  feeDescriptionVoList: FeeDescriptionVoList[] = [];

  eventName!:string;
  endTime:Date | null = null;
  splitType!:string;
  announcement!:string;
  type!:string;
  tempMenu:number[]=[];  //存品項id
  recommend:number[]=[];  //存推薦id
  recommendDescription!:string;
  limitation!:number;
  pickTime!:Date;
  pickLocation!:string;

  userId!: string;
  storeId!: number;
  wishId?: number;
  isOpen!: boolean;
  operateString!: string;
  nextOperating!: string;
  isPreview!: boolean;
  useAll!: boolean;
  minDate: Date = new Date();
  previewTab!: number;
  ngOnInit(): void {
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

    const now = new Date();
    const dateString = now.toString();
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
    const today = weekMap[weekday];
    const time = now.getHours() * 100 + now.getMinutes();

    this.userId = String(localStorage.getItem('user_id'));
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    this.http.getApi('http://localhost:8080/gogobuy/store/searchId?id=' + this.storeId).subscribe((res: any) => {
      // 1. 先判斷 res 是否存在且 storeList 有資料
      if (!res || !res.storeList || res.storeList.length === 0) {
        console.error('找不到店家資料或 API 異常');
        return;
      }
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
      if (todayList.length > 0) {
        for (let i = 0; i < todayList.length; i++) {
          const open = (+todayList[i].openTime.split(":")[0]) * 100 + (+todayList[i].openTime.split(":")[1]);
          const close = (+todayList[i].closeTime.split(":")[0]) * 100 + (+todayList[i].closeTime.split(":")[1]);
          // --- 營業中 ---
          if (time >= open && time <= close) {
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
          if (time < open) {
            this.isOpen = false;
            this.operateString = "休息中";
            this.nextOperating = "下次開始營業時間為 " + todayList[i].openTime.slice(0, 5);
            return; // 找到最近的開門時間，跳出
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

    });

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
  choice!: string;
  choose(choice: string) {
    if (choice == "EQUAL") {
      this.choice = "平分制";
      this.splitType = "EQUAL";
    } else {
      this.choice = "權重制";
      this.splitType = "WEIGHT";
    }
    this.splitOpen = false;
  }
  close() {
    this.splitOpen = false;
  }
  openDialog: boolean = false;
  dialog() {
    this.openDialog = true;
  }
  isConfirmed!: boolean;
  onCheckChange(event: any) {
    this.isConfirmed = event.target.checked;
  }


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
  // 給 PickList 顯示用的實體陣列
  paddingItem = { id: 'BOTTOM_PADDING', isPadding: true };
  displaySource: any[] = [this.paddingItem];  // 目標清單
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
  }
  onMoveToTarget(event: any) {  // 選中
    this.fixPaddingPosition();
  }
  onMoveToSource(event: any) {  // 取消選中 (從 Target 搬回 Source)
    console.log(event.items);
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
      // 抓出目前兩個清單中「真正」的產品 (排除墊片)
      const allProductsInSource = this.displaySource.filter(item => !item.isPadding);
      const allProductsInTarget = this.selectedItems.filter(item => !item.isPadding);

      // 校正來源區(不能有墊片)
      this.displaySource = [...allProductsInSource];

      // 校正目標區：[真正的產品] + [墊片永遠在最後]
      // 使用新物件解構，確保觸發 Angular 的渲染更新
      this.selectedItems = [...allProductsInTarget, { ...this.paddingItem }];
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


  handleOnShow() {
    if (!this.endTime) {
      const nextMinute = new Date();
      nextMinute.setMinutes(nextMinute.getMinutes() + 1);
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
  handleBlur() {  // 新增一個 blur 處理，當使用者打完字離開時才校正
    if (!this.endTime) return;
    let rawValue = String(this.endTime).trim();
    let parsedDate: Date;
    // 1. 【格式修復】處理忘記打冒號的情況 (例如: 2026/2/10 1000 -> 2026/2/10 10:00)
    // 匹配結尾是「空格+4位數字」的情況
    const timeFixRegex = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(\d{2})(\d{2})$/;
    if (timeFixRegex.test(rawValue)) {
      rawValue = rawValue.replace(timeFixRegex, '$1 $2:$3');
    }
    parsedDate = new Date(rawValue.replace(/-/g, '/'));    // 2. 嘗試解析
    if (!isNaN(parsedDate.getTime())) {    // 3. 檢查解析結果
      const now = new Date();
      if (parsedDate < now) {      // 如果輸入的時間比現在早，修正為「現在 + 1分鐘」
        const nextMinute = new Date();
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        nextMinute.setSeconds(0);
        nextMinute.setMilliseconds(0);
        this.endTime = nextMinute;
        Swal.fire({
          title: "結束時間不得早於或等於當下時間",
          text: "已將結束時間設定為當下時間後1分鐘",
          icon: "warning",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        this.endTime = parsedDate;        // 解析成功，更新回標準 Date 物件，PrimeNG 就會自動整理格式
      }
    } else {
      // 4. 如果還是解析失敗 (例如只打 2026210)
      console.error("無法解析的時間格式:", rawValue);
      // 可以選擇恢復成 minDate
      this.endTime = new Date(this.minDate);
    }
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
    if (!this.pickTime) return;
    let rawValue = String(this.pickTime).trim();
    let parsedDate: Date;
    // 1. 格式修復 (補冒號)
    const timeFixRegex = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(\d{2})(\d{2})$/;
    if (timeFixRegex.test(rawValue)) {
      rawValue = rawValue.replace(timeFixRegex, '$1 $2:$3');
    }
    // 2. 嘗試解析
    parsedDate = new Date(rawValue.replace(/-/g, '/'));
    // 3. 檢查解析結果
    if (!isNaN(parsedDate.getTime())) {
      // 取貨時間的檢查基準是 endTime
      const baseTime = this.endTime ? new Date(this.endTime) : new Date();
      if (parsedDate <= baseTime) {
        // 如果取貨早於結單，自動修正為結單時間 + 10 分鐘
        const autoCorrect = new Date(baseTime);
        autoCorrect.setMinutes(autoCorrect.getMinutes() + 10);
        this.pickTime = autoCorrect;
        Swal.fire({
          title: "取貨時間不得早於或等於結束時間",
          text: "已將取貨時間設定為結束時間後10分鐘",
          icon: "warning",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      } else {
        this.pickTime = parsedDate;
      }
    } else {
      // 解析失敗，重設為結單時間 + 30 分鐘
      const fallback = this.endTime ? new Date(this.endTime) : new Date();
      fallback.setMinutes(fallback.getMinutes() + 30);
      this.pickTime = fallback;
    }
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


  goHome() {
    this.router.navigate(['/gogobuy/home']);
  }
  cancel() {
    this.router.navigate(['/management/store_info', this.storeId]);
  }
  goCheck() {
    this.tempMenu = this.selectedItems.filter(item => item.id !== this.paddingItem.id).map(item => item.id);
    const missingFields: string[] = [];
    if (!this.eventName) missingFields.push('開團名稱');
    if (!this.choice) missingFields.push('運費拆帳方式');
    if (!this.isConfirmed) missingFields.push('同意拆帳規則');
    if (!this.tempMenu) missingFields.push('菜單品項')
    if (this.limitation && this.limitation < 1) {
      missingFields.push('成團門檻金額至少為1');
    } else if (!this.limitation) {
      missingFields.push('成團門檻金額');
    } else if (this.limitation % 1 != 0) {
      missingFields.push('請輸入新台幣整數金額(須為阿拉伯數字)');
    }
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
    if (missingFields.length > 0) {    // 如果有漏填，觸發 Swal 警告
      const fieldList = missingFields.join('、'); // 將陣列轉為 "欄位A、欄位B"
      this.showAlert('資料未填寫完整', `請輸入以下欄位：${fieldList}`);
      return; // 攔截，不執行後續邏輯
    }
    // 通過檢查
    this.isPreview = true;
    const tabs = this.uniqueTabs;
    if (tabs && tabs.length > 0) {
      this.previewTab = tabs[0].id;
    }
  }
  showAlert(title: string, text: string) {
    Swal.fire({
      icon: 'warning',
      title: title,
      text: text,
      confirmButtonColor: '#7F1D1D',
      confirmButtonText: '我知道了',
      didOpen: () => {
        const c = document.querySelector('.swal2-container') as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }

  revise() {
    this.isPreview = false;
  }
  addEvent() {
    this.route.queryParams.subscribe(params => {  //若有wishId取來發通知
      if (params['wish_id']) {
        this.wishId = Number(params['wish_id']);
      }
    });
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
    if (missingFields.length > 0) {    // Swal 警告
      const fieldList = missingFields.join('、'); // 將陣列轉為 "欄位A、欄位B"
      this.showAlert('資料未填寫完整', `請檢查以下欄位：${fieldList}`);
      return; // 攔截，不執行後續邏輯
    }
    const end=this.formatToFullDateTime(this.endTime);
    const pick=this.formatToFullDateTime(this.pickTime);
    const req={
      id:0,
      hostId:this.userId,
      storesId:this.storeId,
      eventName:this.eventName,
      endTime:end,
      status: "OPEN",
      shippingFee: 0,
      splitType: this.splitType,
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
    this.http.postApi('http://localhost:8080/gogobuy/event/addEvent', req).subscribe({
      next: (res: any) => {
        console.log(req);
        console.log(res);
        if (res && res.id) {
          if (this.wishId) {  // 有許願，先結案再跳轉
            const finishUrl = `http://localhost:8080/gogobuy/wish/finish_wish?id=${this.wishId}&userId=${this.userId}&targetUrl=http://localhost:4200/groupbuy-event/group-follow/${res.id}`;
            this.http.postApi(finishUrl, {}).subscribe({
              next: () => this.router.navigate(['/groupbuy-event/group-follow', res.id]),
              error: (err) => {
                console.error('許願結案失敗', err);
              }
            });
          } else {  // 沒有許願，直接跳轉
            this.router.navigate(['/groupbuy-event/group-follow', res.id]);
          }
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
  }
  formatToFullDateTime(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}:00`;
  }
}
