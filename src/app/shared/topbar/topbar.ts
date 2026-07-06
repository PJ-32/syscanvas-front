import { Component, OnInit, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink], // Necesario para los enlaces del menú
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.css']
})
export class Topbar implements OnInit {
  
  fotoUrlTopbar: string = 'uploads/default-foto.png';
  nombreUsuario: string = 'Cargando...';
  menuAbierto: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private eRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.nombreUsuario = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.cargarFotoPerfil();
  }

  cargarFotoPerfil() {
    const codPersona = localStorage.getItem('codPersona');
    if (!codPersona) return;

    // Hacemos la petición a tu backend en Spring Boot
    this.authService.obtenerFotoPerfil(codPersona).subscribe({
      next: (data) => {
        if (data && data.fotoBase64 && data.fotoBase64.trim() !== "") {
          this.fotoUrlTopbar = `data:image/png;base64,${data.fotoBase64}`;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.warn("No se pudo cargar la foto del usuario, usando imagen por defecto.");
      }
    });
  }

  // Abre y cierra el menú
  toggleMenu(event: Event) {
    event.stopPropagation(); // Evita que el clic se propague y cierre el menú de inmediato
    this.menuAbierto = !this.menuAbierto;
  }

  // Angular detecta los clics en toda la pantalla (Reemplaza tu setupProfileOutsideClickHandler)
  @HostListener('document:click', ['$event'])
  clickFueraDelMenu(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.menuAbierto = false; // Cierra el menú si haces clic afuera
    }
  }

  logout() {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
  
  abrirMenuMovil() {
    document.body.classList.add('sidebar-mobile-open');
  }
}