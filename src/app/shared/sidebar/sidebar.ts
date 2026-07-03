import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; // Añadimos RouterLinkActive
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // Magia de rutas
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'] // (Asegúrate de haber pegado tu sidebar.css en este archivo)
})
export class SidebarComponent implements OnInit {
  
  rolUsuario: string = '';
  estaColapsado: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    
    // Restaurar estado del sidebar
    const guardado = localStorage.getItem('sidebarCollapsed');
    if (guardado === 'true') {
      this.estaColapsado = true;
      this.aplicarClaseBody();
    }
  }

  toggleSidebar() {
    // Verificamos si la pantalla es tamaño celular (768px o menos)
    if (window.innerWidth <= 768) {
      // En celular: Quitamos la clase del body para esconder el menú flotante
      document.body.classList.remove('sidebar-mobile-open');
    } else {
      // En PC: Alternamos entre ancho normal y 70px
      this.estaColapsado = !this.estaColapsado;
      localStorage.setItem('sidebarCollapsed', String(this.estaColapsado));
      this.aplicarClaseBody();
    }
  }

  abrirModalCrearCanvas() {
    // Más adelante conectaremos esto con el modal real
    console.log('Botón de crear canvas presionado desde el menú');
  }

  // Angular nos permite inyectar clases al body de forma segura
  private aplicarClaseBody() {
    if (this.estaColapsado) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  logout() {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  cerrarMenuMovil() {
    document.body.classList.remove('sidebar-mobile-open');
  }
}