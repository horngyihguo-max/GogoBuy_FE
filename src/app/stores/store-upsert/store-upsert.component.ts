import { Component } from '@angular/core';
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
import { StoreService } from '../../@service/store.service';

@Component({
  selector: 'app-store-upsert',
  imports: [
    InputGroupModule, InputGroupAddonModule,
    InputNumberModule, FormsModule,
    InputTextModule, DatePickerModule,
    SelectModule, FloatLabelModule,
    DatePickerModule, FormsModule, FluidModule,
    FormsModule, CheckboxModule, InputNumber,
  ],
  templateUrl: './store-upsert.component.html',
  styleUrl: './store-upsert.component.scss'
})
export class StoreUpsertComponent {

  constructor(private storeService: StoreService){}

  date2: Date | undefined;
  date3: Date | undefined;
  selectCategory!: string;

  category: Category[] = [
    { name: '團購代購', code: 1 },
    { name: '外送', code: 2 },
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

  timeSlots: TimeSlotUI[] = [
    { selectedWeeks: [], openTime: null, closeTime: null }
  ];

  groupedType = [
    {
      label: '1. 熟食餐點',
      items: [
        { label: '各國料理', value: '各國料理' },
        { label: '在地小吃', value: '在地小吃' },
        { label: '健康舒食', value: '健康舒食' },
        { label: '素食料理', value: '素食料理' },
        { label: '宵夜點心', value: '宵夜點心' }
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

  storeData = {
    name: '',
    phone: '',
    address: '',
    type: '',
    memo: '',
    is_public: false,
    category: null as Category | null,
    image: '' as Blob | string | null,
    created_by: 'A01',
    operatingHoursVoList: [
      {
        week: [null as number | null],
        openTime: '',
        closeTime: ''
      },
    ],
    fee_description: [] as FeeDescription[]
  }

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

      // 使用 FileReader 產生預覽網址
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

  addFeeRow(){
    this.storeData.fee_description.push({ km: 0, fee: 0 });
  }

  removeFeeRow(index: number) {
    this.storeData.fee_description.splice(index, 1);
  }

  onSubmit() {
    const finalVoList: any[] = [];

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

    this.storeData.operatingHoursVoList = finalVoList;
    this.storeService.storeData = this.storeData;
    console.log('storeData：', this.storeData);


  }

  formatTime(date: Date | null): string {
    if (!date) {
      return '00:00';
    }
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }



}

export interface Category {
  name: string;
  code: number;
}

export interface TimeSlotUI {
  selectedWeeks: number[]; // 例如 [1, 2, 3]
  openTime: Date | null;
  closeTime: Date | null;
}

export interface FeeDescription {
  km: number;
  fee: number;
}
