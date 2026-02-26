import { Injectable } from "@angular/core";
import { HttpService } from './http.service';
import { HttpParams } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})

export class PopularService {
  constructor(private https: HttpService) { }

  getTop10(type?: string) {
    let params = new HttpParams();

    if (type) {
      params = params.set('type', type);
    }

    return this.https.getApi(
      'http://localhost:8080/gogobuy/salesStats/Top10',
      { params }
    );
  }
}
