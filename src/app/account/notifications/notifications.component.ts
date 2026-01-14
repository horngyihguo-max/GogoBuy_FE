import { Component } from '@angular/core';
import { SseService } from '../../@service/sse.service';
import { Observable } from 'rxjs/internal/Observable';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-notifications',
  imports: [AsyncPipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent {
  constructor(public sse: SseService) {}
  notifications$: Observable<any[]> | undefined;

  ngOnInit() {
    this.sse.connect();
    this.notifications$ = this.sse.notifications$;
  }

  markAllRead() {
    this.sse.markAllRead();
  }

  markAsRead(n: any) {
    this.sse.markAsRead(n.id);
  }
}
