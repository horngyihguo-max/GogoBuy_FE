import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkActive, RouterLink } from '@angular/router';
import Swal from 'sweetalert2'
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { PanelMenuModule } from 'primeng/panelmenu';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, PanelMenuModule, InputTextModule, RouterLinkActive, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  sidebarCollapsed = false;
  title = 'gogobuy';
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    // Swal.fire("SweetAlert2 is working!");
  }

  test() {
    Swal.fire("SweetAlert2 is working!");
  }

}
