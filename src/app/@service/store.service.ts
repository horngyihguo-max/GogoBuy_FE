import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor() { }

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
    fee_description: [] as FeeDescription[]
  }

}
export interface Stores {
  id?: number;
  storesName: string;
  phone: string;
  address: string;
  category: any;
  type: string;
  memo?: string;
  image?: any;
  isPublic: boolean;
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
  id?: number,
  categoryId: number;
  name: string;
  description?: string;
  basePrice: number | null;
  isAvailable: boolean;
  image?: string;
  unusual?: string[];
}

export interface MenuCategoriesVoList {
  id?: number;
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
  applicableCategoryIds?: number[];
}

export interface Items {
  name: string;
  extraPrice: number | null;
}

// 以下是暫存資料的interface ----------------
export interface Category {
  name: string;
  code: number;
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
