import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // Necesario para los enlaces del menú

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink], // Lo inyectamos aquí
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {
  
  // 1. Variable para controlar qué botones se muestran (@if)
  rolUsuario: string = 'JEFE';

  // 2. Función para achicar/agrandar el menú lateral
  toggleSidebar() {
    // La forma más fácil en Angular de hacer esto rápido es añadir una clase al body
    // y en tu CSS global tener una regla que achique el sidebar.
    document.body.classList.toggle('sidebar-collapsed');
  }

  // 3. Función para cerrar sesión
  logout() {
    // Aquí a futuro borrarás el JWT del localStorage
    alert('Cerrando sesión...');
  }
}