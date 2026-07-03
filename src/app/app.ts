import { Component } from '@angular/core';
import { RouterOutlet,Router } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar';
import { Topbar } from './shared/topbar/topbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,SidebarComponent,Topbar], 

  templateUrl: './app.html', 
  styleUrls: ['./app.css']
})
export class App {
  title = 'syscanvas-front';
  constructor(public router: Router) {}
}