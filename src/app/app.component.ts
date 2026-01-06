import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Swal from 'sweetalert2'
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, PanelMenuModule, InputTextModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  sidebarCollapsed = false;
  title = 'gogobuy';

  menu: MenuItem[] = [
    {
      label: 'FAVORITES',
      items: [
        { label: 'Dashboards', icon: 'pi pi-home' },
        { label: 'E-Commerce', icon: 'pi pi-shopping-bag', styleClass: 'is-active' },
        { label: 'Banking', icon: 'pi pi-building' }
      ]
    },
    {
      label: 'APPS',
      items: [
        { label: 'Blog', icon: 'pi pi-pencil' },
        { label: 'Chat', icon: 'pi pi-comments' },
        { label: 'Files', icon: 'pi pi-folder' },
        { label: 'Kanban', icon: 'pi pi-th-large' },
        { label: 'Mail', icon: 'pi pi-envelope' },
        { label: 'Task List', icon: 'pi pi-check-square' }
      ]
    },
    {
      label: 'UI KIT',
      items: [
        { label: 'Form Layout', icon: 'pi pi-align-left' },
        { label: 'Input', icon: 'pi pi-sliders-h' },
        { label: 'Button', icon: 'pi pi-stop' },
        { label: 'Table', icon: 'pi pi-table' },
        { label: 'List', icon: 'pi pi-list' },
        { label: 'Tree', icon: 'pi pi-sitemap' },
        { label: 'Panel', icon: 'pi pi-window-maximize' },
        { label: 'Overlay', icon: 'pi pi-clone' }
      ]
    }
  ];
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    // Swal.fire("SweetAlert2 is working!");

  }
  test() {
    Swal.fire("SweetAlert2 is working!");
  }
}
