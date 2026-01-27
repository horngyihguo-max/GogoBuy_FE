import { Component } from '@angular/core';
import { AuthService } from '../../@service/auth.service';
import { HttpService } from '../../@service/http.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-follow-group',
  imports: [],
  templateUrl: './follow-group.component.html',
  styleUrl: './follow-group.component.scss'
})
export class FollowGroupComponent {
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
