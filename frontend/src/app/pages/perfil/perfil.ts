import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // Necesario para routerLink
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule], 
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class PerfilComponent implements OnInit, OnDestroy {
  
  rolUsuario: string = '';
  modalAbierto: boolean = false;
  mensajeFoto: string = '';
  
  // URL base apuntando a tu backend en Spring Boot
  private apiUrl = 'http://localhost:8080/api/t/empleado';

  empleado: any = {
    codPersona: '',
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    celular: '',
    fotoUrl: '/uploads/default-foto.png'
  };

  private fotoSub!: Subscription;

  empleadoEdicion: any = {};

  // Nuevas variables para el modal de contraseña
  modalPasswordAbierto: boolean = false;
  cargandoPassword: boolean = false;
  errorPassword: string = '';
  exitoPassword: string = '';

  datosPassword = {
    actual: '',
    nueva: '',
    confirmacion: ''
  };

  mostrarPasswordActual: boolean = false;
  mostrarPasswordNueva: boolean = false;
  mostrarPasswordConfirmar: boolean = false;

  // Inyectamos HttpClient para las peticiones
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute, // <-- Inyectar ActivatedRoute
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Recuperamos los datos de sesión del localStorage
    const codPersona = localStorage.getItem('codPersona');
    this.rolUsuario = localStorage.getItem('rol') || 'ANALISTA';

    // 1. Nos suscribimos al AuthService igual que la Topbar
    this.fotoSub = this.authService.fotoPerfil$.subscribe(url => {
      this.empleado.fotoUrl = url;
      this.cdr.detectChanges();
    });

    if (codPersona) {
      this.cargarPerfil(codPersona);
    } else {
      console.error('⚠ No se encontró codPersona del usuario logueado.');
    }
    
    this.route.queryParams.subscribe(params => {
      if (params['accion'] === 'password') {
        this.abrirModalPassword();
        
        // Opcional: Limpiamos la URL para que si recarga la página no se vuelva a abrir solo
        this.router.navigate([], {
          queryParams: { 'accion': null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  // Generador de cabeceras con el JWT
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==========================================
  // LÓGICA DE CARGA Y ACTUALIZACIÓN DE DATOS
  // ==========================================

  cargarPerfil(codPersona: string) {
    this.http.get(`${this.apiUrl}/${codPersona}`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (data: any) => {
          const fotoActual = this.empleado.fotoUrl;
          this.empleado = data;
          this.empleado.fotoUrl = fotoActual;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error obteniendo datos del empleado:', err)
      });
  }

  ngOnDestroy() {
    if (this.fotoSub) {
      this.fotoSub.unsubscribe();
    }
  }

  abrirModalEdicion() {
    this.empleadoEdicion = { ...this.empleado };
    this.modalAbierto = true;
  }

  cerrarModalEdicion() {
    this.modalAbierto = false;
  }

  guardarCambios(event: Event) {
    event.preventDefault();
    
    const codPersona = this.empleado.codPersona;
    
    this.http.put(`${this.apiUrl}/${codPersona}`, this.empleadoEdicion, { headers: this.getAuthHeaders() })
      .subscribe({
        next: () => {
          this.empleado = { ...this.empleadoEdicion }; // Actualiza la vista
          this.cerrarModalEdicion();
          alert('Datos actualizados correctamente.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error guardando los datos:', err);
          alert('Error al guardar los datos.');
        }
      });
  }

  // ==========================================
  // LÓGICA DE FOTO DE PERFIL
  // ==========================================

  triggerSubidaFoto() {
    // Simulamos el clic en un input de tipo file oculto
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => this.procesarSubidaFoto(e);
    fileInput.click();
  }

  procesarSubidaFoto(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido.');
      return;
    }

    this.mensajeFoto = 'Subiendo foto...';
    const reader = new FileReader();

    reader.onload = () => {
      const base64Full = reader.result as string;
      const base64 = base64Full.split(',')[1]; // Extraemos solo la data
      const codPersona = this.empleado.codPersona;

      this.http.put(`${this.apiUrl}/${codPersona}/foto`, { fotoBase64: base64 }, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => {
            this.empleado.fotoUrl = base64Full; 
            this.mensajeFoto = '¡Foto actualizada!';
            
            // Forzamos actualización porque FileReader.onload se ejecuta fuera de la "zona" de Angular
            this.cdr.detectChanges(); 
            this.authService.actualizarFotoPerfilLocal(base64Full);

            setTimeout(() => {
              this.mensajeFoto = '';
              this.cdr.detectChanges();
            }, 3000);
          },
          error: (err) => {
            console.error('Error actualizando foto:', err);
            this.mensajeFoto = 'Error al subir la foto';
            this.cdr.detectChanges();
          }
        });
    };

    reader.readAsDataURL(file);
  }

  eliminarFoto() {
    const codPersona = this.empleado.codPersona;

    if(confirm('¿Seguro que deseas eliminar tu foto?')) {
      this.http.delete(`${this.apiUrl}/${codPersona}/foto`, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => {
            const defaultFoto = '/uploads/default-foto.png';
            this.empleado.fotoUrl = defaultFoto;
            this.mensajeFoto = 'Foto eliminada';
            this.cdr.detectChanges();
            this.authService.actualizarFotoPerfilLocal(defaultFoto);

            setTimeout(() => {
              this.mensajeFoto = '';
              this.cdr.detectChanges();
            }, 3000);
          },
          error: (err) => {
            console.error('Error eliminando la foto:', err);
            alert('No se pudo eliminar la foto');
          }
        });
    }
  }

  // ==========================================
  // LÓGICA DE CAMBIO DE CONTRASEÑA
  // ==========================================

  abrirModalPassword() {
    this.limpiarFormularioPassword();
    this.modalPasswordAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalPassword() {
    this.modalPasswordAbierto = false;
    this.limpiarFormularioPassword();
    this.cdr.detectChanges();
  }

  limpiarFormularioPassword() {
    this.datosPassword = { actual: '', nueva: '', confirmacion: '' };
    this.errorPassword = '';
    this.exitoPassword = '';
    this.mostrarPasswordActual = false;
    this.mostrarPasswordNueva = false;
    this.mostrarPasswordConfirmar = false;
  }

  togglePasswordModal(campo: string) {
    if (campo === 'actual') this.mostrarPasswordActual = !this.mostrarPasswordActual;
    if (campo === 'nueva') this.mostrarPasswordNueva = !this.mostrarPasswordNueva;
    if (campo === 'confirmacion') this.mostrarPasswordConfirmar = !this.mostrarPasswordConfirmar;
  }

  guardarNuevaPassword(event: Event) {
    event.preventDefault();
    this.errorPassword = '';
    this.exitoPassword = '';

    // 1. Validaciones (Misma lógica que en tu login.ts)
    if (!this.datosPassword.actual || !this.datosPassword.nueva || !this.datosPassword.confirmacion) {
      this.errorPassword = 'Complete todos los campos obligatorios';
      return;
    }

    if (this.datosPassword.nueva.length < 8) {
      this.errorPassword = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    const tieneMayuscula = /[A-Z]/.test(this.datosPassword.nueva);
    const tieneMinuscula = /[a-z]/.test(this.datosPassword.nueva);
    const tieneNumeroOEsp = /[0-9@#$%^&+=!*()_\-]/.test(this.datosPassword.nueva);

    if (!tieneMayuscula || !tieneMinuscula || !tieneNumeroOEsp) {
      this.errorPassword = 'La contraseña debe contener al menos una mayúscula, una minúscula y un carácter especial o número.';
      return;
    }

    if (this.datosPassword.nueva !== this.datosPassword.confirmacion) {
      this.errorPassword = 'Las contraseñas nuevas no coinciden';
      return;
    }

    // 2. Armar el payload
    const payload = {
      codPersona: Number(this.empleado.codPersona),
      passwordActual: this.datosPassword.actual,
      passwordNueva: this.datosPassword.nueva,
      dni: null,              
      fechaNacimiento: null   
    };

    this.cargandoPassword = true;

    // 3. Enviar petición utilizando tu método existente
    this.authService.recuperarPassword(payload).subscribe({
      next: (res) => {
        this.cargandoPassword = false;
        this.exitoPassword = '¡Contraseña actualizada correctamente!';
        
        // Refrescamos la vista, igual que en tu login.ts
        this.cdr.detectChanges(); 

        setTimeout(() => {
          this.cerrarModalPassword();
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.cargandoPassword = false;
        console.error("Error al cambiar contraseña:", err);

        // Captura de errores idéntica a tu login.ts
        if (err.error && err.error.errores && err.error.errores.length > 0) {
          this.errorPassword = err.error.errores.join(' - ');
        } else if (err.error && err.error.mensaje) {
          this.errorPassword = err.error.mensaje;
        } else if (err.error && typeof err.error === 'string') {
          this.errorPassword = err.error; 
        } else {
          this.errorPassword = 'La contraseña actual es incorrecta o hubo un error.';
        }
        
        this.cdr.detectChanges(); 
      }
    });
  }
}