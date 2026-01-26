import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../@service/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    RouterLink,
    AvatarModule,
    MenuModule,
    BadgeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stores: any[] = [];
  events: any[] = [];
  users: any[] = [];
  loading = false;
  
  // Navigation State
  currentView: 'stores' | 'events' | 'users' = 'stores';
  
  menuItems = [
    { label: '店家管理', icon: 'pi pi-shop', id: 'stores' },
    { label: '團購活動', icon: 'pi pi-calendar', id: 'events' },
    { label: '會員管理', icon: 'pi pi-users', id: 'users' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loading = true;
    this.loadData();
  }
  
  setView(view: any) {
    this.currentView = view;
  }

  loadData() {
    this.loading = true;
    // Load Stores
    this.authService.getallstore().subscribe({
      next: (res: any) => {
        this.stores = res.storeList || res || [];
        console.log('Stores loaded:', this.stores);
      },
      error: () => console.error('Failed to load stores')
    });

    // Load Events
    this.authService.getallevent().subscribe({
      next: (res: any) => {
        const rawEvents = Array.isArray(res) ? res : (res.groupsSearchViewList || res.groupbuyEvents || res.eventList || []);
        this.events = rawEvents;
        console.log('Events loaded:', this.events);
      },
      error: () => console.error('Failed to load events'),
      complete: () => this.loading = false
    });
    
    // Load Users (Mock for now as API is missing)
    this.loadUsers();
  }
  
  loadUsers() {
    // TODO: Replace with actual API call this.authService.getAllUsers()
    // Simulating user data for UI development
    this.users = [
      { id: 1, email: 'admin@gogobuy.com', nickname: '超級管理員', role: 'ADMIN', status: 'active', avatarUrl: '' },
      { id: 2, email: 'user1@test.com', nickname: '熱心團主', role: 'USER', status: 'active', avatarUrl: '' },
      { id: 3, email: 'shop_owner@test.com', nickname: '飲料店長', role: 'STORE_OWNER', status: 'active', avatarUrl: '' },
      { id: 4, email: 'banned@test.com', nickname: '違規用戶', role: 'USER', status: 'banned', avatarUrl: '' },
    ];
  }

  getSeverity(status: string) {
    switch (status) {
      case 'open':
      case 'COMPLETED':
      case 'active':
        return 'success';
      case 'closed':
      case 'CANCELLED':
      case 'banned':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  }
}
