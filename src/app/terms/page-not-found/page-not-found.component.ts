import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  imports: [],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss'
})
export class PageNotFoundComponent {
  constructor(private router: Router) { }

  // 導向首頁
  goHome() {
    this.router.navigate(['/gogobuy']);
  }

  // 導向 FAQ 頁面
  goSupport() {
    this.router.navigate(['/support/faq']);
  }
}
