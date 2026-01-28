import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';

export interface orders {
  id: number;
  events_id: number;
  user_id: string;
  menu_id: number;
  quantity: number;
  selected_option: string;
  personal_memo: string;
  order_time: Date;
  pickup_status: string;
  pickup_time: Date;
  subtotal: number;
  weight: number;
  is_deleted: boolean;
};

const fakeOrder: orders = {
  id: 1,
  events_id: 1001,
  user_id: "user_abc123",
  menu_id: 25,
  quantity: 2,
  selected_option: "少糖 / 去冰",
  personal_memo: "請幫我分開包裝，謝謝",
  order_time: new Date("2026-01-28T10:30:00"),
  pickup_status: "pending", // pending / picked_up / cancelled 之類
  pickup_time: new Date("2026-01-28T12:00:00"),
  subtotal: 180,
  weight: 0.75,
  is_deleted: false
};


@Component({
  selector: 'app-order-info',
  imports: [
    StepsModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.scss'
})
export class OrderInfoComponent implements OnInit {
  items: MenuItem[] | undefined;

  activeIndex: number = 0;

  constructor(
    public messageService: MessageService,
    public router: Router,
  ) { }

  ngOnInit() {
    this.items = [
      {
        label: 'Personal',
      },
      {
        label: 'Payment',
      },
      {
        label: 'Confirmation',
      }
    ];
  }

  get progressRatio(): number {
    const n = this.items?.length ?? 0;
    if (n <= 1) return 0;
    return this.activeIndex / (n - 1); // 0~1
  }



  // 返回購物車
  backtocart() {
    this.router.navigate(['/user/cart'])
  }
  // 返回繼續購物
  gotoshop() {

  }

  // 前往下一個Step
  nextStep() {
    const max = (this.items?.length ?? 1) - 1;
    this.activeIndex = Math.min(this.activeIndex + 1, max);
  }

  // 返回前一個Step
  prevStep() {
    this.activeIndex = Math.max(this.activeIndex - 1, 0);
  }

}
