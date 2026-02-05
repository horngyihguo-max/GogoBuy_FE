import {
  Component,
  Input,
  ViewChild,
  HostListener,
  OnInit,
  inject
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PopoverModule, Popover } from 'primeng/popover';
import { Router, RouterModule } from '@angular/router';
import { SseService } from '../../@service/sse.service';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-notification-bell',
  imports: [PopoverModule, RouterModule, Popover, AsyncPipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
  @Input() mode: 'dropdown' | 'icon' = 'dropdown';
  @ViewChild('pop') pop!: Popover;

  @HostListener('window:scroll')
  onScroll() {
    this.pop?.hide();
  }

  // ✅ 直接用 service 的 observable
  public sse = inject(SseService);
  notifications$ = this.sse.notifications$;
  unreadCount$ = this.sse.unreadCount$;


  constructor(private router: Router) { }

  ngOnInit() {
  }

  markAllRead() {
    this.sse.markAllRead();
  }

  clickItem(n: any) {
    this.sse.markAsRead(n.id);
    const link = n.link;
    if (!link) return;

    if (typeof link == 'string' && /^https?:\/\//i.test(link)) {
      window.open(link, '_blank');
      return;
    }

    const internal = link.startsWith('/') ? link : `/${link}`;
    this.router.navigateByUrl(internal);
  }
}
