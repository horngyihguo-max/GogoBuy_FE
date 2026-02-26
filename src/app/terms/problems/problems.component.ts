import { Component } from '@angular/core';

@Component({
  selector: 'app-problems',
  imports: [],
  templateUrl: './problems.component.html',
  styleUrl: './problems.component.scss'
})
export class ProblemsComponent {
  // FAQ 樣本資料
  faqs: FaqItem[] = [
    {
      category: '購物流程',
      question: '什麼是「未達成團目標」？如果沒成團會退款嗎？',
      answer: '每一團購商品都有預設的「最低成團人數或數量」。若在限定時間內未達標，該團將自動取消。系統會於 3 個工作天內將款項全額退回至您的原付款帳戶，不收取任何手續費。',
      isOpen: false
    },
    {
      category: '付款問題',
      question: 'GogoBuy 支援哪些付款方式？',
      answer: `我們支援：
      1. 信用卡線上刷卡（支援各大銀行）
      2. LINE Pay
      3. ATM 轉帳
      4. 超商代碼繳費。`,
      isOpen: false
    },
    {
      category: '配送與運費',
      question: '下單後多久可以收到商品？',
      answer: '團購商品通常在「結團後」才開始配送。一般情況下，結團後約 3-7 個工作天內出貨，具體時間請參考各商品頁面的「預計出貨日」。',
      isOpen: false
    },
    {
      category: '售後服務',
      question: '收到商品發現瑕疵怎麼辦？',
      answer: '請於收貨後 24 小時內拍攝瑕疵照片或影片，並透過「聯絡客服」功能傳送給我們。我們會儘速為您辦理退換貨程序。',
      isOpen: false
    },
    {
      category: '帳號相關',
      question: '可以更改已經下單的收件地址嗎？',
      answer: '只要該團尚未「結團」，您都可以前往「訂單查詢」中修改收件資料。若已結團並進入出貨流程，請立即聯繫線上客服尋求協助。',
      isOpen: false
    }
  ];

  // 切換摺疊狀態
  toggleFaq(item: FaqItem) {
    item.isOpen = !item.isOpen;
  }

  ngAfterViewInit() {
    // 檢查是否有從 router 傳過來的 state
    if (history.state?.scrollToBottom) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    // 使用 setTimeout 確保 DOM 渲染與佈局計算完成
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth' // 加入平滑捲動效果
      });
    }, 100); // 如果您的頁面有非同步 API 載入，這裡的時間可以稍微加長
  }

}

interface FaqItem {
  category: string;
  question: string;
  answer: string;
  isOpen: boolean;
}
