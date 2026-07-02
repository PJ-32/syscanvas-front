import { Component } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css']
})
export class Topbar {
  
  // Variable que guarda la ruta de la foto de la barra superior
  fotoUrlTopbar: string = '/uploads/default-foto.png';
  
}