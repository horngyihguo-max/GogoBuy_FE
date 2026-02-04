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


@Component({
  selector: 'app-group-event',
  imports: [
    CommonModule, Dialog, PickListModule, DragDropModule,
    InputGroupModule, InputGroupAddonModule, InputNumberModule, FloatLabelModule,
    FormsModule, DatePickerModule
],
  templateUrl: './group-event.component.html',
  styleUrl: './group-event.component.scss'
})
export class GroupEventComponent {
  constructor(
    private auth:AuthService,
    private http:HttpService,
    private router:Router,
    private route:ActivatedRoute,
    private primeng: PrimeNG
  ){};

  storeList:Stores | null=null;
  operatingHoursVoList:OperatingHoursVoList[]=[];
  menuVoList:MenuVoList[]=[];
  menuCategoriesVoList:MenuCategoriesVoList[]=[];
  productOptionGroupsVoList:ProductOptionGroupsVoList[]=[];
  feeDescriptionVoList:FeeDescriptionVoList[]=[];

  eventName!:string;
  endTime!:Date;
  announcement!:string;
  type!:string;
  tempMenu:number[]=[];  //存品項id
  recommend:number[]=[];  //存推薦id
  recommendDescription!:string;
  limitation!:number;

  userId!:string;
  storeId!:number;
  isOpen!:boolean;
  operateString!:string;
  nextOperating!:string;
  isPreview!:boolean;
  useAll!:boolean;
  minDate: Date = new Date();
  ngOnInit(): void {
    this.isPreview=false;
    this.useAll=false;
    this.minDate = new Date();
    // 設定中文語系
    this.primeng.setTranslation({
      dayNames: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
      dayNamesShort: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
      dayNamesMin: ["日", "一", "二", "三", "四", "五", "六"],
      monthNames: ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],
      monthNamesShort: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"],
      today: '今天',
      clear: '清除',
      dateFormat: 'yy/mm/dd',
      weekHeader: '週'
    });

    const now = new Date();
    const dateString=now.toString();
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
    const time=now.getHours()*100+now.getMinutes();

    this.userId=String(localStorage.getItem('user_id'));
    this.storeId=Number(this.route.snapshot.paramMap.get('id'));
    this.http.getApi('http://localhost:8080/gogobuy/store/searchId?id='+this.storeId).subscribe((res:any)=>{
      // 1. 先判斷 res 是否存在且 storeList 有資料
      if (!res || !res.storeList || res.storeList.length === 0) {
        console.error('找不到店家資料或 API 異常');
        return;
      }
      this.storeList = res.storeList[0];
      if (this.storeList) {
        this.type=this.storeList.type;
      }
      this.menuVoList = res.menuVoList || [];
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
      this.productOptionGroupsVoList=res.productOptionGroupsVoList;
      this.feeDescriptionVoList=res.FeeDescription;

      this.operatingHoursVoList=res.operatingHoursVoList.sort((a:any, b:any) => a.openTime.localeCompare(b.openTime));  // 排序 (字串比較)
      const todayList=this.operatingHoursVoList
        .filter(each=>each.week==today)
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
  choose(choice:string){
    if(choice=="EQUAL"){
      this.choice="平分制";
    }else{
      this.choice="權重制";
    }
    this.splitOpen=false;
  }
  close(){
    this.splitOpen=false;
  }
  openDialog:boolean=false;
  dialog(){
    this.openDialog=true;
  }
  isConfirmed!:boolean;
  onCheckChange(event: any) {
    this.isConfirmed = event.target.checked;
  }


  useAllChange(event:any){
    this.useAll=event.target.checked;
    if(this.useAll){
      this.selectedItems=this.menuVoList;
      this.updateDisplaySource();
    }else{
      this.selectedItems=[this.paddingItem];
      this.updateDisplaySource();
    }
  }
  displaySource: any[] = [];  // 給 PickList 顯示用的實體陣列
  paddingItem = { id: 'BOTTOM_PADDING', isPadding: true };
  selectedItems: any[] = [this.paddingItem];  // 目標清單
  // 監控 Tab 切換 (假設你在 p-tabs 綁定了 (valueChange) 或透過 activeTab 的 setter)
  private _activeTab: any;
  get activeTab() { return this._activeTab; }
  set activeTab(val: any) {
    this._activeTab = val;
    this.updateDisplaySource(); // 每次切換 Tab 就更新一次
  }
  // 更新顯示清單的方法
  updateDisplaySource() {
    this.displaySource = this.menuVoList.filter(item =>
      item.categoryId == this._activeTab &&
      !this.selectedItems.some(s => s.id === item.id)
    );
  }
  // 選中
  onMoveToTarget(event: any) {
    this.fixPaddingPosition();
  }
  // 取消選中 (從 Target 搬回 Source)
  onMoveToSource(event: any) {
    const movedItems = event.items;
    movedItems.forEach((item: any) => {
      this.recommend = this.recommend.filter(id => id !== item.id);
    });
    this.useAll=false;
    this.fixTabAndRecommend(event);
    this.fixPaddingPosition();
  }
  isItemInTarget(product: any): boolean {    // 檢查這個項目是否在已選清單中
    return this.selectedItems.some(item => item.id === product.id);
  }
  onMoveAllToSource(event: any) {
    this.recommend=[];
    this.useAll=false;
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
    }, 50);
  }
  private fixTabAndRecommend(event:any){
    if(event && event.items && Array.isArray(event.items)){
      const movedItems = event.items.filter((item: any) => !item.isPadding);
      movedItems.forEach((item:any) => item.isRecommended=false);
      const tabSet = new Set(movedItems.map((item: any) => item.categoryId));
      if(tabSet.size==1){
        // 從 Set 中取出第一個（也是唯一一個）值
        const singleCategoryId = tabSet.values().next().value;
        // 確保不把 paddingItem 的 ID 誤存進去 (墊片沒有 categoryId)
        if (singleCategoryId !== undefined) {
          this.activeTab = singleCategoryId;
        }
      }else{
        this.activeTab=this.menuCategoriesVoList[0].id;
      }
    }else if(event && event.categoryId){
      this.activeTab=event.categoryId;
      event.isRecommended=false;
    }
  }
  getPaddingHeight() {
    const containerHeight = 18; // 總高度 18rem
    const itemCount = this.selectedItems.filter(i => !i.isPadding).length;
    const occupiedHeight = itemCount * 3.5;    // 假設一個項目加上間距大約佔 3.5rem
    const remaining = containerHeight - occupiedHeight;
    return `${Math.max(remaining, 3)}rem`;  // 最小高度設為 3rem
  }
  removeItem(product: any, event: MouseEvent) {
    // 阻止事件冒泡，防止觸發 PickList 的選取效果
    event.stopPropagation();
    // 將項目從已選清單移除
    this.selectedItems = this.selectedItems.filter(item => item.id != product.id);
    this.recommend=this.recommend.filter(id => id != product.id);
    // 將項目加回來源清單 (如果不在裡面的話)
    if (!this.displaySource.find(item => item.id === product.id)) {
        this.displaySource = [...this.displaySource, product];
    }
    this.useAll=false;
    this.fixTabAndRecommend(product);
    this.fixPaddingPosition();
    this.updateDisplaySource();
  }
  toggleRecommend(product: any, event: MouseEvent) {
    // 阻止事件冒泡，避免觸發 PickList 的選取/拖拽動作
    event.stopPropagation();
    // 切換選中狀態
    product.isRecommended = !product.isRecommended;
    if (product.isRecommended==true) {
      this.recommend.push(product.id);
    }else{
      this.recommend = this.recommend.filter(id => id != product.id);
    }
  }


  // 當時間改變時觸發
  onTimeChange(selectedDate: Date) {
    const now = new Date();

    // 如果選中的時間點小於當前時間
    if (selectedDate && selectedDate < now) {
      // 強制重設為「現在」
      this.endTime = new Date();

      // 選用：彈出警告告知使用者
      // this.showAlert('無效時間', '結束時間不能設定在過去！');
    }
  }


  saveData() {
    if (this.recommendDescription && this.recommendDescription.length > 200) {
      // 雖然有 maxlength，但保險起見還是可以做一次裁切
      this.recommendDescription = this.recommendDescription.substring(0, 200);
    }
  }
  goHome(){
    this.router.navigate(['/gogobuy/home']);
  }
  cancel(){

  }
  goCheck(){
    this.tempMenu=[...this.selectedItems];
    const missingFields: string[] = [];
    if (!this.eventName) missingFields.push('開團名稱');
    if (!this.choice) missingFields.push('運費拆帳方式');
    if (!this.isConfirmed) missingFields.push('同意拆帳規則');
    if (!this.tempMenu) missingFields.push('菜單品項')
    if(this.limitation && this.limitation<1){
      missingFields.push('成團門檻金額至少為1');
    }else if(!this.limitation){
      missingFields.push('成團門檻金額');
    }
    if (!this.endTime) missingFields.push('截止日期與時間');
    const now=new Date();
    if (this.endTime.getTime()<now.getTime()){
      missingFields.push('截止時間已過請重新輸入');
    }

    if (missingFields.length > 0) {    // 如果有漏填，觸發 Swal 警告
      const fieldList = missingFields.join('、'); // 將陣列轉為 "欄位A、欄位B"
      this.showAlert('資料未填寫完整', `請輸入以下欄位：${fieldList}`);
      return; // 攔截，不執行後續邏輯
    }

    // 通過檢查
    this.isPreview=true;
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
}
