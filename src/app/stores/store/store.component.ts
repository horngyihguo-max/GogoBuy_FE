import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { SplitterModule } from 'primeng/splitter';
import { ImageModule } from 'primeng/image';
import { InputTextModule } from 'primeng/inputtext';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { HttpService } from '../../@service/http.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-store',
  imports: [
    StepperModule, ToggleSwitchModule,
    FormsModule, SplitterModule,
    ImageModule, ButtonModule,
    InputTextModule, ScrollPanelModule,
    TableModule, SelectButtonModule, CommonModule,
    DialogModule, ButtonModule,
    RouterLink
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent implements AfterViewInit {

  constructor(private http: HttpService) { }

  displayEditDialog = false;
  displayAddDialog = false;
  displayStoreInfoDialog = false;
  displaySaveDialog = false;
  selectedProduct!: MenuVoList;
  selectedCategoryId!: number;
  name!: string;
  description!: string;
  basePrice!: number;
  image!: string;
  unusual!: string[];

  storeTab: 'info' | 'orderInfo' = 'info';
  selectedIndex = 0;
  indicatorLeft = 0;
  indicatorWidth = 0;

  selectedCategoryName = '';
  isAdding = false;
  newCategoryName = '';

  @ViewChildren('tabBtn') tabBtns!: QueryList<ElementRef>;

  ngOnInit() {
    if (this.store.menuCategoriesVoList.length > 0) {
      this.selectedCategoryName = this.store.menuCategoriesVoList[0].name;
    }
  }

  ngAfterViewInit() {
    this.updateIndicator();
  }

  previewUrl: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;

  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.selectedFile = file;

      // 使用 FileReader 產生預覽網址
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(event: Event) {
    event.preventDefault(); // 防止觸發 input 的點擊
    event.stopPropagation();
    this.previewUrl = null;
    this.selectedFile = null;
  }


  addStore(){

  }

  editStore(event: Event) {
    event.stopPropagation();
  }

  startAdding(event: Event) {
    event.stopPropagation();
    this.isAdding = true;
    this.newCategoryName = '';
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('#newCategoryInput')?.focus();
    }, 0);
  }


  get currentCategoryId(): number {
    const index = this.store.menuCategoriesVoList.findIndex(c => c.name ===
      this.selectedCategoryName);
    return index + 1;
  }

  get filteredProducts() {
    return this.store.menuVoList.filter(item => item.categoryId === this.currentCategoryId);
  }

  selectCategory(name: string, index: number) {
    this.selectedCategoryName = name;
    this.selectedIndex = index;

    setTimeout(() => this.updateIndicator());
  }

  updateIndicator() {
    const tab = this.tabBtns.toArray()[this.selectedIndex]?.nativeElement;
    if (!tab) return;

    this.indicatorLeft = tab.offsetLeft;
    this.indicatorWidth = tab.offsetWidth;
  }

  saveCategory() {
    if (this.newCategoryName.trim()) {
      this.store.menuCategoriesVoList.push({ name: this.newCategoryName, priceLevel: [] });
      this.selectCategory(this.newCategoryName, this.store.menuCategoriesVoList.length - 1);
    }
    this.isAdding = false;
  }

  cancelAdding() {
    this.isAdding = false;
    this.newCategoryName = '';
  }

  openEdit(product: MenuVoList) {
    this.selectedProduct = product;
    this.displayEditDialog = true;
  }

  openAdd() {
    this.displayAddDialog = true;
  }

  opendStoreInfo() {
    this.storeTab = 'info'
    this.displayStoreInfoDialog = true;
  }

  onSaveAll() {
    this.displaySaveDialog = true;
  }

  store: Stores = {
    id: 1,
    storesname: "可不可 OKORNOT",
    phone: "0988777666",
    address: "台南市歸仁區中正南路1001號",
    category: "餐飲",
    type: "手搖飲",
    memo: "外送請提前一小時訂購",
    image: "okornot.png",
    feeDescription: [
      { km: 1.0, fee: 20 },
      { km: 5.0, fee: 50 }
    ],
    isPublic: true,
    createdBy: "UUID",
    operatingHoursVoList: [
      { week: 1, openTime: "10:00", closeTime: "22:00" },
      { week: 2, openTime: "10:00", closeTime: "22:00" },
      { week: 3, openTime: "10:00", closeTime: "22:00" },
      { week: 4, openTime: "10:00", closeTime: "22:00" },
      { week: 5, openTime: "10:00", closeTime: "23:00" }
    ],
    menuVoList: [
      {
        categoryId: 1,
        name: "經典紅玉",
        description: "嚴選紅玉紅茶",
        basePrice: 35,
        image: "tea_red.jpg",
        isAvailable: true,
        unusual: ["去冰", "微糖"]
      }
    ],
    menuCategoriesVoList: [
      {
        name: "純茶",
        priceLevel: [
          { name: "中杯", price: 0 },
          { name: "大杯", price: 10 }
        ]
      },
      {
        name: "找鮮奶",
        priceLevel: [
          { name: "中杯", price: 0 },
          { name: "大杯", price: 15 }
        ]
      }
    ],
    productOptionGroupsVoList: [
      {
        name: "甜度",
        isRequired: true,
        maxSelection: 1,
        items: [
          { name: "無糖", extraPrice: 0 },
          { name: "半糖", extraPrice: 0 },
          { name: "全糖", extraPrice: 0 }
        ]
      },
      {
        name: "加配料",
        isRequired: false,
        maxSelection: 2,
        items: [
          { name: "黑糖珍珠", extraPrice: 10 },
          { name: "仙草凍", extraPrice: 5 }
        ]
      }
    ]
  }

  operatingHoursVoList: OperatingHoursVoList = {
    week: 1,
    openTime: "09:00",
    closeTime: "21:00",
  }

  //API get
  menu: MenuVoList[] = [
    {
      categoryId: 2,
      name: "波霸紅茶拿鐵",
      basePrice: 45,
      description: "濃醇紅茶融合香濃鮮奶，搭配Q彈波霸，口感層次豐富、甜而不膩。",
      image: "blackMilk.jpeg",
      isAvailable: true,
      unusual: []
    }, {
      categoryId: 2,
      name: "阿華田拿鐵",
      basePrice: 50,
      description: "香濃阿華田巧克力融合鮮奶，口感滑順，甜而不膩，暖心提神飲品。",
      image: "chocolate.jpeg",
      isAvailable: true,
      unusual: []
    }
  ]

  menuCategories: MenuCategoriesVoList[] = [
    {
      name: "純茶",
      priceLevel: [
        { "name": "中杯", "price": 0 },
        { "name": "大杯", "price": 10 }
      ]
    },
    {
      name: "找拿鐵",
      priceLevel: [
        { "name": "中杯", "price": 0 },
        { "name": "大杯", "price": 15 }
      ]
    },
    {
      name: "醇奶",
      priceLevel: [
        { "name": "中杯", "price": 0 },
        { "name": "大杯", "price": 10 }
      ]
    },

  ]

  selectedSize: any = undefined;

}

export interface Stores {
  id: number;
  storesname: string;
  phone: string;
  address: string;
  category: string;
  type: string;
  memo: string;
  image: string;
  isPublic: boolean;
  createdBy: string;
  feeDescription: FeeDescription[];
  operatingHoursVoList: OperatingHoursVoList[];
  menuVoList: MenuVoList[];
  menuCategoriesVoList: MenuCategoriesVoList[];
  productOptionGroupsVoList: ProductOptionGroupsVoList[]
}

export interface FeeDescription {
  km: number;
  fee: number;
}

export interface OperatingHoursVoList {
  week: number;
  openTime: string,
  closeTime: string,
}

export interface MenuVoList {
  categoryId: number;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  isAvailable: boolean;
  unusual: string[];
}

export interface MenuCategoriesVoList {
  name: string;
  priceLevel: PriceLevel[];
}

export interface PriceLevel {
  name: string;
  price: number;
}

export interface ProductOptionGroupsVoList {
  name: string;
  isRequired: boolean;
  maxSelection: number;
  items: Items[];
}

export interface Items {
  name: string;
  extraPrice: number;
}
