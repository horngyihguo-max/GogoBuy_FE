import { FeeDescriptionVoList, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, Stores } from './../../@service/store.service';
import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Dialog } from "primeng/dialog";
import { TabsModule } from 'primeng/tabs';
import { PickListModule } from 'primeng/picklist';
import { DragDropModule } from '@angular/cdk/drag-drop';



@Component({
  selector: 'app-group-event',
  imports: [
    CommonModule, Dialog, TabsModule,
    PickListModule, DragDropModule
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
  ){};

  storeList:Stores | null=null;
  operatingHoursVoList:OperatingHoursVoList[]=[];
  menuVoList:MenuVoList[]=[];
  menuCategoriesVoList:MenuCategoriesVoList[]=[];
  productOptionGroupsVoList:ProductOptionGroupsVoList[]=[];
  feeDescriptionVoList:FeeDescriptionVoList[]=[];

  userId!:string;
  storeId!:number;
  isOpen!:boolean;
  operateString!:string;
  nextOperating!:string;
  ngOnInit(): void {
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
      this.storeList=res.storeList[0];
      this.storeList!.image = "https://picsum.photos/240/160?random=16";
      this.menuVoList=res.menuVoList;
      this.menuCategoriesVoList=res.menuCategoriesVoList;
      if (this.menuCategoriesVoList.length > 0) {
        this.activeTab = this.menuCategoriesVoList[0].id;
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

  open = false;
  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.open = !this.open;
  }
  choice!: string;
  choose(choice:string){
    if(choice=="EQUAL"){
      this.choice="平分制";
    }else{
      this.choice="權重制";
    }
    this.open=false;
  }
  close(){
    this.open=false;
  }

  openDialog:boolean=false;
  dialog(){
    this.openDialog=true;
  }
  isConfirmed!:boolean;
  onCheckChange(event: any) {
    this.isConfirmed = event.target.checked;
    console.log('當前勾選狀態:', this.isConfirmed);

    if (this.isConfirmed) {
      // 這裡可以寫：當勾選後要做的事
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
    this.fixPaddingPosition();
  }
  isItemInTarget(product: any): boolean {    // 檢查這個項目是否在已選清單中
    return this.selectedItems.some(item => item.id === product.id);
  }
  onMoveAllToSource(event: any) {
    this.fixPaddingPosition();
  }
  onMoveAllToTarget(event: any) {
    this.fixPaddingPosition();
  }
  private fixPaddingPosition() {
    // 給 PrimeNG 內建邏輯 50ms 的緩衝，確保它跑完
    setTimeout(() => {
      // 1. 抓出目前兩個清單中「真正」的產品 (排除墊片)
      const allProductsInSource = this.displaySource.filter(item => !item.isPadding);
      const allProductsInTarget = this.selectedItems.filter(item => !item.isPadding);

      // 2. 校正來源區：絕對不能有墊片
      this.displaySource = [...allProductsInSource];

      // 3. 校正目標區：[真正的產品] + [墊片永遠在最後]
      // 使用新物件解構，確保觸發 Angular 的渲染更新
      this.selectedItems = [...allProductsInTarget, { ...this.paddingItem }];
      this.updateDisplaySource();
    }, 50);
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

    // 1. 將項目從已選清單移除
    this.selectedItems = this.selectedItems.filter(item => item.id !== product.id);

    // 2. 將項目加回來源清單 (如果不在裡面的話)
    if (!this.displaySource.find(item => item.id === product.id)) {
        this.displaySource = [...this.displaySource, product];
    }

    // 3. 執行你寫好的校正與滾動邏輯
    this.fixPaddingPosition();
    this.updateDisplaySource();
}

  goTo(){
    this.router.navigate(['/gogobuy/home']);
  }
}
