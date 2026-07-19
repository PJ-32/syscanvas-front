import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasService } from '../../core/services/canvas.service';
import { TareaService } from '../../core/services/tarea.service';
import { HistorialService } from '../../core/services/historial.service';
import { Canvas } from '../../core/models/canvas.model';
import { Tarea } from '../../core/models/tarea.model';
import { Historial } from '../../core/models/historial.model';

@Component({
  selector: 'app-canvas-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-detalle.html',
  styleUrls: ['./canvas-detalle.css'] // Asegúrate de traer los estilos de tu kanban aquí
})
export class CanvasDetalle implements OnInit {

  // Variables de Estado
  canvasId: number = 0;
  canvasActual: Canvas | null = null;
  canvasBloqueado: boolean = false;
  listaCanvas: Canvas[] = [];
  etapasGlobal: any[] = [];
  
  codPersonaActual: number = 0;
  nombreCompleto: string = '';
  rolUsuario: string = '';

  // Modales (Control de visibilidad)
  modalTareaAbierto: boolean = false;
  modalVerAbierto: boolean = false;
  modalEditarAbierto: boolean = false;
  modalEliminarAbierto: boolean = false;
  modalHistorialAbierto: boolean = false;

  // Variables para Formularios y UI
  nuevaTarea: any = { nomTarea: '', desTarea: '', codEtapa: '' };
  tareaSeleccionada: Tarea | null = null;
  historial: Historial[] = [];
  toastMensaje: string = '';
  toastTipo: string = 'info';
  
  // Drag & Drop
  draggedTask: Tarea | null = null;

  constructor(
    private canvasService: CanvasService,
    private tareaService: TareaService,
    private historialService: HistorialService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.codPersonaActual = Number(localStorage.getItem('codPersona') || 0);
    this.nombreCompleto = localStorage.getItem('nombreCompleto') || `Usuario ${this.codPersonaActual}`;
    this.rolUsuario = localStorage.getItem('rol') || '';
    
    // Leer el ID de la URL (ej: ?id=15)
    this.route.queryParams.subscribe(params => {
      this.canvasId = Number(params['id']);
      if (this.canvasId) {
        this.cargarSelectorCanvas();
        this.cargarCanvasDetalle();
      } else {
        alert("No se encontró el ID del canvas en la URL");
      }
    });
  }

  // ==========================================
  // CARGA DE DATOS PRINCIPALES
  // ==========================================
  cargarSelectorCanvas() {
    this.canvasService.obtenerCanvas().subscribe(res => {
      this.listaCanvas = res;
      this.cdr.detectChanges();
    });
  }

  cambiarCanvas(event: any) {
    const nuevoId = event.target.value;
    if (nuevoId) {
      this.router.navigate(['/canvas-detalle'], { queryParams: { id: nuevoId } });
    }
  }

  cargarCanvasDetalle() {
    this.canvasService.obtenerCanvasPorId(this.canvasId).subscribe({
      next: (canvas) => {
        this.canvasActual = canvas;
        this.canvasBloqueado = !this.canvasActual.editable;
        
        const etapasRaw = canvas.etapasPersonalizadas || [];

        this.etapasGlobal = etapasRaw.map((e: any) => ({
            ...e,
            tareas: e.tareas ? e.tareas : []
        })).sort((a: any, b: any) => a.numEtapa - b.numEtapa);
        
        this.cdr.detectChanges();
        // Ordenamos las etapas
        this.etapasGlobal = etapasRaw.sort((a: any, b: any) => a.numEtapa - b.numEtapa);
        
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error cargando detalles del canvas:", err)
    });
  }

  // ==========================================
  // ACCIONES GENERALES DEL CANVAS
  // ==========================================
  toggleBloqueo() {
    this.canvasService.toggleEditable(this.canvasId).subscribe({
      next: (res) => {
        this.canvasActual!.editable = res.editable;
        this.canvasBloqueado = !this.canvasActual!.editable;
        
        const accion = this.canvasBloqueado ? "Bloquear Canvas" : "Desbloquear Canvas";
        const detalle = `El usuario ${this.nombreCompleto} ${this.canvasBloqueado ? 'bloqueó' : 'desbloqueó'} el canvas.`;
        this.registrarHistorial(accion, detalle);
        
        this.cdr.detectChanges();
      },
      error: () => alert("No se pudo actualizar el estado del canvas")
    });
  }

  exportarCanvas() {
    this.canvasService.exportarCanvas(this.canvasId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas_${this.canvasId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert("Hubo un problema al exportar el canvas.")
    });
  }

  importarCanvas(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    this.canvasService.importarCanvas(formData).subscribe({
      next: (res) => {
        alert("Canvas importado correctamente");
        const nuevoId = res.codCanvas;
        if (nuevoId) this.router.navigate(['/canvas-detalle'], { queryParams: { id: nuevoId } });
      },
      error: () => alert("Error al importar el canvas. Revisa el archivo.")
    });
  }

  // ==========================================
  // GESTIÓN DE TAREAS
  // ==========================================
  abrirModalCrearTarea() {
    if (this.canvasBloqueado) return this.mostrarToast("El canvas está bloqueado", "error");
    this.nuevaTarea = { nomTarea: '', desTarea: '', codEtapa: '' };
    this.modalTareaAbierto = true;
  }

  guardarTarea(event: Event) {
    event.preventDefault();
    const payload = {
      ...this.nuevaTarea,
      codEtapa: Number(this.nuevaTarea.codEtapa),
      codPersona: this.codPersonaActual,
      codCanvas: this.canvasId,
      numTarea: 1,
      vigente: 1
    };

    this.tareaService.crearTarea(payload).subscribe({
      next: () => {
        this.modalTareaAbierto = false;
        this.registrarHistorial("Crear Tarea", `Se creó la tarea "${this.nuevaTarea.nomTarea}".`);
        this.cargarCanvasDetalle();
      },
      error: () => alert("Error al crear la tarea")
    });
  }

  verTarea(tarea: any) {
    this.tareaSeleccionada = tarea;
    this.modalVerAbierto = true;
  }

  editarTarea(tarea: any) {
    if (this.canvasBloqueado) return this.mostrarToast("El canvas está bloqueado", "error");
    this.tareaSeleccionada = { ...tarea }; // Clonamos para no afectar la vista antes de guardar
    this.modalEditarAbierto = true;
  }

  guardarEdicion() {
    if (!this.tareaSeleccionada) return;
    const payload = { ...this.tareaSeleccionada, etapa: { codEtapa: this.tareaSeleccionada.codEtapa } };
    
    this.tareaService.actualizarTarea(this.tareaSeleccionada.codTarea!, payload).subscribe({
      next: () => {
        this.modalEditarAbierto = false;
        this.registrarHistorial("Editar Tarea", `Se editó la tarea: "${this.tareaSeleccionada!.nomTarea}"`);
        this.cargarCanvasDetalle();
      },
      error: () => alert("Error al actualizar tarea")
    });
  }

  abrirEliminarTarea(tarea: any) {
    if (this.canvasBloqueado) return this.mostrarToast("El canvas está bloqueado", "error");
    this.tareaSeleccionada = tarea;
    this.modalEliminarAbierto = true;
  }

  confirmarEliminacion() {
    if (!this.tareaSeleccionada) return;
    this.tareaService.eliminarTarea(this.tareaSeleccionada.codTarea!).subscribe({
      next: () => {
        this.modalEliminarAbierto = false;
        this.registrarHistorial("Eliminar Tarea", `Se eliminó la tarea "${this.tareaSeleccionada!.nomTarea}".`);
        this.mostrarToast("Tarea eliminada correctamente", "success");
        this.cargarCanvasDetalle();
      },
      error: () => alert("No se pudo eliminar la tarea")
    });
  }

  cambiarEstadoTarea(tarea: any) {
    if (this.canvasBloqueado) return this.mostrarToast("El canvas está bloqueado", "error");
    
    const estaCompleta = tarea.vigente === 0;

    this.tareaService.cambiarEstadoTarea(tarea.codTarea, !estaCompleta).subscribe({
      next: () => {
        this.registrarHistorial("Cambio de estado", `El usuario ${this.nombreCompleto} ${!estaCompleta ? 'completó' : 'reabrió'} la tarea "${tarea.nomTarea}".`);
        this.mostrarToast(!estaCompleta ? "Tarea completada 🎉" : "Tarea reabierta ↩️", "success");
        this.cargarCanvasDetalle();
      },
      error: () => this.mostrarToast("Error al actualizar estado", "error")
    });
  }

  // ==========================================
  // DRAG & DROP NATIVO EN ANGULAR
  // ==========================================
  handleDragStart(event: DragEvent, tarea: any) {
    if (this.canvasBloqueado) {
      event.preventDefault();
      return;
    }
    this.draggedTask = tarea;
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necesario para permitir el drop
  }

  handleDrop(event: DragEvent, codEtapaDestino: number) {
    event.preventDefault();
    if (!this.draggedTask || this.draggedTask.codEtapa === codEtapaDestino) return;

    this.tareaService.moverTarea(this.draggedTask.codTarea!, codEtapaDestino).subscribe({
      next: () => {
        this.registrarHistorial("Mover Tarea", `La tarea "${this.draggedTask!.nomTarea}" fue movida de etapa.`);
        this.draggedTask = null;
        this.cargarCanvasDetalle();
      },
      error: () => console.error("Error al mover tarea")
    });
  }

  // ==========================================
  // HISTORIAL Y UTILIDADES
  // ==========================================
  abrirHistorial() {
    this.historialService.obtenerHistorial(this.canvasId).subscribe({
      next: (res) => {
        this.historial = res;
        this.modalHistorialAbierto = true;
        this.cdr.detectChanges();
      },
      error: () => alert("Error al cargar historial")
    });
  }

  registrarHistorial(accion: string, detalle: string) {
    const payload = {
      codPersona: this.codPersonaActual,
      accion: accion,
      detalle: detalle,
      canvas: { codCanvas: this.canvasId }
    };
    this.historialService.registrarHistorial(payload).subscribe();
  }

  mostrarToast(mensaje: string, tipo: string = 'info') {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    
    // Ocultar automáticamente después de 3 segundos
    setTimeout(() => {
      this.toastMensaje = '';
    }, 3000);
  }

  obtenerColorEtapa(index: number): string {
    const colores = ["#A3CEF1", "#C9E4DE", "#F6D6AD", "#F9C6C9", "#E5D4EF", "#FFF1C1", "#CBE2B0", "#FFD6A5"];
    return colores[index % colores.length];
  }
}