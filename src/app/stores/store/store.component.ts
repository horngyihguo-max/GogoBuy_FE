import { FeeDescriptionVoList, StoreService } from './../../@service/store.service';
import { Component, ElementRef, HostListener, QueryList, ViewChild, ViewChildren } from '@angular/core';
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
import Swal from 'sweetalert2';
import { ImageService } from '../../@service/image.service';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-store',
  imports: [
    StepperModule, ToggleSwitchModule,
    FormsModule, SplitterModule,
    ImageModule, ButtonModule,
    InputTextModule, ScrollPanelModule,
    TableModule, SelectButtonModule, CommonModule,
    DialogModule, ButtonModule,
    InputGroupModule, InputGroupAddonModule, FloatLabelModule,
    InputNumberModule, SelectModule, InputTextModule,
    IconFieldModule, InputIconModule, CheckboxModule,
    FileUploadModule, ToastModule
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
    private imageService: ImageService,
  ) { }

  id!: number;
  userId = '';
  wishId!: number;

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
  displayUnableDelete = false;
  displayUnableDeleteSpec = false;
  displayPublishConfirm = false
  displaySaveFailedDialog = false;

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

  // 加入現有規格 dialog 暫存勾選的規格
  selectSpecs: ProductOptionGroupsVoList[] = [];
  // 給 加入現有規格 dialog 顯示用的
  availableSpec: ProductOptionGroupsVoList[] = [];

  isEditMode = false;

  // 是否嘗試過提交
  submitted = false;

  // res.message
  resMessage!: string;

  // loading
  loading: boolean = false;

  // 清空欄位
  getNewProduct(): MenuVoList {
    return {
      id: 0,
      name: '',
      description: '',
      categoryId: null,
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
      priceLevel: [],
    };
  }

  getApplicableSpecs(item: MenuVoList) {
    if (!item.unusual) {
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
    publish: true,
    createdBy: this.userId,
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
    this.userId = String(localStorage.getItem('user_id') || '');
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.wishId = this.storeService.wishId;

    if (this.id !== 0) {
      this.http.getApi(`http://localhost:8080/gogobuy/store/searchId?id=${this.id}`)
        .subscribe((res: any) => {
          console.log('res', res);

          if (res.storeList && res.storeList.length > 0) {
            this.storeData.menuCategoriesVoList = res.menuCategoriesVoList;
            this.storeData.productOptionGroupsVoList = res.productOptionGroupsVoList;
            this.storeData.menuVoList = res.menuVoList.map((product: any) => {
              if (Array.isArray(product.unusual) && product.unusual.length > 0) {
                // 將 [{124: '湯頭'}, {125: '麵條'}] 合併成 {124: '湯頭', 125: '麵條'}
                product.unusual = product.unusual.reduce((acc: any, curr: any) => {
                  return { ...acc, ...curr };
                }, {});
              } else if (!product.unusual) {
                product.unusual = {};
              }
              return product;
            });
            this.rebuildApplicableCategoryIds();
            this.filteredProducts = [...this.storeData.menuVoList];
            console.log('filteredProducts(res)', this.filteredProducts);
            this.newPId = this.storeData.menuVoList.length + 1;
            this.newSpecId = this.storeData.productOptionGroupsVoList.length + 1;
            this.newCateId = this.storeData.menuCategoriesVoList.length + 1;
          }
        });
    }

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
    this.rebuildApplicableCategoryIds();
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

  // 變數 星期一 10:00-13:00 , 15:00-20:00
  get groupedOperatingHours() {
    const grouped = [] as { week: number, times: string[] }[];

    this.storeData.operatingHoursVoList.forEach(item => {
      const timeString = `${item.openTime} - ${item.closeTime}`;
      const weeks = Array.isArray(item.week) ? item.week : [item.week];

      weeks.forEach(w => {
        const existing = grouped.find(g => g.week === w);
        if (existing) {
          existing.times.push(timeString);
        } else {
          grouped.push({ week: w, times: [timeString] });
        }
      });
    });

    // 星期一到星期日排序
    return grouped.sort((a, b) => a.week - b.week);
  }



  // 營業時間 轉換 從
  normalizeOperatingHours(): OperatingHoursVoList[] {
    const result: OperatingHoursVoList[] = [];

    this.storeData.operatingHoursVoList.forEach(item => {
      if (Array.isArray(item.week)) {
        item.week.forEach(w => {
          result.push({
            week: w,
            openTime: item.openTime,
            closeTime: item.closeTime
          });
        });
      } else {
        result.push(item);
      }
    });
    return result;
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
      const hasLinkProduct = this.storeData.menuVoList.some(
        product => product.categoryId === target.id)

      if (hasLinkProduct) {
        this.displayDeleteCategories = false;
        this.displayUnableDelete = true;
        return;
      }
    };

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

  UnableDelete() {
    this.displayUnableDelete = false;
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

    const e = this.storeData.menuCategoriesVoList.find(c => c.name === this.currentCategories.name)
    if (e && !this.isEditMode) {
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
    this.currentGroup = JSON.parse(JSON.stringify(spec));
    console.log('currentGroup', this.currentGroup);


    if (this.currentGroup.applicableCategoryIds) {
      this.selectedSpecsCategories = this.storeData.menuCategoriesVoList!.filter(cate =>
        this.currentGroup.applicableCategoryIds!.includes(cate.id)
      );
    } else {
      this.selectedSpecsCategories = [];
    }

    this.newItemId = Math.max(0, ...this.currentGroup.items.map(i => i.id || 0)) + 1;
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

    if (!target) {
      return;
    }
    if (target.id) {
      const hasLinkProduct = this.storeData.menuVoList.some(product =>
        product.unusual && product.unusual[target.id]
      );

      if (hasLinkProduct) {
        this.displayDeleteSpecs = false;
        this.displayUnableDeleteSpec = true;
        return;
      }
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
    if (!this.selectedSpecsCategories || !cate) {
      return false;
    }
    return this.selectedSpecsCategories.some(selected => selected.id === cate.id);
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
    console.log('OptionGroupsVoList', this.storeData.productOptionGroupsVoList);

    this.displaySpecsDialog = false;
    this.currentGroup = this.getNewGroups();
    this.isEditMode = false;
    this.submitted = false;
    this.editingSpecIndex = -1;
  }

  rebuildApplicableCategoryIds() {
    const groups = this.storeData.productOptionGroupsVoList;
    const menus = this.storeData.menuVoList;

    if (!groups || !menus) return;

    groups.forEach(g => g.applicableCategoryIds = []);

    menus.forEach(menu => {
      if (!menu.unusual) return;

      Object.keys(menu.unusual).forEach(specIdStr => {
        const specId = Number(specIdStr);
        const specGroup = groups.find(g => g.id === specId);

        if (specGroup) {
          if (!specGroup.applicableCategoryIds) specGroup.applicableCategoryIds = [];
          if (!specGroup.applicableCategoryIds.includes(menu.categoryId)) {
            specGroup.applicableCategoryIds.push(menu.categoryId);
          }
        }
      });
    });
  }

  getApplicableSpecsForCategory(categoryId: number): ProductOptionGroupsVoList[] {
    return this.storeData.productOptionGroupsVoList.filter(group =>
      group.applicableCategoryIds?.includes(categoryId)
    );
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
    console.log('filteredProducts', this.filteredProducts);

  }

  // 新增商品 ---------------------------------------------------------
  openNewProduct() {
    this.isEditMode = false;

    this.currentProduct = this.getNewProduct();
    this.displayProductDialog = true;

  }

  // 商品圖片
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
    const oldAvatar = this.currentProduct.image;
    this.currentProduct.image = localPreview;

    this.toastWarn('上傳中...', '請稍候');
    this.imageService.upload('stores', file).subscribe({
      next: (res) => {

        this.currentProduct.image = res;

        this.toastSuccess('上傳成功', '');
        input.value = '';
      },
      error: (err) => {
        console.error(err);
        this.currentProduct.image = oldAvatar;

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

  toastWarn(title: string, text: string): void {
    Swal.fire({
      icon: 'warning',
      title,
      text,
      timer: 1200,
      showConfirmButton: false,
      didOpen: () => {
        const c = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }

  toastSuccess(title: string, text: string): void {
    Swal.fire({
      icon: 'success',
      title,
      text,
      timer: 1000,
      showConfirmButton: false,
      didOpen: () => {
        const c = document.querySelector(
          '.swal2-container',
        ) as HTMLElement | null;
        if (c) c.style.zIndex = '20000';
      },
    });
  }

  removeImage(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.currentProduct.image = '';
  }

  // 新增商品時 選擇category 帶入 optionGroup ---------------------------------
  onCategoryChange() {
    const selectedId = this.currentProduct.categoryId;
    this.filteredSpecsForProduct = [];

    if (!selectedId) {
      this.currentProduct.unusual = {};
      return;
    }

    this.filteredSpecsForProduct = this.storeData.productOptionGroupsVoList.filter(spec =>
      spec.applicableCategoryIds?.includes(selectedId)
    );

    if (!this.isEditMode) {
      if (!this.isEditMode) {
        // 將所有符合的 spec 組合進同一個物件中，而不是變成陣列
        const updatedUnusual: { [key: string]: string } = {};
        this.filteredSpecsForProduct.forEach(spec => {
          updatedUnusual[spec.id.toString()] = spec.name;
        });

        this.currentProduct.unusual = updatedUnusual;
      }
    }
  }




  // 單一商品的規格配置 ---------------------------------------------------------
  openExistenceSpec() {
    this.selectSpecs = [];
    const existingIds = Object.keys(this.currentProduct.unusual || {});
    this.availableSpec = this.storeData.productOptionGroupsVoList.filter(
      spec => !existingIds.includes(spec.id.toString())
    );
    this.displayExistenceSpec = true;
  }

  toggleSpecSelect(spec: ProductOptionGroupsVoList) {
    const index = this.selectSpecs.findIndex(s => s.id === spec.id);
    if (index > -1) {
      this.selectSpecs = this.selectSpecs.filter(s => s.id !== spec.id);
    } else {
      this.selectSpecs = [...this.selectSpecs, spec];
    }
  }

  // 一鍵套用規格
  selectAllSpecs() {
    const existingIds = Object.keys(this.currentProduct.unusual || {});
    this.selectSpecs = this.storeData.productOptionGroupsVoList.filter(
      spec => !existingIds.includes(spec.id.toString())
    );
  }

  applySelectedSpecs() {
    if (this.selectSpecs.length > 0) {
      if (!this.currentProduct.unusual) {
        this.currentProduct.unusual = {};
      }

      this.selectSpecs.forEach(spec => {
        const specIdStr = spec.id.toString();
        if (!this.currentProduct.unusual![specIdStr]) {
          this.currentProduct.unusual![specIdStr] = spec.name;
          if (!this.filteredOptionGroups.some(g => g.id === spec.id)) {
            this.filteredOptionGroups.push(spec);
          }
        }
      });
    }
    this.displayExistenceSpec = false;
  }

  isSpecSelected(specId: any): boolean {
    if (!this.selectSpecs || this.selectSpecs.length == 0) {
      return false;
    }
    return this.selectSpecs.some(s => s.id === specId);
  }

  openProductSpecDelete(group: any) {
    this.tempProductSpecTarget = group;
    this.displayDeleteProductSpec = true;
  }

  removeProductSpecs() {
    if (!this.tempProductSpecTarget) return;

    const id = this.tempProductSpecTarget.id.toString();

    if (this.currentProduct.unusual && this.currentProduct.unusual[id]) {
      const { [id]: _, ...rest } = this.currentProduct.unusual;
      this.currentProduct.unusual = rest;
    }

    this.displayDeleteProductSpec = false;
    this.tempProductSpecTarget = null;
  }

  // 變數
  get filteredOptionGroups() {
    if (!this.currentProduct.unusual) return [];

    const ids = Object.keys(this.currentProduct.unusual).map(Number);

    return this.storeData.productOptionGroupsVoList.filter(group =>
      ids.includes(group.id)
    );
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

    this.sortProduct();
    this.displayProductDialog = false;
    this.submitted = false;
  }

  // 修改商品 ---------------------------------------------------------
  editProduct(product: MenuVoList) {
    this.isEditMode = true;
    this.currentProduct = { ...product };

    console.log('currentProduct(上)', this.currentProduct);
    this.currentProduct.unusual = this.currentProduct.unusual ? { ...this.currentProduct.unusual } : {};

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

  // 商品分類滾動效果
  @ViewChild('categoryNav') categoryNav!: ElementRef;
  scrollNav(distance: number) {
    this.categoryNav.nativeElement.scrollBy({
      left: distance,
      behavior: 'smooth'
    });
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

  // 最下面按鈕 ---------------------------------------------------------
  goBack() {
    if (this.id && this.id !== 0) {
      this.router.navigate(['/management/store_upsert', this.id]);
    } else {
      this.router.navigate(['/management/store_upsert']);
    }

  }

  openPublic() {
    if (this.id === 0) {
      this.displayPublishConfirm = true;
    } else {
      this.onSaveAll();
    }
  }

  // 存資料庫 ---------------------------------------------------------
  async onSaveAll() {
    this.displayPublishConfirm = false;
    this.loading = true;
    const transformUnusual = (unusual: any) => {
      if (!unusual || Object.keys(unusual).length === 0) {
        return [];
      }
      if (Array.isArray(unusual) && unusual.length > 1) {
        return unusual;
      }
      const targetObj = Array.isArray(unusual) ? unusual[0] : unusual;

      return Object.entries(targetObj).map(([key, value]) => ({
        [key]: value
      }));
    }
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
        createdBy: this.userId,
        operatingHoursVoList: this.normalizeOperatingHours(),
        fee_description: this.storeData.feeDescription,
        menuCategoriesVoList: this.storeData.menuCategoriesVoList.map(category => ({
          name: category.name,
          priceLevel: category.priceLevel,
          menuVo: this.storeData.menuVoList.filter(item => item.categoryId === category.id)
            .map(product => ({
              ...product,
              unusual: transformUnusual(product.unusual)
            }))
        })),
        productOptionGroupsVoList: this.storeData.productOptionGroupsVoList
      }
      console.log("payload(create):", payload);
      this.http.postApi('http://localhost:8080/gogobuy/store/create', payload)
        .subscribe({
          next: (res: any) => {
            console.log("create store:", res);
            if (res.code === 200) {

              this.http.getApi('http://localhost:8080/gogobuy/store/all').subscribe((all: any) => {
                const myStores = all.storeList.filter((s: any) => s.createdBy === this.userId);
                if (myStores && myStores.length > 0) {
                  const latestStore = myStores.reduce((prev: any, current: any) => (prev.id > current.id) ? prev : current);
                  this.id = latestStore.id;
                  this.afterSaveSuccess();
                } else {
                  this.router.navigate(['gogobuy/home']);
                }
              });
            } else {
              this.loading = false;
              this.resMessage = res.message;
              this.displaySaveFailedDialog = true;
            }
          },
          error: () => {
            this.loading = false;
          },
          complete: () => {
            this.loading = false;
          }
        });
    } else {
      const payload = {
        ...this.storeData, storesname: this.storeData.name,
        phone: this.storeData.phone,
        address: this.storeData.address,
        category: this.storeData.category,
        type: this.storeData.type,
        memo: this.storeData.memo,
        image: this.storeData.image,
        publish: this.storeData.publish,
        createdBy: this.userId,
        operatingHoursVoList: this.normalizeOperatingHours(),
        fee_description: this.storeData.feeDescription,
        menuCategoriesVoList: this.storeData.menuCategoriesVoList.map(category => ({
          name: category.name,
          priceLevel: category.priceLevel,
          menuVo: this.storeData.menuVoList.filter(item => item.categoryId === category.id)
            .map(product => ({
              ...product,
              unusual: (Array.isArray(product.unusual) || !product.unusual || Object.keys(product.unusual).length === 0)
                ? null : [product.unusual]
            }))
        })),
        productOptionGroupsVoList: this.storeData.productOptionGroupsVoList
      }
      console.log("payload(update):", payload);

      this.http.postApi(`http://localhost:8080/gogobuy/store/update?id=${this.storeData.id}`, payload)
        .subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              console.log("update store:", res);
              this.id = this.storeData.id;
              this.loading = false;
              this.afterSaveSuccess();
            } else {
              this.resMessage = res.message;
              this.displaySaveFailedDialog = true;
            }
          },
        });
    }

  }

  private afterSaveSuccess() {
    this.displaySaveDialog = true;
    this.storeService.clearCurrentStore();
    sessionStorage.removeItem('temp_order_info');
  }

  closeSaveDialog() {
    this.displaySaveDialog = false;
    if (!this.wishId) {
      this.router.navigate(['/management/store_info', this.id]);
    } else {
      this.router.navigate(['/groupbuy-event/group-event', this.id], {
        queryParams: { wish_id: this.wishId }
      });
    }
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
