import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CanvasService } from '../../core/services/canvas.service';
import { ProyectoService } from '../../core/services/proyecto.service';
import { EmpleadoService } from '../../core/services/empleado.service';
import { Canvas } from '../../core/models/canvas.model';
import { Proyecto } from '../../core/models/proyecto.model';
import { Empleado } from '../../core/models/empleado.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class Inicio implements OnInit {

  // Variables de Sesión
  rolUsuario: string = '';
  nombreUsuario: string = 'Usuario';
  codPersonaActual: number = 0;
  fechaActual: string = '';
  cargando: boolean = false;

  // Listas de Datos Globales
  canvasList: Canvas[] = [];
  canvasFiltrados: Canvas[] = [];
  proyectosList: Proyecto[] = [];
  empleadosList: Empleado[] = [];
  tiposCanvasList: any[] = [];

  // Filtros
  filtroProyecto: string = '';
  filtroEstado: string = '';
  filtroNombreCanvas: string = '';

  // Estadísticas
  stat1: number | string = 0;
  stat2: number = 0;
  stat3: number = 0;
  stat4: number | string = 0;

  // ==========================================
  // VARIABLES DEL MODAL CREAR CANVAS
  // ==========================================
  modalCrearAbierto: boolean = false;
  modoCreacion: string | null = null;
  guardandoCanvas: boolean = false;

  // Variables para Alertas del Modal
  errorCanvas: string = '';
  exitoCanvas: string = '';

  nuevoCanvas: any = {
    nomCanvas: '',
    desCanvas: '',
    vincularProyecto: 'SI',
    codPyto: '',
    codPersona: '',
    tipCanvas: ''
  };
  etapasPersonalizadas: any[] = [];

  // Variables del Modal de Edición
  modalEditarAbierto: boolean = false;
  guardandoEdicion: boolean = false;
  errorEditarCanvas: string = '';
  exitoEditarCanvas: string = '';
  canvasEditando: any = { nomCanvas: '', desCanvas: '', codPersona: '' };

  constructor(
    private canvasService: CanvasService,
    private proyectoService: ProyectoService,
    private empleadoService: EmpleadoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    this.codPersonaActual = Number(localStorage.getItem('codPersona') || 0);
    const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.nombreUsuario = nombreCompleto.split(' ')[0];

    this.actualizarFecha();
    this.cargarDatosIniciales();

    // Suscripción a queryParams para la apertura automática del modal
    this.route.queryParams.subscribe(params => {
      if (params['crear'] === 'true') {
        this.abrirModalCrearCanvas();

        // Limpiamos los query params para que recargar la página no vuelva a abrir el modal
        this.router.navigate([], {
          queryParams: { crear: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  actualizarFecha() {
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.fechaActual = new Date().toLocaleDateString('es-ES', opciones);
  }

  // ==========================================
  // EXTRACCIÓN DE DATOS ROBUSTA
  // ==========================================
  cargarDatosIniciales() {
    this.cargando = true;

    const sizeLimit = this.rolUsuario === 'ROLE_ANALISTA' ? 100 : 500;

    this.canvasService.obtenerCanvas(0, sizeLimit).subscribe({
      next: (todosCanvas) => {
        if (this.rolUsuario === 'ROLE_ANALISTA') {
          this.canvasList = todosCanvas.filter((c: any) => Number(c.codPersona) === this.codPersonaActual);
        } else {
          this.canvasList = todosCanvas;
        }

        this.canvasFiltrados = [...this.canvasList];
        this.calcularEstadisticas();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error cargando canvas", err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });

    // Cargar Proyectos
    this.proyectoService.obtenerProyectosActivos().subscribe(proyectos => {
      this.proyectosList = proyectos;
    });

    // Cargar Empleados para todos los roles
    this.empleadoService.obtenerEmpleadosActivos().subscribe(empleados => {
      this.empleadosList = empleados;
    });

    // Cargas exclusivas del Jefe
    if (this.rolUsuario === 'ROLE_JEFE') {
      this.canvasService.obtenerTiposCanvas().subscribe(tipos => {
        this.tiposCanvasList = tipos.filter((t: any) => t.vigente === 1 && t.tipCanvas !== 'F');
      });
    }
  }

  calcularEstadisticas() {
    let totalTareas = 0;
    let tareasCompletadas = 0;

    this.canvasList.forEach(c => {
      totalTareas += (c.totalTareas || 0);
      tareasCompletadas += (c.tareasCompletadas || 0);
    });

    if (this.rolUsuario === 'ROLE_JEFE') {
      const proyectosUnicos = new Set(this.canvasList.map(c => c.codPyto).filter(Boolean)).size;
      this.stat1 = proyectosUnicos;
      this.stat2 = this.canvasList.length;
      this.stat3 = totalTareas;
      this.stat4 = tareasCompletadas;
    } else {
      const pendientes = totalTareas - tareasCompletadas;
      const progresoGeneral = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
      this.stat1 = this.canvasList.length;
      this.stat2 = pendientes;
      this.stat3 = tareasCompletadas;
      this.stat4 = `${progresoGeneral}%`;
    }
  }

  aplicarFiltros() {
    this.canvasFiltrados = this.canvasList.filter(c => {
      // Filtro por Proyecto (solo Jefe)
      let coincideProyecto = true;
      if (this.rolUsuario === 'ROLE_JEFE' && this.filtroProyecto) {
        if (this.filtroProyecto === 'SIN_PROYECTO') {
          coincideProyecto = !c.codPyto;
        } else {
          coincideProyecto = String(c.codPyto || '') === this.filtroProyecto;
        }
      }

      // Buscador por Nombre de Canvas (para ambos roles)
      let coincideNombre = true;
      if (this.filtroNombreCanvas) {
        coincideNombre = !!(c.nomCanvas && c.nomCanvas.toLowerCase().includes(this.filtroNombreCanvas.toLowerCase()));
      }

      // Filtro por Estado (Editable/Bloqueado)
      let coincideEstado = true;
      if (this.filtroEstado !== '') {
        const busquedaEditable = this.filtroEstado === 'true';
        coincideEstado = c.editable === busquedaEditable;
      }

      return coincideProyecto && coincideNombre && coincideEstado;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroNombreCanvas = '';
    this.filtroProyecto = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  obtenerNombreProyecto(codPyto?: number): string {
    if (!codPyto) return 'Sin proyecto';
    const proyecto = this.proyectosList.find(p => p.codPyto === codPyto);
    return proyecto ? proyecto.nomPyto : `Proyecto ${codPyto}`;
  }

  obtenerNombreAnalista(canvas: any): string {
    if (canvas.empleado) {
      return `${canvas.empleado.nombre} ${canvas.empleado.apellido}`;
    }
    if (canvas.empleadoInfo) {
      const empInfo = canvas.empleadoInfo;
      if (empInfo.nombre && empInfo.apellido) {
        return `${empInfo.nombre} ${empInfo.apellido}`;
      }
    }
    if (canvas.codPersona && this.empleadosList && this.empleadosList.length > 0) {
      const emp = this.empleadosList.find(e => Number(e.codPersona) === Number(canvas.codPersona));
      if (emp) {
        return `${emp.nombre} ${emp.apellido}`;
      }
    }
    return 'Sin asignar';
  }

  verCanvas(codCanvas: number) {
    this.router.navigate(['/canvas-detalle'], { queryParams: { id: codCanvas } });
  }

  // ==========================================
  // LÓGICA DEL MODAL CREAR CANVAS
  // ==========================================
  abrirModalCrearCanvas() {
    this.limpiarAlertasCanvas();
    this.modoCreacion = null;
    this.nuevoCanvas = { vincularProyecto: 'SI', codPyto: '', codPersona: '', tipCanvas: '' };
    this.etapasPersonalizadas = [];
    this.modalCrearAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalCrearCanvas() {
    this.modalCrearAbierto = false;
    this.limpiarAlertasCanvas();
    this.cdr.detectChanges();
  }

  limpiarAlertasCanvas() {
    this.errorCanvas = '';
    this.exitoCanvas = '';
  }

  seleccionarOpcion(tipo: string) {
    this.modoCreacion = tipo;
    if (tipo === 'blanco') {
      this.etapasPersonalizadas = [{ nomEtapa: '' }, { nomEtapa: '' }, { nomEtapa: '' }];
    }
  }

  volverPaso1() {
    this.limpiarAlertasCanvas();
    this.modoCreacion = null;
    this.nuevoCanvas = { vincularProyecto: 'SI', codPyto: '', codPersona: '', tipCanvas: '' };
    this.cdr.detectChanges();
  }

  agregarEtapa() {
    this.etapasPersonalizadas.push({ nomEtapa: '' });
  }

  eliminarEtapa(index: number) {
    this.etapasPersonalizadas.splice(index, 1);
  }

  cambioVincularProyecto() {
    if (this.nuevoCanvas.vincularProyecto === 'NO') {
      this.nuevoCanvas.codPyto = '';
    }
  }

  crearCanvas(event: Event) {
    event.preventDefault();
    this.limpiarAlertasCanvas();
    this.cdr.detectChanges();

    if (!this.nuevoCanvas.nomCanvas) {
      alert("El nombre del canvas es obligatorio");
      this.cdr.detectChanges();
      return;
    }

    if (this.nuevoCanvas.vincularProyecto === 'SI' && !this.nuevoCanvas.codPyto) {
      alert("Debe seleccionar un proyecto si desea vincularlo");
      this.cdr.detectChanges();
      return;
    }

    // 1. Estructura base del Canvas
    const payload: any = {
      nomCanvas: this.nuevoCanvas.nomCanvas,
      desCanvas: this.nuevoCanvas.desCanvas,
      codPyto: this.nuevoCanvas.codPyto ? Number(this.nuevoCanvas.codPyto) : null,
      codPersona: this.nuevoCanvas.codPersona ? Number(this.nuevoCanvas.codPersona) : null,
      editable: true,
      estado: { codEstado: 1, nomEstado: "Activo", desEstado: "Canvas activo", vigente: 1 }
    };

    if (this.modoCreacion === 'plantilla') {
      if (!this.nuevoCanvas.tipCanvas) {
        alert("Seleccione una plantilla");
        return;
      }
      payload.tipoCanvas = { tipCanvas: this.nuevoCanvas.tipCanvas, desTipCanvas: "Plantilla", vigente: 1 };

      // Enviamos el array vacío, el Factory de Java (tu SC_EtapaPlantillaFactory) se encargará de llenarlo
      payload.etapasPersonalizadas = [];

    } else {
      const etapasValidas = this.etapasPersonalizadas.filter((e: any) => e.nomEtapa.trim() !== '');
      if (etapasValidas.length === 0) {
        alert("Agregue al menos una etapa válida");
        this.cdr.detectChanges();
        return;
      }

      payload.tipoCanvas = { tipCanvas: 'F', desTipCanvas: "Libre", vigente: 1 };

      // 2. ¡DEVOLVEMOS LAS ETAPAS AL PAYLOAD! Spring Boot las guardará en cascada
      payload.etapasPersonalizadas = etapasValidas.map((e: any, i: number) => ({
        nomEtapa: e.nomEtapa.trim(),
        desEtapa: '',
        numEtapa: i + 1,
        vigente: 1
      }));
    }

    this.guardandoCanvas = true;
    this.cdr.detectChanges();

    // 3. Un solo envío, una sola transacción en base de datos
    this.canvasService.crearCanvas(payload).subscribe({
      next: (res) => {
        this.guardandoCanvas = false;
        this.exitoCanvas = "¡Canvas creado correctamente!";
        this.cdr.detectChanges();

        // Cierra el modal automáticamente después de 2 segundos
        setTimeout(() => {
          this.cerrarModalCrearCanvas();
          this.cargarDatosIniciales();
        }, 2000);
      },
      error: (err) => {
        console.error("Error del servidor:", err);
        this.guardandoCanvas = false;

        // 4. Captura Robusta de Errores (Idéntica a tu Login)
        if (err.error && err.error.errores && err.error.errores.length > 0) {
          // Si Spring Boot envía una lista de errores de validación
          this.errorCanvas = err.error.errores.join(' - ');
        } else if (err.error && err.error.mensaje) {
          // Si Spring Boot envía un mensaje específico (ej. "El nombre del canvas ya existe")
          this.errorCanvas = err.error.mensaje;
        } else if (err.error && typeof err.error === 'string') {
          // Si envía texto plano
          this.errorCanvas = err.error;
        } else if (err.status === 409 || err.status === 500) {
          // Fallback en caso de que la base de datos rechace la duplicidad pero no haya un JSON claro
          this.errorCanvas = "No se pudo crear. Es posible que ya exista un Canvas con este nombre exacto.";
        } else {
          // Fallback por defecto
          this.errorCanvas = "Error inesperado al crear el canvas. Revisa tu conexión.";
        }

        this.cdr.detectChanges();
      }
    });
  }

  editarCanvas(canvas: any) {
    this.canvasEditando = {
      ...canvas,
      codPersona: canvas.codPersona || ''
    };
    this.errorEditarCanvas = '';
    this.exitoEditarCanvas = '';
    this.modalEditarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModalEditarCanvas() {
    this.modalEditarAbierto = false;
    this.errorEditarCanvas = '';
    this.exitoEditarCanvas = '';
    this.cdr.detectChanges();
  }

  guardarEdicionCanvas(event: Event) {
    event.preventDefault();
    this.errorEditarCanvas = '';
    this.exitoEditarCanvas = '';

    if (!this.canvasEditando.nomCanvas) {
      alert("El nombre del canvas es obligatorio");
      return;
    }

    this.guardandoEdicion = true;
    this.cdr.detectChanges();

    const payload = {
      ...this.canvasEditando,
      codPersona: this.canvasEditando.codPersona ? Number(this.canvasEditando.codPersona) : null,
      codPyto: this.canvasEditando.codPyto ? Number(this.canvasEditando.codPyto) : null
    };

    this.canvasService.actualizarCanvas(this.canvasEditando.codCanvas, payload).subscribe({
      next: (res) => {
        this.guardandoEdicion = false;
        this.exitoEditarCanvas = "¡Canvas actualizado correctamente!";
        this.cdr.detectChanges();

        setTimeout(() => {
          this.cerrarModalEditarCanvas();
          this.cargarDatosIniciales();
        }, 1500);
      },
      error: (err) => {
        console.error("Error al actualizar canvas:", err);
        this.guardandoEdicion = false;
        this.errorEditarCanvas = err.error?.mensaje || "Error al guardar los cambios del canvas.";
        this.cdr.detectChanges();
      }
    });
  }

  toggleBloqueoCanvas(canvas: any) {
    this.canvasService.toggleEditable(canvas.codCanvas).subscribe({
      next: (res) => {
        canvas.editable = res.editable;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cambiar estado del canvas:", err);
        alert("No se pudo cambiar el estado del canvas");
      }
    });
  }

  eliminarCanvas(codCanvas: number) {
    if (confirm("¿Está seguro de que desea eliminar este canvas de forma permanente? Esta acción no se puede deshacer y borrará todas sus etapas y tareas.")) {
      this.canvasService.eliminarCanvas(codCanvas).subscribe({
        next: () => {
          alert("Canvas eliminado con éxito");
          this.cargarDatosIniciales();
        },
        error: (err) => {
          console.error("Error al eliminar canvas:", err);
          alert("No se pudo eliminar el canvas seleccionado.");
        }
      });
    }
  }
}