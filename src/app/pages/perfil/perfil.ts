import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Necesario para los inputs del modal
import { CommonModule } from '@angular/common'; // Necesario para algunas directivas

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule, CommonModule], // Importamos los módulos aquí
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class PerfilComponent implements OnInit {
  
  // 1. Aquí declaras todas las variables que usa el HTML
  rolUsuario: string = 'JEFE';
  modalAbierto: boolean = false;
  mensajeFoto: string = '';

  empleado: any = {
    codPersona: 'EMP-001',
    nombre: 'Piero',
    apellido: 'Desarrollador',
    dni: '76543210',
    email: 'piero@syscanvas.com',
    celular: '987654321',
    fotoUrl: '/uploads/default-foto.png'
  };

  empleadoEdicion: any = {};

  ngOnInit() {
    // Aquí luego llamaremos a tu API de SysCanvas
  }

  // 2. Aquí declaras las funciones que usa el HTML en los (click)
  abrirModalEdicion() {
    this.empleadoEdicion = { ...this.empleado };
    this.modalAbierto = true;
  }

  cerrarModalEdicion() {
    this.modalAbierto = false;
  }

  guardarCambios(event: Event) {
    event.preventDefault();
    this.empleado = { ...this.empleadoEdicion };
    this.cerrarModalEdicion();
    alert('Datos guardados correctamente');
  }

  simularSubidaFoto() {
    this.mensajeFoto = 'Subiendo foto...';
    setTimeout(() => {
      this.mensajeFoto = '¡Foto actualizada!';
      setTimeout(() => this.mensajeFoto = '', 3000);
    }, 1000);
  }

  eliminarFoto() {
    if(confirm('¿Seguro que deseas eliminar tu foto?')) {
      this.empleado.fotoUrl = '/uploads/default-foto.png';
      this.mensajeFoto = 'Foto eliminada';
    }
  }
}