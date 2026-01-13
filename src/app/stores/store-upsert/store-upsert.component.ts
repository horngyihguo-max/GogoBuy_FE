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

  storeData = {
    name: '',
    phone: '',
    address: '',
    category: null as Category | null,
    type: '',
    memo: '',
    image: null as Blob | string | null,
    is_public: false,
    created_by: 'A01',
    operatingHoursVoList: [
      {
        week: [null as number | null],
        openTime: '',
        closeTime: ''
      },
    ],
    fee_description: [
      { km: 1.0, fee: 20 }
    ]
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
    event.preventDefault(); // 防止觸發 input 的點擊
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
    console.log('準備送出的資料：', this.storeData);
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
