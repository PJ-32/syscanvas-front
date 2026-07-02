import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  // Variables del formulario
  codPersona: string = '';
  password: string = '';
  mostrarPassword: boolean = false;
  
  // Variables de estado
  cargando: boolean = false;
  mensajeError: string = '';
  mensajeExito: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  iniciarSesion(event: Event) {
    event.preventDefault();
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.codPersona || !this.password) {
      this.mensajeError = 'Complete todos los campos';
      return;
    }

    this.cargando = true;

    // Llamada al backend
    this.authService.login(Number(this.codPersona), this.password).subscribe({
      next: (res) => {
        // Asumiendo que tu backend devuelve { token, rol, codPersona, nombreCompleto }
        this.authService.guardarSesion(res.token, res.rol, res.codPersona, res.nombreCompleto);
        
        this.mensajeExito = `¡Bienvenido ${res.nombreCompleto || ''}!`;
        this.cargando = false;

        // Redirigir según el rol recibido desde Spring Boot
        setTimeout(() => {
          if (res.rol === 'ROLE_JEFE') {
            this.router.navigate(['/jefe']);
          } else {
            this.router.navigate(['/analista']);
          }
        }, 1000);
      },
      error: (err) => {
        this.cargando = false;
        // Atrapa los errores 401, 403 o 404 del backend
        this.mensajeError = err.error?.mensaje || 'Credenciales inválidas o error de conexión.';
      }
    });
  }

  // --- Lógica básica para abrir el modal que tenías ---
  modalRecuperarAbierto: boolean = false;
  
  abrirModalRecuperar() {
    this.modalRecuperarAbierto = true;
  }
  
  cerrarModalRecuperar() {
    this.modalRecuperarAbierto = false;
  }
}