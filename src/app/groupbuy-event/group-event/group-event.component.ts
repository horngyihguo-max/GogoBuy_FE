import { FeeDescriptionVoList, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, Stores } from './../../@service/store.service';
import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-group-event',
  imports: [ CommonModule ],
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
    //營業測試
    const mockOperatingHours: OperatingHoursVoList[] = [
      // 週一：凌晨場 + 晚場 (中間休息很久)
      { week: 1, openTime: "00:00", closeTime: "04:00" },
      { week: 1, openTime: "20:00", closeTime: "23:59" },

      // 週二：24小時營業 (測試 00:00 到 23:59)
      { week: 2, openTime: "00:00", closeTime: "23:59" },

      // 週三：公休 (不放資料)

      // 週四：多段式「極短」營業 (測試你的排序和間隔)
      { week: 4, openTime: "10:00", closeTime: "10:15" },
      { week: 4, openTime: "12:00", closeTime: "12:15" },
      { week: 4, openTime: "14:00", closeTime: "14:15" },

      // 週五：公休 (不放資料)

      // 週六：早午餐
      { week: 6, openTime: "09:00", closeTime: "15:00" },

      // 週日：跨日凌晨 (很多酒吧或KTV的模式，00:00開門)
      { week: 7, openTime: "00:00", closeTime: "06:00" }
    ];


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
      // 假資料帶入
      res.operatingHoursVoList=mockOperatingHours;
      this.operatingHoursVoList=res.operatingHoursVoList.sort((a:any, b:any) => a.openTime.localeCompare(b.openTime));  // 排序 (字串比較)
      const todayList=this.operatingHoursVoList
        .filter(each=>each.week==today)
        .sort((a, b) => a.openTime.localeCompare(b.openTime));  // 排序 (字串比較)

      if (todayList.length > 0) {
        for (let i = 0; i < todayList.length; i++) {
          const open = (+todayList[i].openTime.split(":")[0]) * 100 + (+todayList[i].openTime.split(":")[1]);
          const close = (+todayList[i].closeTime.split(":")[0]) * 100 + (+todayList[i].closeTime.split(":")[1]);

          // --- 營業中 ---
          if (time >= open && time <= close) {
            this.isOpen = true;
            this.operateString = "營業至 " + todayList[i].closeTime;

            if ((i + 1) < todayList.length) {
              this.nextOperating = "下次開始營業時間為 " + todayList[i + 1].openTime;
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
            this.nextOperating = "下次開始營業時間為 " + todayList[i].openTime;
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


      this.menuVoList=res.menuVoList;
      this.menuCategoriesVoList=res.menuCategoriesVoList;
      this.productOptionGroupsVoList=res.productOptionGroupsVoList;
      this.feeDescriptionVoList=res.FeeDescription;
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
        return `下次開始營業時間為 ${dayLabel} ${nextList[0].openTime}`;
      }
    }

    // 繞了一圈 7 天都沒資料
    return "近期無營業時段";
  }

  goTo(){
    this.router.navigate(['/gogobuy/home']);
  }
}
