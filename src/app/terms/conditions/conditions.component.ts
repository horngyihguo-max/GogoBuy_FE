import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-conditions',
  imports: [],
  templateUrl: './conditions.component.html',
  styleUrl: './conditions.component.scss'
})
export class ConditionsComponent {
  constructor(private viewportScroller: ViewportScroller) {}

  scrollTo(elementId: string): void {
    // 根據 Nav 高度微調
    this.viewportScroller.setOffset([0, 130]);
    this.viewportScroller.scrollToAnchor(elementId);
  }
}
