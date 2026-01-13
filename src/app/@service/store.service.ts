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
    // category: null as Category | null,
    type: '',
    memo: '',
    image: null as Blob | null,
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
      { km: 1.0, fee: 20 },
    ]
  }

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
