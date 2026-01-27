import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';

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
        label: 'Seat',
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
