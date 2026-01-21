//佔位用訂單，沒有實際作用(未來接訂單API要重寫，因為欄位是假的)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

/* PrimeNG <p-tag> 支援的 severity 類型 */
type TagSeverity = 'info' | 'success' | 'warn' | 'danger' | 'primary' | 'contrast';

/* 假資料格式 */
type OrderItem = {
  name: string;
  qty: number;
  price: number;
  note?: string;
};

/* 假資料格式 */
type Order = {
  code: string;
  storeName: string;
  createdAt: Date;
  statusLabel: string;
  total: number;
  receiverName: string;
  phone: string;
  items: OrderItem[];
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    AccordionModule,
    TagModule,
    ButtonModule
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})

/* 假資料 */
export class OrdersComponent {
  activeOrders: Order[] = [
    {
      code: 'A001',
      storeName: '50嵐',
      createdAt: new Date(),
      statusLabel: '進行中',
      total: 120,
      receiverName: '王小明',
      phone: '0912-345-678',
      items: [
        { name: '珍珠奶茶', qty: 1, price: 60, note: "去冰" },
        { name: '烏龍奶茶', qty: 1, price: 60, note: "" }
      ]
    }
  ];

  historyOrders: Order[] = [
    {
      code: 'H001',
      storeName: '可不可',
      createdAt: new Date(),
      statusLabel: '已完成',
      total: 75,
      receiverName: '王小明',
      phone: '0912-345-678',
      items: [{ name: '熟成紅茶', qty: 1, price: 75 }]
    }
  ];

  // 展開狀態（用 code 當 key）
  activeOpenValues: string[] = [];
  historyOpenValues: string[] = [];

  /* 用來控制狀態標籤的顏色 */
  getStatusSeverity(status: string): 'info' | 'success' | 'danger' | 'warn' | undefined {
    const statusMap: Record<string, 'info' | 'success' | 'danger' | 'warn'> = {
      '進行中': 'info',
      '已完成': 'success',
      '已取消': 'danger'
    };
    return statusMap[status] || 'warn';
  }

}
