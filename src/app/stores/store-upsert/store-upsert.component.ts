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
import { FeeDescriptionVoList, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, StoreService, Stores } from '../../@service/store.service';
import { DialogModule } from 'primeng/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpService } from '../../@service/http.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ImageService } from '../../@service/image.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-store-upsert',
  imports: [
    InputGroupModule, InputGroupAddonModule,
    InputNumberModule, FormsModule,
    InputTextModule, DatePickerModule,
    SelectModule, FloatLabelModule,
    DatePickerModule, FormsModule, FluidModule,
    FormsModule, CheckboxModule, InputNumber,
    DialogModule, AutoCompleteModule
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
    private imageService: ImageService,
  ) { }

  userId = '';
  id!: number;
  wishId!: number;
  storeList: any[] = [];
  filteredStores: any[] = [];
  displayAlertDialog: boolean = false;
  alertMessage!: string;
  selectCategory!: string;
  phoneRegex = /^(09\d{8}|0\d{1,2}-?\d{6,8})$/;
  districtsLoaded = false;

  // 暫存輸入時間
  timeSlots: TimeSlotUI[] = [];

  // 行政地區
  cityOptions: any[] = [];
  selectedCity: any = null;
  selectedDistrict: any = null;
  detailAddress: string = '';

  // 行政地區 API 排除釣魚台
  loadTaiwanDistricts() {
    const url = 'https://raw.githubusercontent.com/donma/TaiwanAddressCityAreaRoadChineseEnglishJSON/master/AllData.json';
    this.http.getDApi(url, false).subscribe((data: any) => {
      this.cityOptions = data.filter((city: any) => city.CityName !== '釣魚臺' && city.CityName !== '南海島')
        .map((city: any) => {
          if (city.CityName == '宜蘭縣') {
            return {
              ...city,
              AreaList: city.AreaList.filter((area: any) => area.AreaName !== '釣魚臺')
            }
          }
          return city;
        });
        this.districtsLoaded = true;
        if (this.storeData && this.storeData.address) {
          this.parseAddressToFields();
        }
    });
  }

  updateFullAddress() {
    const city = this.selectedCity?.CityName || '';
    const district = this.selectedDistrict?.AreaName || '';
    const detail = this.detailAddress?.trim() || '';

    this.storeData.address = `${city}${district}${detail}`;
  }

  onCityChange(shouldUpdateAddress: boolean = true) {
    this.selectedDistrict = null;
    if (shouldUpdateAddress) {
      this.updateFullAddress();
    }
  }

  // 經營類別
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
    { name: '熟食餐點', code: '熟食餐點' },
    { name: '飲品與甜點', code: '飲品與甜點' },
    { name: '即時生活用品', code: '即時生活用品' },
    { name: '冷凍與加工食品', code: '冷凍與加工食品' },
    { name: '家居與生活用品', code: '家居與生活用品' },
    { name: '美妝與服飾配件', code: '美妝與服飾配件' },
    { name: '母嬰與寵物用品', code: '母嬰與寵物用品' },
    { name: '運動與休閒娛樂', code: '運動與休閒娛樂' }
  ];

  // 送 service 店家資訊
  storeData = {
    id: 0,
    name: '',
    phone: '',
    address: '',
    type: '',
    memo: '',
    publish: true,
    category: '',
    image: '' as any,
    createdBy: this.userId,
    operatingHoursVoList: [
      {
        week: [null as number | null],
        openTime: '',
        closeTime: ''
      },
    ],
    feeDescription: null as FeeDescriptionVoList[] | null,
    menuVoList: [] as MenuVoList[],
    menuCategoriesVoList: [] as MenuCategoriesVoList[],
    productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
  }

  // 店家輸入時顯示搜尋
  searchStore(event: any) {
    const query = event.query.toLowerCase();
    this.filteredStores = this.storeList.filter(store =>
      store.name.toLowerCase().includes(query)
    );
  }

  // 如果是用使用 搜尋店家名稱 取得店家資訊
  onStoreSelect(event: any) {
    const selected = event.value;
    this.id = selected.id;
    this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${this.id}`)
        .subscribe((res: any) => {
          if (res.storeList && res.storeList.length > 0) {
            this.storeData = { ...res.storeList[0] };

            if (typeof this.storeData.feeDescription === 'string') {
              this.storeData.feeDescription = JSON.parse(this.storeData.feeDescription);
            }

            this.convertVoToTimeSlots(res.operatingHoursVoList || []);
            this.parseAddressToFields();
          }
        });
  }

  // 將完整地址拆分成 縣市/行政區域/路巷號
  parseAddressToFields() {
    if (!this.storeData.address) return;
    if (!this.storeData.address || typeof this.storeData.address !== 'string') return;

    const regex = /^(\D+?[縣市])(\D+?[區鄉鎮市])(.*)$/;
    const match = this.storeData.address.match(regex);

    if (match) {
      const cityName = match[1];
      const districtName = match[2];
      const restAddress = match[3].trim();

      this.selectedCity = this.cityOptions.find(c => c.CityName == cityName);

      if (this.selectedCity) {
        this.onCityChange(false);

        this.selectedDistrict = this.selectedCity.AreaList.find(
          (a: any) => a.AreaName === districtName);
      }
      this.detailAddress = restAddress.trim();
    } else {
      this.detailAddress = this.storeData.address;
    }
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
    this.userId = String(localStorage.getItem('user_id') || '');
    this.loadTaiwanDistricts();
    this.initTimeOptions();

    this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((res: any) => {
      this.storeList = res.storeList;
      console.log("this.storeList", this.storeList);
    });

    this.id = Number(this.route.snapshot.paramMap.get('id'));

    // service 讀取資料
    if (!this.wishId && this.storeService.storeData && this.storeService.storeData.name !== '') {
      const source = this.storeService.storeData;
      this.storeData = {
        ...this.storeData,
        ...source,
        memo: source.memo ?? '',
        image: source.image ?? null,
        feeDescription: source.feeDescription ?? []
      } as any;

      this.parseAddressToFields();
      this.convertVoToTimeSlots(source.operatingHoursVoList || []);
    } else {
      this.addTimeSlot();
    }

    this.route.queryParams.subscribe(params => {
      if (params['wish_title']) {
        setTimeout(() => {
          this.storeData.name = params['wish_title'];
          this.wishId = params['wish_id'];
          console.log('延遲賦值成功');
        }, 0);
      }
    })

    if (this.id !== 0 || this.id) {
      this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${this.id}`)
        .subscribe((res: any) => {
          if (res.storeList && res.storeList.length > 0) {
            this.storeData = { ...res.storeList[0] };
            if (typeof this.storeData.feeDescription === 'string') {
              this.storeData.feeDescription = JSON.parse(this.storeData.feeDescription);
            }

            this.convertVoToTimeSlots(res.operatingHoursVoList || []);
            this.parseAddressToFields();
            console.log("this.storeData:", this.storeData);
          }
        });
    } else {
      // session 讀取資料
      const savedData = sessionStorage.getItem('temp_order_info');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        this.storeData = parsed;
        this.convertVoToTimeSlots(parsed.operatingHoursVoList || []);
        this.parseAddressToFields();
      }
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
    if (!voList || voList.length === 0) {
      this.timeSlots = [this.createDefaultSlot()];
      return;
    }

    const map = new Map<string, number[]>();

    voList.forEach(vo => {
      const open = vo.openTime ? vo.openTime.substring(0, 5) : '09:00';
      const close = vo.closeTime ? vo.closeTime.substring(0, 5) : '18:00';
      const key = `${open}-${close}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      if (Array.isArray(vo.week)) {
        const weekNums = vo.week.map((w: any) => parseInt(w, 10));
        map.get(key)?.push(...weekNums);
      } else if (vo.week !== undefined && vo.week !== null) {
        map.get(key)?.push(parseInt(vo.week, 10));
      }
    });

    const newSlots: TimeSlotUI[] = [];
    map.forEach((weeks, timeKey) => {
      const [openStr, closeStr] = timeKey.split('-');
      const [openH, openM] = openStr.split(':');
      const [closeH, closeM] = closeStr.split(':');

      newSlots.push({
        selectedWeeks: [...new Set(weeks)].sort((a, b) => a - b),
        openHour: openH.padStart(2, '0'),
        openMinute: openM.padStart(2, '0'),
        closeHour: closeH.padStart(2, '0'),
        closeMinute: closeM.padStart(2, '0')
      });
    });

    this.timeSlots = newSlots.length > 0 ? newSlots : [this.createDefaultSlot()];
  }

  createDefaultSlot(): TimeSlotUI {
    return {
      selectedWeeks: [],
      openHour: '09',
      openMinute: '00',
      closeHour: '18',
      closeMinute: '00'
    };
  }

  // 上傳照片
  onFileSelected(event: any) {
    const input = event.target as HTMLInputElement;
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: `只能上傳圖片檔喔!`,
        showConfirmButton: false,
        timer: 2000,
      });
      input.value = '';
      return;
    }

    if (file.size > 2000000) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'error',
        title: `圖片太大了(${sizeMB}MB)，請上傳 2MB 以下的圖片!`,
        showConfirmButton: false,
        timer: 2000,
      });
      input.value = '';
      return;
    }
    // selectedFile
    const localPreview = URL.createObjectURL(file);
    const oldAvatar = this.storeData.image;
    this.storeData.image = localPreview;

    Swal.fire({
      title: '上傳中...',
      text: '請稍候',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.imageService.upload('stores', file).subscribe({
      next: (res) => {
        Swal.close();

        this.storeData.image = res;

        Swal.fire({ icon: 'success', title: '上傳成功' });
        input.value = '';
      },
      error: (err) => {
        console.error(err);
        this.storeData.image = oldAvatar;

        Swal.fire({
          icon: 'error',
          title: '上傳失敗',
          text: err?.error ?? '請稍後再試',
        });
        input.value = '';
      },
      complete: () => {
        if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview);
      },
    });
  }

  removeImage(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.storeData.image = null;
  }

  // 營業時間
  addTimeSlot() {
    this.timeSlots.push(this.createDefaultSlot());
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

  hours: string[] = [];
  minutes: string[] = [];

  initTimeOptions() {
    this.hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    this.minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  }


  // 運費級距
  addFeeRow() {
    if (!this.storeData.feeDescription) {
      this.storeData.feeDescription = [];
    }
    this.storeData.feeDescription.push({ km: 0, fee: 0 });
  }

  removeFeeRow(index: number) {
    this.storeData.feeDescription?.splice(index, 1);
  }

  // 取消
  cancelStore() {
    sessionStorage.removeItem('temp_order_info');
    this.storeData = this.storeService.storeData = {
      id: 0,
      name: '',
      phone: '',
      address: '',
      category: '',
      type: '',
      memo: '',
      image: null as Blob | string | null,
      publish: false,
      createdBy: '',
      operatingHoursVoList: [],
      feeDescription: [] as FeeDescriptionVoList[],
      menuVoList: [] as MenuVoList[],
      menuCategoriesVoList: [] as MenuCategoriesVoList[],
      productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
    };
    this.router.navigate(['../../gogobuy']);
  }

  // 下一步
  onSubmit() {
    const missingFields: string[] = [];

    console.log(this.storeData.image);

    if (!this.storeData.name) missingFields.push('商店名稱');
    if (!this.storeData.address) missingFields.push('商店地址');
    if (!this.storeData.phone) missingFields.push('聯絡電話');
    if (!this.storeData.category) missingFields.push('經營類別');
    if (!this.storeData.type) missingFields.push('商店類型');

    const finalVoList = this.timeSlots.map(slot => {
      return {
        week: slot.selectedWeeks && slot.selectedWeeks.length > 0 ? slot.selectedWeeks : [],
        openTime: `${slot.openHour || '00'}:${slot.openMinute || '00'}`,
        closeTime: `${slot.closeHour || '00'}:${slot.closeMinute || '00'}`
      };
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
  openHour: string;
  openMinute: string;
  closeHour: string;
  closeMinute: string;
}
