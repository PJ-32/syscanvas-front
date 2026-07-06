import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

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
  canvasActual: any = null;
  canvasBloqueado: boolean = false;
  listaCanvas: any[] = [];
  etapasGlobal: any[] = [];
  
  codPersonaActual: number = 0;
  nombreCompleto: string = '';

  // Modales (Control de visibilidad)
  modalTareaAbierto: boolean = false;
  modalVerAbierto: boolean = false;
  modalEditarAbierto: boolean = false;
  modalEliminarAbierto: boolean = false;
  modalHistorialAbierto: boolean = false;

  // Variables para Formularios y UI
  nuevaTarea: any = { nomTarea: '', desTarea: '', codEtapa: '' };
  tareaSeleccionada: any = null;
  historial: any[] = [];
  toastMensaje: string = '';
  toastTipo: string = 'info';
  
  // Drag & Drop
  draggedTask: any = null;

  private API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.codPersonaActual = Number(localStorage.getItem('codPersona') || 0);
    this.nombreCompleto = localStorage.getItem('nombreCompleto') || `Usuario ${this.codPersonaActual}`;
    
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
    this.http.get<any>(`${this.API_URL}/sc/canvas`).subscribe(res => {
      const raw = res.data ? res.data : res;
      this.listaCanvas = raw.content ? raw.content : (Array.isArray(raw) ? raw : []);
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
    this.http.get<any>(`${this.API_URL}/sc/canvas/${this.canvasId}`).subscribe({
      next: (res) => {
        const canvas = res.data || res;
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
    this.http.put<any>(`${this.API_URL}/sc/canvas/${this.canvasId}/toggle`, {}).subscribe({
      next: (res) => {
        this.canvasActual.editable = res.data?.editable;
        this.canvasBloqueado = !this.canvasActual.editable;
        
        const accion = this.canvasBloqueado ? "Bloquear Canvas" : "Desbloquear Canvas";
        const detalle = `El usuario ${this.nombreCompleto} ${this.canvasBloqueado ? 'bloqueó' : 'desbloqueó'} el canvas.`;
        this.registrarHistorial(accion, detalle);
        
        this.cdr.detectChanges();
      },
      error: () => alert("No se pudo actualizar el estado del canvas")
    });
  }

  exportarCanvas() {
    this.http.get(`${this.API_URL}/sc/canvas/${this.canvasId}/exportar`, { responseType: 'blob' }).subscribe({
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

    this.http.post<any>(`${this.API_URL}/sc/canvas/importar`, formData).subscribe({
      next: (res) => {
        alert("Canvas importado correctamente");
        const nuevoId = res.data?.codCanvas;
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

    this.http.post<any>(`${this.API_URL}/sc/tarea/crear`, payload).subscribe({
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
    const payload = { ...this.tareaSeleccionada, etapa: { codEtapa: this.tareaSeleccionada.codEtapa } };
    
    this.http.put(`${this.API_URL}/sc/tarea/${this.tareaSeleccionada.codTarea}`, payload).subscribe({
      next: () => {
        this.modalEditarAbierto = false;
        this.registrarHistorial("Editar Tarea", `Se editó la tarea: "${this.tareaSeleccionada.nomTarea}"`);
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
    this.http.delete(`${this.API_URL}/sc/tarea/${this.tareaSeleccionada.codTarea}`).subscribe({
      next: () => {
        this.modalEliminarAbierto = false;
        this.registrarHistorial("Eliminar Tarea", `Se eliminó la tarea "${this.tareaSeleccionada.nomTarea}".`);
        this.mostrarToast("Tarea eliminada correctamente", "success");
        this.cargarCanvasDetalle();
      },
      error: () => alert("No se pudo eliminar la tarea")
    });
  }

  cambiarEstadoTarea(tarea: any) {
    if (this.canvasBloqueado) return this.mostrarToast("El canvas está bloqueado", "error");
    
    const estaCompleta = tarea.vigente === 0;
    const payload = { completar: !estaCompleta };

    this.http.put(`${this.API_URL}/sc/tarea/${tarea.codTarea}/estado`, payload).subscribe({
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

    this.http.put(`${this.API_URL}/sc/tarea/${this.draggedTask.codTarea}/mover/${codEtapaDestino}`, {}).subscribe({
      next: () => {
        this.registrarHistorial("Mover Tarea", `La tarea "${this.draggedTask.nomTarea}" fue movida de etapa.`);
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
    this.http.get<any>(`${this.API_URL}/sc/historial?codCanvas=${this.canvasId}`).subscribe({
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
    this.http.post(`${this.API_URL}/sc/historial`, payload).subscribe();
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