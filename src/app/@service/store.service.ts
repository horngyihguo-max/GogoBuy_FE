import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor() { }

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
    createdBy: 'A01',
    operatingHoursVoList: [] as OperatingHoursVoList[],
    feeDescription: [] as FeeDescription[],
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
      createdBy: 'A01',
      operatingHoursVoList: [],
      feeDescription: [] as FeeDescription[],
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
  feeDescription?: FeeDescription[];
  operatingHoursVoList: OperatingHoursVoList[];
  menuVoList: MenuVoList[];
  menuCategoriesVoList?: MenuCategoriesVoList[];
  productOptionGroupsVoList?: ProductOptionGroupsVoList[]
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
  id: number,
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number | null;
  available: boolean;
  image?: string;
  unusual?: { [key: string]: any };
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
  id?: number;
  name: string;
  isRequired: boolean;
  maxSelection: number | null;
  items: Items[];
  applicableCategoryIds?: number[]; // 後端沒有欄位
}

export interface Items {
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

export interface FeeDescription {
  km: number;
  fee: number;
}
