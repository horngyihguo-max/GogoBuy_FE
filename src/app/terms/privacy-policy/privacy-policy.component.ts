import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  imports: [],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent {
  constructor(private viewportScroller: ViewportScroller) {}

  // 簡單的捲動邏輯
  scrollTo(elementId: string): void {
    // 設定偏移量（補償上方固定導航欄的高度）
    this.viewportScroller.setOffset([0, 80]);
    this.viewportScroller.scrollToAnchor(elementId);
  }

}
