import { Component, OnInit } from '@angular/core';
import { HttpService } from '../../@service/http.service';
import { AuthService } from '../../@service/auth.service';
import { TabsModule } from 'primeng/tabs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-wishes',
  imports: [CommonModule, TabsModule, FormsModule],
  templateUrl: './wishes.component.html',
  styleUrl: './wishes.component.scss',
})
export class WishesComponent {
  constructor(
    private http: HttpService,
    private sanitizer: DomSanitizer,   // 標記安全HTML
    public auth: AuthService
  ) {}

  wishes: any[] = [];
  ngOnInit(){
    // 全部願望清單
    // this.http.getApi('http://localhost:8080/gogobuy/all_wishes').subscribe((res:any)=>{
    //   this.wishes = res.allWish;
    // });
    this.wishes= [
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "五十嵐",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "五十嵐",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "五十嵐****************************",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%五十嵐",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
      },
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "五十嵐",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      },
      {
          "id": 2,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": "小林",
          "title": "五十嵐",
          "followers": [],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓#############################"
      },
      {
          "id": 3,
          "user_id": "5274e1a0-40cd-4e2b-9528-a3779e2f84a6",
          "nickname": null,
          "title": "五十嵐",
          "followers": [
              "74db5f21-f331-4824-853b-0be13d633c80",
              "12b7bf42-57af-4e3f-acfc-b9a2ba3342aa"
          ],
          "type": "飲料",
          "buildDate": "2026-01-09",
          "location": "資安大樓"
      }
    ]
  }

  searchData!:string;
  letterSearch() {
    let eachLetter:string[]=[];
    if(this.searchData!=this.searchData.toLowerCase()){
       eachLetter= this.searchData.toLowerCase().split('');  // split('')拆成單一字母並組成陣列
    }else{
      eachLetter= this.searchData.split('');  // split('')拆成單一字母並組成陣列
    }
  }
  highlight(text: string): SafeHtml {
    if (!this.searchData || !text) return text;
    const escapedSearch = this.searchData.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // 處理特殊字元
    const letters = escapedSearch.split('').join('|');  // 搜尋個別字元
    const regex = new RegExp(`(${letters})`, 'gi');  // 全域搜尋，不分大小寫
    const result = text.replace(regex, '<span style="color: red; font-weight: bold;">$1</span>');  // 一次性取代，不要分兩次執行

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  // plusone:boolean=false;
  // plusOne(){
  //   if(this.plusone==false){

  //   }
  // }
}
