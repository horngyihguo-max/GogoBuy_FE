import { PriceLevel } from './../../@service/store.service';
import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
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
import { Router, RouterLink } from "@angular/router";
import { Category, FeeDescription, Items, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, Stores } from '../../@service/store.service';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-store',
  imports: [
    StepperModule, ToggleSwitchModule,
    FormsModule, SplitterModule,
    ImageModule, ButtonModule,
    InputTextModule, ScrollPanelModule,
    TableModule, SelectButtonModule, CommonModule,
    DialogModule, ButtonModule, RouterLink,
    InputGroupModule, InputGroupAddonModule, FloatLabelModule,
    InputNumberModule, SelectModule, InputTextModule,
    IconFieldModule, InputIconModule, CheckboxModule
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent {

  constructor(private http: HttpService, private router: Router) { }

  // 開啟dialog
  displayStoreInfoDialog = false;
  displayCategoriesDialog = false;
  displaySpecsDialog = false;
  displayProductDialog = false;
  displayItemDialog = false;
  displaySaveDialog = false;

  selectedProduct!: MenuVoList;
  selectedCategoryId!: number;
  selectedIndex: number = -1;

  // 店家詳細資訊
  storeTab: 'info' | 'orderInfo' = 'info';
  indicatorLeft = 0;
  indicatorWidth = 0;

  // 商品分類
  filteredProducts: MenuVoList[] = [];
  newCategories = '';
  currentCategoryId: number = -1;
  currentCategories: MenuCategoriesVoList = this.getNewCategories();
  editingCategory: any = null;
  editingIndex!: number;

  // 規格
  editingSpecIndex: number = -1;
  currentGroup: ProductOptionGroupsVoList = this.getEmptyGroup();
  selectedSpecsCategories: any[] = [];
  filteredSpecsForProduct: any[] = [];

  // 暫存新增的商品
  currentProduct: MenuVoList = this.getNewProduct();
  optionGroups: ProductOptionGroupsVoList = this.getNewGroups();
  currentGroupIndex: number | null = null;
  currentItemIndex: number | null = null;
  currentItem: Items = { name: '', extraPrice: 0 };

  isEditMode = false;
  searchKeyword: string = '';

  getNewProduct(): MenuVoList {
    return {
      name: '',
      description: '',
      categoryId: 0,
      basePrice: null,
      image: '',
      isAvailable: true,
      unusual: []
    }
  };

  getNewGroups(): ProductOptionGroupsVoList {
    return {
      name: '',
      isRequired: false,
      maxSelection: null,
      items: []
    }
  };

  getNewItem(): Items {
    return {
      name: '',
      extraPrice: null
    }
  }

  getNewCategories(): MenuCategoriesVoList {
    return {
      name: '',
      priceLevel: [
        { name: '', price: null }
      ]
    };
  }

  getEmptyGroup(): ProductOptionGroupsVoList {
    return {
      name: '',
      isRequired: false,
      maxSelection: null,
      items: []
    };
  }

  // 打包傳進資料庫
  storeData = {
    storesName: '',
    phone: '',
    address: '',
    category: null as Category | null,
    type: '',
    memo: '',
    image: null as Blob | string | null,
    is_public: false,
    created_by: 'A01',
    operatingHoursVoList: [] as OperatingHoursVoList[],
    fee_description: [] as FeeDescription[],
    menuVoList: [] as MenuVoList[],
    menuCategoriesVoList: [] as MenuCategoriesVoList[],
    productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
  }

  @ViewChildren('tabBtn') tabBtns!: QueryList<ElementRef>;

  ngOnInit() {
    this.filteredProducts = [...this.storeData.menuVoList];
    console.log(this.filteredProducts);

  }

  // 店家資訊 ---------------------------------------------------------
  opendStoreInfo() {
    this.storeTab = 'info'
    this.displayStoreInfoDialog = true;
  }

  editStore(event: Event) {
    event.stopPropagation();
  }

  // 商品分類 ---------------------------------------------------------
  addCategories(event: Event) {
    this.isEditMode = false;
    this.currentCategories = this.getNewCategories();
    this.displayCategoriesDialog = true;
  }

  editCategory(categories: MenuCategoriesVoList, index: number) {
    this.isEditMode = true;
    this.editingIndex = index;
    this.currentCategories = { ...categories };
    this.displayCategoriesDialog = true;
  }

  deleteCategory() {
    this.storeData.menuCategoriesVoList.splice(this.editingIndex, 1);
    this.displayCategoriesDialog = false;
  }

  addPriceLevel() {
    if (this.currentCategories.priceLevel) {
      this.currentCategories.priceLevel.push({
        name: '',
        price: null
      });
    }
  }

  removePriceLevel(index: number) {
    if (this.currentCategories.priceLevel) {
      this.currentCategories.priceLevel.splice(index, 1);
    }
  }

  saveCategories() {
  if (this.isEditMode && this.editingIndex !== -1) {
    this.storeData.menuCategoriesVoList[this.editingIndex] = { ...this.currentCategories };
  } else {
    const newCategory = {
      ...this.currentCategories,
      id: Date.now()
    };
    this.storeData.menuCategoriesVoList.push(newCategory);
  }

  this.storeData.menuCategoriesVoList = [...this.storeData.menuCategoriesVoList];

  console.log("menuCategoriesVoList: " ,this.storeData.menuCategoriesVoList);

  this.displayCategoriesDialog = false;
}

  selectedCategories(catId: number = -1) {
    this.selectedIndex = catId;
    this.currentCategoryId = catId;
    this.searchKeyword = '';
    this.applyFilters();
  }

  // 規格 ---------------------------------------------------------
  addSpecs() {
    this.displaySpecsDialog = true;
    this.editingSpecIndex = -1;
    this.currentGroup = {
      isRequired: false,
      name: '',
      maxSelection: 1,
      items: [{ name: '', extraPrice: 0 }]
    };
    this.displaySpecsDialog = true;
  }

  editSpec(spec: ProductOptionGroupsVoList, index: number) {
    this.isEditMode = true;
    this.editingSpecIndex = index;
    this.currentGroup = { ...spec };

    if (spec.applicableCategoryIds) {
      this.selectedSpecsCategories = this.storeData.menuCategoriesVoList.filter(cate => {
        if (cate.id !== undefined) {
          return spec.applicableCategoryIds?.includes(cate.id);
        }
        return false;
      });
    } else {
      this.selectedSpecsCategories = [];
    }

    this.displaySpecsDialog = true;
  }

  addSpecItem() {
    this.currentGroup.items.push({
      name: '',
      extraPrice: 0
    });
  }

  deleteSpec(index: number) {
    const target = this.storeData.productOptionGroupsVoList[index];
    if (confirm(`確定要刪除「${target.name}」嗎？`)) {
      if (target.id) {
        this.storeData.productOptionGroupsVoList = this.storeData.productOptionGroupsVoList.filter(
          item => item.id !== target.id
        );
      } else {
        this.storeData.productOptionGroupsVoList.splice(index, 1);
      }
    }
  }

  isCateSelected(cate: any): boolean {
    if (!this.selectedSpecsCategories) return false;
    return this.selectedSpecsCategories.some(selected => selected === cate);
  }

  removeSpecItem(index: number) {
    this.currentGroup.items.splice(index, 1);
  }

  saveSpec() {
    if (!this.currentGroup.name.trim()) return;
    this.currentGroup.applicableCategoryIds = this.selectedSpecsCategories.map(cate => cate.id);

    if (this.isEditMode) {
      this.storeData.productOptionGroupsVoList[this.editingSpecIndex] = { ...this.currentGroup };
    } else {
      const newSpec = { ...this.currentGroup, id: Date.now() };
      this.storeData.productOptionGroupsVoList.push(newSpec);
    }

    this.storeData.productOptionGroupsVoList = [...this.storeData.productOptionGroupsVoList];
    this.displaySpecsDialog = false;
    this.currentGroup = this.getEmptyGroup();
    this.selectedSpecsCategories = [];
  }

  // 圖片 ---------------------------------------------------------
  applyFilters() {
    let results = [...this.storeData.menuVoList];
    if (this.selectedIndex !== -1) {
      results = results.filter(p => p.categoryId === this.storeData.menuCategoriesVoList[this.selectedIndex].id);
    }

    const keyword = this.searchKeyword.trim().toLowerCase();
    if (keyword) {
      results = results.filter(p => {
        const nameMatch = p.name?.toLowerCase().includes(keyword);
        const descMatch = p.description?.toLowerCase().includes(keyword);
        return nameMatch || descMatch;
      });
    }
    this.filteredProducts = results;
  }

  // 新增商品 ---------------------------------------------------------
  openNewProduct() {
    this.isEditMode = false;
    this.currentProduct = this.getNewProduct();
    this.displayProductDialog = true;
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

  onCategoryChange() {
    const selectedId = this.currentProduct.categoryId;
    if (!selectedId) {
      this.filteredSpecsForProduct = [];
      return;
    }
    this.filteredSpecsForProduct = this.storeData.productOptionGroupsVoList.filter(spec =>
      spec.applicableCategoryIds?.includes(selectedId)
    );
  }

  // 單一商品新增規格 ---------------------------------------------------------
  addProductSpecs() {
    this.storeData.productOptionGroupsVoList.push({
      isRequired: false,
      name: '',
      maxSelection: 0,
      items: []
    });
  }

  removeProductSpecs(index: number) {

  }

  openItemDialog(groupIndex: number, itemIndex: number | null = null) {
    this.currentGroupIndex = groupIndex;
    this.currentItemIndex = itemIndex;
    if (itemIndex !== null) {
      const targetItem = this.storeData.productOptionGroupsVoList[groupIndex].items[itemIndex];
      this.currentItem = { ...targetItem };
    } else {
      this.currentItem = { name: '', extraPrice: 0 };
    }
    this.displayItemDialog = true;
  }

  saveItem() {
    if (this.currentItem.name && this.currentGroupIndex !== null) {
      const targetGroup = this.storeData.productOptionGroupsVoList[this.currentGroupIndex];

      if (!targetGroup.items) targetGroup.items = [];

      if (this.currentItemIndex !== null) {
        targetGroup.items[this.currentItemIndex] = { ...this.currentItem };
      } else {
        targetGroup.items.push({ ...this.currentItem });
      }

      this.displayItemDialog = false;
      this.currentGroupIndex = null;
      this.currentItemIndex = null;
    }
  }

  saveProduct() {
    if (!this.currentProduct.name) return;
    const index = this.storeData.menuVoList.findIndex(p => p.id === this.currentProduct.id);

    if (index > -1) {
      this.storeData.menuVoList[index] = { ...this.currentProduct };
    } else {
      const newProduct = {
        ...this.currentProduct,
        id: Date.now(),
        isAvailable: true
      };
      this.storeData.menuVoList.push(newProduct);
    }
    this.storeData.menuVoList = [...this.storeData.menuVoList];
    this.applyFilters();

    this.displayProductDialog = false;
  }

  // saveProduct() {
  //   console.log(this.currentProduct);
  //   if(!this.currentProduct.name){
  //     return;
  //   }
  //   if(this.currentProduct) {
  //     this.storeData.menuVoList.push({ ...this.currentProduct });
  //     // this.store.menuVoList.push({ ...this.currentProduct }); // 存入假資料
  //     this.displayProductDialog = false;
  //   }
  // }

  // 修改商品 ---------------------------------------------------------
  editProduct(product: MenuVoList) {
    this.isEditMode = true;
    this.currentProduct = { ...product };
    this.onCategoryChange();
    this.displayProductDialog = true;
  }

  // 刪除商品 ---------------------------------------------------------
  deleteProduct(id: number){
    if (!id) {
      this.displayProductDialog = false;
      return;
    }
    this.storeData.menuVoList.splice(id, 1);
  }


  // 存資料庫 ---------------------------------------------------------
  onSaveAll() {
    // if (this.store.id == 0) {
    //   this.http.postApi('http://localhost:8080/store/create', this.storeData)
    //     .subscribe((res: any) => {
    //       console.log("crest store:" + res);
    //     });
    // } else {
    //   this.http.postApi('http://localhost:8080/store/update', this.storeData)
    //     .subscribe((res: any) => {
    //       console.log("update store:" + res);
    //     });
    // }
    this.displaySaveDialog = true;
  }

  // 假資料 ---------------------------------------------------------
  store: Stores = {
    id: 1,
    storesName: "可不可 OKORNOT",
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
        image: "",
        isAvailable: true,
        unusual: ["去冰", "微糖"]
      },
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
    ],
    menuCategoriesVoList: [
      {
        id: 1,
        name: "純茶",
        priceLevel: [
          { "name": "中杯", "price": 0 },
          { "name": "大杯", "price": 10 }
        ]
      },
      {
        id: 2,
        name: "找拿鐵",
        priceLevel: [
          { "name": "中杯", "price": 0 },
          { "name": "大杯", "price": 15 }
        ]
      },
      {
        id: 3,
        name: "醇奶",
        priceLevel: [
          { "name": "中杯", "price": 0 },
          { "name": "大杯", "price": 10 }
        ]
      },
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
}
