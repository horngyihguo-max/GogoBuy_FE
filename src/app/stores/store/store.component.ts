import { FeeDescriptionVoList, StoreService } from './../../@service/store.service';
import { Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
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
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Category, Items, MenuCategoriesVoList, MenuVoList, OperatingHoursVoList, ProductOptionGroupsVoList, Stores } from '../../@service/store.service';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';
import { CdkDrag } from '@angular/cdk/drag-drop';

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
    IconFieldModule, InputIconModule, CheckboxModule,
    CdkDrag
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent {

  constructor(
    private http: HttpService,
    private router: Router,
    private route: ActivatedRoute,
    private storeService: StoreService,
  ) { }

  id!: number;

  // 開啟dialog
  displayStoreInfoDialog = false;
  displayCategoriesDialog = false;
  displaySpecsDialog = false;
  displayProductDialog = false;
  displayItemDialog = false;
  displaySaveDialog = false;
  displayDeleteCategories = false;
  displayDeleteSpecs = false;
  displayDeleteProduct = false;
  displayDeleteProductSpec = false;
  displayExistenceSpec = false;

  selectedProduct!: MenuVoList;
  selectedCategoryId: number | null = null;
  selectedIndex: number = -1;

  // 店家詳細資訊
  storeTab: 'info' | 'orderInfo' = 'info';
  indicatorLeft = 0;
  indicatorWidth = 0;

  // 分類
  filteredProducts: MenuVoList[] = [];
  newCategories = '';
  currentCategoryId: number = -1;
  currentCategories: MenuCategoriesVoList = this.getNewCategories();
  editingCategory: any = null;
  editingIndex!: number;
  tempCateTarget!: any;
  tempCateIndex: number = -1;
  newCateId: number = 0;

  // 規格
  editingSpecIndex: number = -1;
  currentGroup: ProductOptionGroupsVoList = this.getNewGroups();
  selectedSpecsCategories: any[] = []; // 分類中的規格有哪些
  filteredSpecsForProduct: any[] = [];
  tempSpecTarget!: any;
  tempSpecIndex: number = -1;
  newSpecId: number = 0;
  newItemId: number = 0

  // 商品
  currentProduct: MenuVoList = this.getNewProduct();
  optionGroups: ProductOptionGroupsVoList = this.getNewGroups();
  currentGroupIndex: number | null = null;
  currentItemIndex: number | null = null;
  currentItem: Items = this.getNewItem();
  tempProductTarget!: any;
  tempProductIndex: number = -1;
  tempProductSpecTarget!: any;
  newPId: number = 0;
  searchKeyword: string = '';

  isEditMode = false;

  // 是否嘗試過提交
  submitted = false;

  // 清空欄位
  getNewProduct(): MenuVoList {
    return {
      id: 0,
      name: '',
      description: '',
      categoryId: 0,
      basePrice: null,
      image: '',
      available: true,
      unusual: {}
    }
  };

  getNewGroups(): ProductOptionGroupsVoList {
    return {
      id: 0,
      name: '',
      required: false,
      maxSelection: null,
      items: [],
      applicableCategoryIds: []
    }
  };

  getNewItem(): Items {
    return {
      id: 0,
      name: '',
      extraPrice: 0
    }
  }

  getNewCategories(): MenuCategoriesVoList {
    return {
      id: 0,
      name: '',
      priceLevel: []
    };
  }

  getApplicableSpecs(item: MenuVoList) {
    if (!item.unusual){
      return;
    }

    const unusualIds = Object.keys(item.unusual).map(id => Number(id));
    return this.storeData.productOptionGroupsVoList.filter(group =>
      unusualIds.includes(group.id) &&
      group.applicableCategoryIds?.includes(item.categoryId)
    );
  }

  // 打包傳進資料庫
  storeData = {
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
    operatingHoursVoList: [] as OperatingHoursVoList[],
    feeDescription: [] as FeeDescriptionVoList[],
    menuVoList: [] as MenuVoList[],
    menuCategoriesVoList: [] as MenuCategoriesVoList[],
    productOptionGroupsVoList: [] as ProductOptionGroupsVoList[]
  }

  @ViewChildren('tabBtn') tabBtns!: QueryList<ElementRef>;

  // session ---------------------------------------------------------
  @HostListener('window:beforeunload')
  onBeforeUnload() {
    this.saveData(); // 在頁面消失前最後一刻存檔
  }

  saveData() {
    sessionStorage.setItem('temp_order_info', JSON.stringify(this.storeData));
  }

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${this.id}`)
      .subscribe((res: any) => {
        console.log("res", res);

        if (res.storeList && res.storeList.length > 0) {
          this.storeData = res.storeList[0];
          this.storeData.menuCategoriesVoList = res.menuCategoriesVoList;
          this.storeData.productOptionGroupsVoList = res.productOptionGroupsVoList;
          this.storeData.operatingHoursVoList = res.operatingHoursVoList.map((item: any) => ({
            ...item,
            openTime: item.openTime?.slice(0, 5),
            closeTime: item.closeTime?.slice(0, 5)
          }));
          this.storeData.feeDescription = res.feeDescriptionVoList;
          this.storeData.menuVoList = res.menuVoList;
          this.filteredProducts = [...this.storeData.menuVoList];
          console.log("storeDatastoreData", this.storeData);
          this.newPId = this.storeData.menuVoList.length + 1;
          this.newSpecId = this.storeData.productOptionGroupsVoList.length + 1;
        }
      });
    this.filteredProducts = [...this.storeData.menuVoList];
    console.log("filteredProductsMenu2:", this.filteredProducts);

    if (this.storeService.storeData && this.storeService.storeData.name !== '') {
      const source = this.storeService.storeData;
      this.storeData = {
        ...this.storeData,
        ...source,
        memo: source.memo ?? '',
      }
    }

    // session 讀取資料
    const savedData = sessionStorage.getItem('temp_order_info');
    if (savedData) {
      this.storeData = JSON.parse(savedData);
      if (this.storeData.menuCategoriesVoList && this.storeData.menuCategoriesVoList.length > 0) {
        const maxId = Math.max(...this.storeData.menuCategoriesVoList.map((c: any) => c.id || 0));
        this.newCateId = maxId;
      } else {
        this.newCateId = 0;
      }
      if (this.storeData.productOptionGroupsVoList && this.storeData.productOptionGroupsVoList.length > 0) {
        const maxId = Math.max(...this.storeData.productOptionGroupsVoList.map((c: any) => c.id || 0));
        this.newSpecId = maxId;
      } else {
        this.newSpecId = 0;
      }
      if (this.storeData.menuVoList && this.storeData.menuVoList.length > 0) {
        const maxId = Math.max(...this.storeData.menuVoList.map((c: any) => c.id || 0));
        this.newPId = maxId;
      } else {
        this.newPId = 0;
      }
    }
    this.applyFilters();
  }

  // 店家資訊 ---------------------------------------------------------
  opendStoreInfo() {
    this.storeTab = 'info'
    this.displayStoreInfoDialog = true;
  }

  editStore(event: Event) {
    this.displayStoreInfoDialog = false;
    event.stopPropagation();
    if (this.id !== 0) {
      this.router.navigate(['../../store_upsert', this.id], { relativeTo: this.route });
    } else {
      this.router.navigate(['../store_upsert'], { relativeTo: this.route });
    }
  }

  // 變數
  get groupedOperatingHours() {
    const grouped = this.storeData.operatingHoursVoList.reduce((acc, curr) => {
      const existing = acc.find(item => item.week === curr.week);
      const timeString = `${curr.openTime} - ${curr.closeTime}`;

      if (existing) {
        existing.times.push(timeString);
      } else {
        acc.push({
          week: curr.week,
          times: [timeString]
        });
      }
      return acc;
    }, [] as { week: number, times: string[] }[]);

    // 星期一到日排序
    return grouped.sort((a, b) => a.week - b.week);
  }

  // 商品分類 ---------------------------------------------------------
  addCategories() {
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

  openCateDelete(target: MenuCategoriesVoList, index: number) {
    this.tempCateTarget = target;
    this.tempCateIndex = index;
    this.displayDeleteCategories = true;
  }

  deleteCategories() {
    const target = this.tempCateTarget;
    const index = this.tempCateIndex;

    if (target.id) {
      this.storeData.menuCategoriesVoList = this.storeData.menuCategoriesVoList.filter(
        item => item.id !== target.id
      );
    } else {
      this.storeData.productOptionGroupsVoList.splice(index, 1);
    }

    this.displayDeleteCategories = false;
    this.tempCateTarget = null;
    this.tempCateIndex = -1;
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
    this.submitted = true;
    const isNameValid = !!this.currentCategories.name?.trim();

    const isPriceLevelValid = this.currentCategories.priceLevel?.every((level: any) =>
      level.name?.trim() && (level.price !== null && level.price !== undefined)
    );

    if (!isNameValid || !isPriceLevelValid) {
      return;
    }

    if (this.isEditMode && this.editingIndex !== -1) {
      this.storeData.menuCategoriesVoList[this.editingIndex] = { ...this.currentCategories };
    } else {
      this.newCateId++;

      const newCategory = {
        ...this.currentCategories,
        id: this.newCateId
      };

      this.storeData.menuCategoriesVoList.push(newCategory);
    }

    this.storeData.menuCategoriesVoList = [...this.storeData.menuCategoriesVoList];
    this.displayCategoriesDialog = false;
    this.currentCategories = this.getNewCategories();

    this.submitted = false;
  }

  selectedCategories(categoryId: number, index: number) {
    this.selectedIndex = index;
    this.selectedCategoryId = categoryId;
    this.currentCategoryId = categoryId;
    this.searchKeyword = '';
    this.applyFilters();
  }

  // 規格 ---------------------------------------------------------
  addSpecs() {
    this.isEditMode = false;
    this.editingSpecIndex = -1;
    this.currentGroup = this.getNewGroups();
    this.selectedSpecsCategories = [];
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
      id: this.newItemId++,
      name: '',
      extraPrice: 0
    });
  }

  removeSpecItem(index: number) {
    this.currentGroup.items.splice(index, 1);
  }

  openDeleteSpec(group: ProductOptionGroupsVoList, index: number) {
    this.tempSpecTarget = group;
    this.tempSpecIndex = index;
    this.displayDeleteSpecs = true;
  }

  deleteSpec() {
    const target = this.tempSpecTarget;
    const index = this.tempSpecIndex;

    if (target.id) {
      this.storeData.productOptionGroupsVoList = this.storeData.productOptionGroupsVoList.filter(
        item => item.id !== target.id
      );
    } else {
      this.storeData.productOptionGroupsVoList.splice(index, 1);
    }

    this.displayDeleteSpecs = false;
    this.tempSpecTarget = null;
    this.tempSpecIndex = -1;
  }

  isCateSelected(cate: any): boolean {
    if (!this.selectedSpecsCategories || this.selectedSpecsCategories.length === 0) {
      return false;
    }
    return this.selectedSpecsCategories.some(selected => selected.name === cate.name);
  }

  saveSpec() {
    this.submitted = true;
    const isNameValid = !!this.currentGroup.name?.trim();
    const isMaxValid = this.currentGroup.maxSelection !== null && this.currentGroup.maxSelection !== undefined;
    const areItemsValid = this.currentGroup.items.every((item: any) => !!item.name?.trim());

    if (!isNameValid || !isMaxValid || !areItemsValid) {
      return;
    }

    this.currentGroup.applicableCategoryIds = this.selectedSpecsCategories.map(cate => cate.id);

    if (this.isEditMode && this.editingSpecIndex > -1) {
      this.storeData.productOptionGroupsVoList = this.storeData.productOptionGroupsVoList.map((g, i) =>
        i === this.editingSpecIndex ? { ...this.currentGroup } : g
      );
    } else {
      this.newSpecId++;
      const newSpec = { ...this.currentGroup, id: this.newSpecId };

      this.storeData.productOptionGroupsVoList = [
        ...this.storeData.productOptionGroupsVoList, newSpec
      ];
    }

    this.displaySpecsDialog = false;
    this.currentGroup = this.getNewGroups();
    this.isEditMode = false;
    this.editingSpecIndex = -1;
    this.submitted = false;
  }

  // search ---------------------------------------------------------
  applyFilters() {
    let results = this.storeData.menuVoList;

    if (this.selectedCategoryId !== null && this.selectedCategoryId !== -1) {
      results = results.filter(p => p.categoryId === this.selectedCategoryId);
    }

    const keyword = this.searchKeyword.trim().toLowerCase();
    if (keyword) {
      results = results.filter(p =>
        p.name?.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword)
      );
    }

    this.filteredProducts = results;
  }

  // 新增商品 ---------------------------------------------------------
  openNewProduct() {
    this.isEditMode = false;
    const defaultCategoryId = this.storeData.menuCategoriesVoList.length > 0
      ? this.storeData.menuCategoriesVoList[0].id
      : null as any as number;

    this.currentProduct = {
      id: 0,
      name: '',
      description: '',
      basePrice: 0,
      categoryId: defaultCategoryId, // 設定正確的預設 ID (例如 60)
      image: '',
      available: true,
      unusual: {}
    };
    this.displayProductDialog = true;
  }

  // 商品圖片
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

  // 新增商品時 選擇category 帶入 optionGroup ---------------------------------
  onCategoryChange() {
    const selectedId = this.currentProduct.categoryId;
    if (!selectedId) {
      this.filteredSpecsForProduct = [];
      this.currentProduct.unusual = {};
      return;
    }
    this.filteredSpecsForProduct = this.storeData.productOptionGroupsVoList.filter(spec =>
      spec.applicableCategoryIds?.includes(selectedId)
    );

    const autoSelectSpec = this.filteredSpecsForProduct.reduce((acc, spec) => {
      if (spec.id) {
        acc[spec.id.toString()] = 'true';
      }
      return acc;
    }, {} as { [key: string]: string });

    this.currentProduct.unusual = autoSelectSpec;
  }

  // 單一商品的規格配置 ---------------------------------------------------------
  openExistenceSpec() {
    this.displayExistenceSpec = true;
  }

  openProductSpecDelete(group: any) {
    this.tempProductSpecTarget = group;
    this.displayDeleteProductSpec = true;
  }

  removeProductSpecs() {
    if (!this.tempProductSpecTarget) return;

    const id = this.tempProductSpecTarget.id.toString();

    if (this.currentProduct.unusual && this.currentProduct.unusual[id]) {
      const { [id]: _, ...rest } = this.currentProduct.unusual; // _是變數
      this.currentProduct.unusual = rest;
    }

    this.displayDeleteProductSpec = false;
    this.tempProductSpecTarget = null;
  }

  // 變數
  get filteredOptionGroups() {
    if (!this.currentProduct.categoryId) {
      return []
    }
    return this.storeData.productOptionGroupsVoList.filter(group => {
      return group.applicableCategoryIds?.includes(this.currentProduct.categoryId)
    })
  }

  openItemDialog(groupIndex: number, itemIndex: number | null = null) {
    this.currentGroupIndex = groupIndex;
    this.currentItemIndex = itemIndex;
    if (itemIndex !== null) {
      const targetItem = this.storeData.productOptionGroupsVoList[groupIndex].items[itemIndex];
      this.currentItem = { ...targetItem };
    } else {
      this.currentItem = this.getNewItem();
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
    console.log('當前分類 ID:', this.currentProduct.categoryId);
    this.submitted = true;
    const isNameValid = !!this.currentProduct.name?.trim();
    const isCategoryValid = !!this.currentProduct.categoryId;
    const isPriceValid = this.currentProduct.basePrice !== null && this.currentProduct.basePrice !== undefined;

    if (!isNameValid || !isCategoryValid || !isPriceValid) {
      return;
    }

    // 若未符合 p.id === this.currentProduct.id ， 那 index = -1
    const index = this.storeData.menuVoList.findIndex(p => p.id === this.currentProduct.id);

    this.currentProduct.unusual = this.currentProduct.unusual ? { ...this.currentProduct.unusual } : {};

    if (index > -1) {
      this.storeData.menuVoList = this.storeData.menuVoList.map((p, i) =>
        i === index ? { ...this.currentProduct } : p
      );
    } else {
      this.newPId++;
      const newProduct = { ...this.currentProduct, id: this.newPId, storesId: this.storeData.id };
      this.storeData.menuVoList = [...this.storeData.menuVoList, newProduct];
    }

    console.log("this.storeData.menuVoList", this.storeData.menuVoList);

    this.sortProduct();
    this.displayProductDialog = false;
    this.submitted = false;
  }

  // 修改商品 ---------------------------------------------------------
  editProduct(product: MenuVoList) {
    this.isEditMode = true;
    this.currentProduct = { ...product };
    console.log("this.currentProduct", this.currentProduct);

    this.onCategoryChange();
    this.displayProductDialog = true;
  }

  // 刪除商品 ---------------------------------------------------------
  openDeleteProduct(traget: MenuVoList, index: number) {
    this.tempProductTarget = traget;
    this.tempProductIndex = index;
    this.displayDeleteProduct = true;
  }

  deleteProduct() {
    const target = this.tempProductTarget;
    const index = this.tempProductIndex;

    if (target.id) {
      this.storeData.menuVoList = this.storeData.menuVoList.filter(
        item => item.id !== target.id
      );
    } else {
      this.storeData.menuVoList.splice(index, 1);
    }

    this.applyFilters();

    this.displayDeleteProduct = false;
    this.tempProductTarget = null;
    this.tempProductIndex = -1;
  }

  // 商品列排序 ---------------------------------------------(已不需要
  onStatusChange() {
    setTimeout(() => {
      this.sortProduct();
    }, 200);
  }

  sortProduct() {
    this.storeData.menuVoList.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      return b.id - a.id;
    })
    this.storeData.menuVoList = [...this.storeData.menuVoList];
    this.applyFilters();
  }

  // 存資料庫 ---------------------------------------------------------
  onSaveAll() {
    if (this.storeData.id == 0) {
      const payload = {
        storesname: this.storeData.name,
        phone: this.storeData.phone,
        address: this.storeData.address,
        category: this.storeData.category,
        type: this.storeData.type,
        memo: this.storeData.memo,
        image: this.storeData.image,
        publish: this.storeData.publish,
        createdBy: 'A01',
        operatingHoursVoList: this.storeData.operatingHoursVoList,
        fee_description: this.storeData.feeDescription,
        menuVoList: this.storeData.menuVoList,
        menuCategoriesVoList: this.storeData.menuCategoriesVoList,
        productOptionGroupsVoList: this.storeData.productOptionGroupsVoList
      }
      console.log("payload(create):", payload);
      this.http.postApi('http://localhost:8080/gogobuy/store/create', payload)
        .subscribe((res: any) => {
          console.log("create store:" + res);
        });
    } else {
      const payload = {
        ...this.storeData, storesname: this.storeData.name, fee_description: this.storeData.feeDescription,
        createdBy: 'SystemManager',
      }
      console.log("payload(update):", payload);

      this.http.postApi(`http://localhost:8080/gogobuy/store/update?id=${this.storeData.id}`, payload)
        .subscribe((res: any) => {
          console.log("update store:", res);
        });
    }
    this.storeService.clearCurrentStore();
    // this.displaySaveDialog = true;
    sessionStorage.removeItem('temp_order_info');
  }

  closeSaveDialog() {
    this.displaySaveDialog = false;
    this.router.navigate(['../../store_info', this.id]);
  }

  // 假資料 ---------------------------------------------------------
  // store: Stores = {
  //   id: 1,
  //   name: "可不可 OKORNOT",
  //   phone: "0988777666",
  //   address: "台南市歸仁區中正南路1001號",
  //   category: "餐飲",
  //   type: "手搖飲",
  //   memo: "外送請提前一小時訂購",
  //   image: "okornot.png",
  //   feeDescription: [
  //     { km: 1.0, fee: 20 },
  //     { km: 5.0, fee: 50 }
  //   ],
  //   publish: true,
  //   createdBy: "UUID",
  //   operatingHoursVoList: [
  //     { week: 1, openTime: "10:00", closeTime: "22:00" },
  //     { week: 2, openTime: "10:00", closeTime: "22:00" },
  //     { week: 3, openTime: "10:00", closeTime: "22:00" },
  //     { week: 4, openTime: "10:00", closeTime: "22:00" },
  //     { week: 5, openTime: "10:00", closeTime: "23:00" }
  //   ],
  //   menuVoList: [
  //     {
  //       id: 1,
  //       categoryId: 1,
  //       name: "經典紅玉",
  //       description: "嚴選紅玉紅茶",
  //       basePrice: 35,
  //       image: "",
  //       available: true,
  //       unusual: { "去冰": "微糖" }
  //     },
  //     {
  //       id: 2,
  //       categoryId: 2,
  //       name: "波霸紅茶拿鐵",
  //       basePrice: 45,
  //       description: "濃醇紅茶融合香濃鮮奶，搭配Q彈波霸，口感層次豐富、甜而不膩。",
  //       image: "blackMilk.jpeg",
  //       available: true,
  //       unusual: { '1': 'true' }
  //     }, {
  //       id: 3,
  //       categoryId: 2,
  //       name: "阿華田拿鐵",
  //       basePrice: 50,
  //       description: "香濃阿華田巧克力融合鮮奶，口感滑順，甜而不膩，暖心提神飲品。",
  //       image: "chocolate.jpeg",
  //       available: true,
  //       unusual: { '1': 'true' }
  //     }
  //   ],
  //   menuCategoriesVoList: [
  //     {
  //       id: 1,
  //       name: "純茶",
  //       priceLevel: [
  //         { "name": "中杯", "price": 0 },
  //         { "name": "大杯", "price": 10 }
  //       ]
  //     },
  //     {
  //       id: 2,
  //       name: "找拿鐵",
  //       priceLevel: [
  //         { "name": "中杯", "price": 0 },
  //         { "name": "大杯", "price": 15 }
  //       ]
  //     },
  //     {
  //       id: 3,
  //       name: "醇奶",
  //       priceLevel: [
  //         { "name": "中杯", "price": 0 },
  //         { "name": "大杯", "price": 10 }
  //       ]
  //     },
  //   ],
  //   productOptionGroupsVoList: [
  //     {
  //       id: 1,
  //       name: "甜度",
  //       required: true,
  //       maxSelection: 1,
  //       items: [
  //         { id: 1, name: "無糖", extraPrice: 0 },
  //         { id: 2, name: "半糖", extraPrice: 0 },
  //         { id: 3, name: "全糖", extraPrice: 0 }
  //       ]
  //     },
  //     {
  //       id: 2,
  //       name: "加配料",
  //       required: false,
  //       maxSelection: 2,
  //       items: [
  //         { id: 1, name: "黑糖珍珠", extraPrice: 10 },
  //         { id: 2, name: "仙草凍", extraPrice: 5 }
  //       ]
  //     }
  //   ]
  // }
}
