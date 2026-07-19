import { Component,ChangeDetectorRef } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
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

        this.cdr.detectChanges();

        // Redirigir según el rol recibido desde Spring Boot
        // Redirigir al inicio unificado
        setTimeout(() => {
          this.router.navigate(['/inicio']);
        }, 1000);
      },
      error: (err) => {
        this.cargando = false;
        // Atrapa los errores 401, 403 o 404 del backend
        this.mensajeError = err.error?.mensaje || 'Credenciales inválidas o error de conexión.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // LÓGICA DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  modalRecuperarAbierto: boolean = false;
  
  // Variables del formulario del modal
  codPersonaRecuperar: string = '';
  dniRecuperar: string = '';
  fechaNacimientoRecuperar: string = '';
  passwordNueva: string = '';
  passwordConfirmar: string = '';

  // Variables para mostrar/ocultar ojitos en el modal
  mostrarPasswordNueva: boolean = false;
  mostrarPasswordConfirmar: boolean = false;

  // Estado del modal
  cargandoRecuperacion: boolean = false;
  errorRecuperacion: string = '';
  exitoRecuperacion: string = '';

  abrirModalRecuperar() {
    this.modalRecuperarAbierto = true;
  }
  
  cerrarModalRecuperar() {
    this.modalRecuperarAbierto = false;
    this.limpiarFormularioRecuperacion();
  }

  limpiarFormularioRecuperacion() {
    this.codPersonaRecuperar = '';
    this.dniRecuperar = '';
    this.fechaNacimientoRecuperar = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.errorRecuperacion = '';
    this.exitoRecuperacion = '';
  }

  togglePasswordModal(campo: string) {
    if (campo === 'nueva') this.mostrarPasswordNueva = !this.mostrarPasswordNueva;
    if (campo === 'confirmar') this.mostrarPasswordConfirmar = !this.mostrarPasswordConfirmar;
  }

  ejecutarRecuperacion(event: Event) {
    event.preventDefault();
    this.errorRecuperacion = '';
    this.exitoRecuperacion = '';

    // 1. Validaciones
    if (!this.codPersonaRecuperar || !this.dniRecuperar || !this.fechaNacimientoRecuperar || !this.passwordNueva || !this.passwordConfirmar) {
      this.errorRecuperacion = 'Complete todos los campos obligatorios';
      return;
    }

    if (!/^\d{8}$/.test(this.dniRecuperar)) {
      this.errorRecuperacion = 'El DNI debe tener 8 dígitos numéricos';
      return;
    }

    if (this.passwordNueva.length < 8) {
      this.errorRecuperacion = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    const tieneMayuscula = /[A-Z]/.test(this.passwordNueva);
    const tieneMinuscula = /[a-z]/.test(this.passwordNueva);
    const tieneNumeroOEsp = /[0-9@#$%^&+=!*()_\-]/.test(this.passwordNueva);

    if (!tieneMayuscula || !tieneMinuscula || !tieneNumeroOEsp) {
      this.errorRecuperacion = 'La contraseña debe contener al menos una mayúscula, una minúscula y un carácter especial o número.';
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmar) {
      this.errorRecuperacion = 'Las contraseñas no coinciden';
      return;
    }

    // 2. Armar el payload
    const payload = {
      codPersona: Number(this.codPersonaRecuperar),
      passwordActual: null,
      passwordNueva: this.passwordNueva,
      dni: this.dniRecuperar,
      fechaNacimiento: this.fechaNacimientoRecuperar 
    };

    this.cargandoRecuperacion = true;

    // 3. Enviar al backend
    this.authService.recuperarPassword(payload).subscribe({
      next: (res) => {
        this.cargandoRecuperacion = false;
        this.exitoRecuperacion = '¡Contraseña actualizada correctamente!';
        
        this.cdr.detectChanges();

        setTimeout(() => {
          this.cerrarModalRecuperar();
          this.mensajeExito = 'Ahora puede iniciar sesión con su nueva contraseña';

          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.cargandoRecuperacion = false;
        console.error("Motivo del rechazo de Spring Boot:", err);

        // 1. Si Spring Boot nos envía una lista de errores de validación (el Array)
        if (err.error && err.error.errores && err.error.errores.length > 0) {
          // Unimos todos los errores con un guion para mostrarlos en el modal
          this.errorRecuperacion = err.error.errores.join(' - ');
        } 
        // 2. Si nos envía un mensaje general JSON
        else if (err.error && err.error.mensaje) {
          this.errorRecuperacion = err.error.mensaje;
        } 
        // 3. Si nos envía texto plano
        else if (err.error && typeof err.error === 'string') {
          this.errorRecuperacion = err.error; 
        } 
        // 4. Fallback por defecto
        else {
          this.errorRecuperacion = 'Los datos de verificación no coinciden.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}