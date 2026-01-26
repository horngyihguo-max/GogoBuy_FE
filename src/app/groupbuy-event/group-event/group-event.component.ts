import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-group-event',
  imports: [],
  templateUrl: './group-event.component.html',
  styleUrl: './group-event.component.scss'
})
export class GroupEventComponent {
  constructor(
    private auth:AuthService,
    private http:HttpService,
    private router:Router,
    private route:ActivatedRoute
  ){};

  userId!:string;
  storeId!:number;
  ngOnInit(): void {
    this.userId=String(localStorage.getItem('user_id'));
    this.storeId=Number(this.route.snapshot.paramMap.get('qId'));
  }
}
