import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor() { }

  wishId!: number;

  storeData: Stores = {
    id: 0,
    name: '',
    phone: '',
    address: '',
    category: '',
    type: '',
    memo: '',
    image: '',
    publish: false,
    createdBy: '',
    operatingHoursVoList: [] as OperatingHoursVoList[],
    feeDescription: [] as FeeDescriptionVoList[],
    menuVoList: [] as MenuVoList[],
    menuCategoriesVoList: [] as MenuCategoriesVoList[],
    productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
  }

  clearCurrentStore() {
    this.storeData = {
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
  }

}
export interface Stores {
  id: number;
  name: string;
  phone: string;
  address: string;
  category: string;
  type: string;
  memo?: string | null;
  image?: any | null;
  publish: boolean;
  createdBy: string;
  feeDescription?: FeeDescriptionVoList[];
  operatingHoursVoList: OperatingHoursVoList[];
  menuVoList: MenuVoList[];
  menuCategoriesVoList?: MenuCategoriesVoList[];
  productOptionGroupsVoList?: ProductOptionGroupsVoList[]
}

export interface FeeDescriptionVoList {
  km: number;
  fee: number;
}

export interface OperatingHoursVoList {
  week: number;
  openTime: string,
  closeTime: string,
}

export interface MenuVoList {
  id: number,
  categoryId: any;
  name: string;
  description?: string;
  basePrice: any | null;
  available: boolean;
  image?: string;
  unusual?: { [key: string]: string };
}

export interface MenuCategoriesVoList {
  id: number;
  name: string;
  priceLevel?: PriceLevel[];
}

export interface PriceLevel {
  name: string;
  price: number | null;
}

export interface ProductOptionGroupsVoList {
  id: number;
  name: string;
  required: boolean;
  maxSelection: number | null;
  items: Items[];
  applicableCategoryIds?: number[]; // 前端判斷用 不計入到資料庫
}

export interface Items {
  id: number;
  name: string;
  extraPrice: number | null;
}

// 以下是暫存資料的interface ----------------
export interface Category {
  name: string;
  code: string;
}

export interface TimeSlotUI {
  selectedWeeks: number[];
  openTime: Date | null;
  closeTime: Date | null;
}
