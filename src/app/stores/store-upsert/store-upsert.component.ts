import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputNumber, InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, StoreService } from '../../@service/store.service';
import { DialogModule } from 'primeng/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpService } from '../../@service/http.service';

@Component({
  selector: 'app-store-upsert',
  imports: [
    InputGroupModule, InputGroupAddonModule,
    InputNumberModule, FormsModule,
    InputTextModule, DatePickerModule,
    SelectModule, FloatLabelModule,
    DatePickerModule, FormsModule, FluidModule,
    FormsModule, CheckboxModule, InputNumber,
    DialogModule,
  ],
  templateUrl: './store-upsert.component.html',
  styleUrl: './store-upsert.component.scss'
})
export class StoreUpsertComponent {

  constructor(
    private storeService: StoreService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpService,
  ) { }

  id!: number;
  displayAlertDialog: boolean = false;
  alertMessage!: string;
  selectCategory!: string;

  // 暫存輸入時間
  timeSlots: TimeSlotUI[] = [
    { selectedWeeks: [], openTime: null, closeTime: null }
  ];

  category: Category[] = [
    { name: '團購代購', value: 'slow' },
    { name: '外送', value: 'fast' },
  ];

  weeks: any[] = [
    { name: '星期一', key: 1 },
    { name: '星期二', key: 2 },
    { name: '星期三', key: 3 },
    { name: '星期四', key: 4 },
    { name: '星期五', key: 5 },
    { name: '星期六', key: 6 },
    { name: '星期日', key: 7 },
  ];

  // 店家的類型 type
  groupedType = [
    {
      label: '1. 熟食餐點',
      items: [
        { label: '異國料理', value: '異國料理' },
        { label: '在地小吃', value: '在地小吃' },
        { label: '健康舒食', value: '健康舒食' },
        { label: '素食料理', value: '素食料理' },
        { label: '宵夜點心', value: '宵夜點心' },
        { label: '便當', value: '便當' }
      ]
    },
    {
      label: '2. 飲品與甜點',
      items: [
        { label: '手搖飲', value: '手搖飲' },
        { label: '咖啡下午茶', value: '咖啡下午茶' },
        { label: '冰品', value: '冰品' }
      ]
    },
    {
      label: '3. 即時生活用品',
      items: [
        { label: '生鮮雜貨', value: '生鮮雜貨' },
        { label: '藥妝雜貨', value: '藥妝雜貨' },
        { label: '生活用品', value: '生活用品' }
      ]
    },
    {
      label: '4. 冷凍與加工食品',
      items: [
        { label: '冷凍庫存', value: '冷凍庫存' },
        { label: '生鮮直送', value: '生鮮直送' },
        { label: '零嘴點心', value: '零嘴點心' }
      ]
    },
    {
      label: '5. 家居與生活用品',
      items: [
        { label: '廚房用具', value: '廚房用具' },
        { label: '清潔用品', value: '清潔用品' },
        { label: '收納神器', value: '收納神器' }
      ]
    },
    {
      label: '6. 美妝與服飾配件',
      items: [
        { label: '服飾', value: '服飾' },
        { label: '鞋包配件', value: '鞋包配件' },
        { label: '保養護理', value: '保養護理' }
      ]
    },
    {
      label: '7. 母嬰與寵物用品',
      items: [
        { label: '母嬰用品', value: '母嬰用品' },
        { label: '寵物專區', value: '寵物專區' }
      ]
    },
    {
      label: '8. 運動與休閒娛樂',
      items: [
        { label: '運動器材', value: '運動器材' },
        { label: '戶外露營', value: '戶外露營' },
        { label: '文具辦公', value: '文具辦公' }
      ]
    }
  ];

  // 送 service 店家資訊
  storeData = {
    id: 0,
    name: '',
    phone: '',
    address: '',
    type: '',
    memo: '',
    isPublic: false,
    category: '',
    image: '' as any,
    createdBy: 'A01',
    operatingHoursVoList: [
      {
        week: [null as number | null],
        openTime: '',
        closeTime: ''
      },
    ],
    feeDescription: [] as FeeDescription[],
    menuVoList: [] as MenuVoList[],
    menuCategoriesVoList: [] as MenuCategoriesVoList[],
    productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
  }

  // session ---------------------------------------------------------
  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this.saveData(); // 在頁面消失前最後一刻存檔
  }

  saveData() {
    sessionStorage.setItem('temp_order_info', JSON.stringify(this.storeData));
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    if (this.id !== 0) {
      this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${this.id}`)
        .subscribe((res: any) => {
          if (res.storeList && res.storeList.length > 0) {
            this.storeData = { ...res.storeList[0] };
            if (typeof this.storeData.feeDescription === 'string') {
              this.storeData.feeDescription = JSON.parse(this.storeData.feeDescription);
            }

            this.convertVoToTimeSlots(res.operatingHoursVoList || []);
            console.log("this.storeData:", this.storeData);

          }
        });
    } else if (this.storeService.storeData && this.storeService.storeData.name !== '') {
      const source = this.storeService.storeData;
      this.storeData = {
        ...this.storeData,
        ...source,
        memo: source.memo ?? '',
        image: source.image ?? null,
        feeDescription: source.feeDescription ?? []
      } as any;
      this.convertVoToTimeSlots(source.operatingHoursVoList || []);
    } else {
      this.addTimeSlot();
    }

    // session 讀取資料
    const savedData = sessionStorage.getItem('temp_order_info');
    if (savedData) {
      this.storeData = JSON.parse(savedData);
    }
  }

  // 從 service 拿到的資料 ( 新增店家又回來修改店家資訊 )
  loadFromService() {
    const sourceData = this.storeService.storeData;
    if (!sourceData) return;

    this.storeData = { ...this.storeData, ...sourceData } as any;

    if (sourceData.operatingHoursVoList) {
      this.convertVoToTimeSlots(sourceData.operatingHoursVoList);
    }
  }

  // 時間轉換 從 {weel:1}{week:2} 變成 week:[1,2]
  private convertVoToTimeSlots(voList: any[]) {
    const map = new Map<string, number[]>();

    voList.forEach(vo => {
      const key = `${vo.openTime}-${vo.closeTime}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(vo.week);
    });

    const newSlots: TimeSlotUI[] = [];
    map.forEach((weeks, timeKey) => {
      const [openStr, closeStr] = timeKey.split('-');
      newSlots.push({
        selectedWeeks: weeks.sort((a, b) => a - b),
        openTime: this.parseTimeToDate(openStr),
        closeTime: this.parseTimeToDate(closeStr)
      });
    });
    this.timeSlots = newSlots.length > 0 ? newSlots : [{ selectedWeeks: [], openTime: null, closeTime: null }];
  }

  private parseTimeToDate(timeStr: string): Date {
    if (!timeStr) return new Date();
    const parts = timeStr.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  // 上傳照片
  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.storeData.image = new Blob([e.target.result], { type: file.type });
      };
      reader.readAsArrayBuffer(file);
    }
  }
  selectedFile: File | null = null;
  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.storeData.image = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.storeData.image = null;
    this.selectedFile = null;
  }

  // 營業時間
  addTimeSlot() {
    this.timeSlots.push({
      selectedWeeks: [],
      openTime: null,
      closeTime: null
    });
  }

  removeTimeSlot(index: number) {
    this.timeSlots.splice(index, 1);
  }

  formatTime(date: Date | null): string {
    if (!date) {
      return '00:00';
    }
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // 運費級距
  addFeeRow() {
    this.storeData.feeDescription.push({ km: 0, fee: 0 });
  }

  removeFeeRow(index: number) {
    this.storeData.feeDescription.splice(index, 1);
  }

  // 下一步
  onSubmit() {
    const finalVoList: any[] = [];
    const missingFields: string[] = [];

    if (!this.storeData.name) missingFields.push('商店名稱');
    if (!this.storeData.address) missingFields.push('商店地址');
    if (!this.storeData.phone) missingFields.push('聯絡電話');
    if (!this.storeData.category) missingFields.push('經營類別');
    if (!this.storeData.type) missingFields.push('商店類型');

    this.timeSlots.forEach(slot => {
      const openStr = this.formatTime(slot.openTime);
      const closeStr = this.formatTime(slot.closeTime);

      slot.selectedWeeks.forEach(w => {
        finalVoList.push({
          week: w,
          openTime: openStr,
          closeTime: closeStr
        });
      });
    });

    if (finalVoList.length === 0) {
      missingFields.push('營業時間');
    }

    if (missingFields.length > 0) {
      this.alertMessage = missingFields.map(field => ` ${field}`).join('\n');
      this.displayAlertDialog = true;
      return;
    }

    this.storeData.operatingHoursVoList = finalVoList;
    const readyToSave = { ...this.storeData } as any;

    this.storeService.storeData = readyToSave;

    console.log('同步到 Service 成功：', this.storeService.storeData);

    if (this.id !== 0) {
      this.router.navigate(['/management/store', this.id]);
    } else {
      this.router.navigate(['/management/store']);
    }

    sessionStorage.removeItem('temp_order_info');
  }
}

export interface Category {
  name: string;
  value: string;
}

export interface TimeSlotUI {
  selectedWeeks: number[];
  openTime: Date | null;
  closeTime: Date | null;
}

export interface FeeDescription {
  km: number;
  fee: number;
}

