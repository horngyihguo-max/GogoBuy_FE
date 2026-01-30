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
  selectedItems: any[] = [];  // 目標清單
  // 監控 Tab 切換 (假設你在 p-tabs 綁定了 (valueChange) 或透過 activeTab 的 setter)
  private _activeTab: any;
  get activeTab() { return this._activeTab; }
  set activeTab(val: any) {
    this._activeTab = val;
    this.updateDisplaySource(); // 每次切換 Tab 就更新一次
  }
  // 更新顯示清單的方法
  updateDisplaySource() {
    // 關鍵：從總清單過濾，且要排除已經在「已選擇」裡面的東西
    this.displaySource = this.menuVoList.filter(item =>
        item.categoryId == this._activeTab &&
        !this.selectedItems.some(s => s.id === item.id)
    );
  }
  // 選中
  onMoveToTarget(event: any) {
      // PrimeNG 會自動更新 target 陣列的內容，但我們需要確保 Reference 更新
      this.selectedItems = [...this.selectedItems];
      this.updateDisplaySource();
  }

  // 取消選中
  onMoveToSource(event: any) {
      this.selectedItems = [...this.selectedItems];
      this.updateDisplaySource();
  }

  goTo(){
    this.router.navigate(['/gogobuy/home']);
  }
}
