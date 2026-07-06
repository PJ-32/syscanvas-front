import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  canvasList: any[] = [];
  canvasFiltrados: any[] = [];
  proyectosList: any[] = [];
  empleadosList: any[] = [];
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
  
  nuevoCanvas: any = {
    nomCanvas: '',
    desCanvas: '',
    vincularProyecto: 'SI',
    codPyto: '',
    codPersona: '',
    tipCanvas: ''
  };
  etapasPersonalizadas: any[] = [];

  private API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    this.codPersonaActual = Number(localStorage.getItem('codPersona') || 0);
    const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.nombreUsuario = nombreCompleto.split(' ')[0];
    
    this.actualizarFecha();
    this.cargarDatosIniciales();
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

    const endpointCanvas = this.rolUsuario === 'ROLE_ANALISTA' 
      ? `${this.API_URL}/sc/canvas?page=0&size=100` 
      : `${this.API_URL}/sc/canvas`;

    this.http.get<any>(endpointCanvas).subscribe({
      next: (res) => {
        // SOLUCIÓN AL BUG: Extraemos la lista sin importar la envoltura de Spring Boot
        const raw = res.data ? res.data : res;
        let todosCanvas = raw.content ? raw.content : (Array.isArray(raw) ? raw : []);

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
    this.http.get<any>(`${this.API_URL}/t/proyecto/activos`).subscribe(res => {
      const raw = res.data ? res.data : res;
      this.proyectosList = raw.content ? raw.content : (Array.isArray(raw) ? raw : []);
    });

    // Cargas exclusivas del Jefe
    if (this.rolUsuario === 'ROLE_JEFE') {
      this.http.get<any>(`${this.API_URL}/t/empleado/activos`).subscribe(res => {
        const raw = res.data ? res.data : res;
        this.empleadosList = raw.content ? raw.content : (Array.isArray(raw) ? raw : []);
      });
      
      this.http.get<any>(`${this.API_URL}/sc/tipo-canvas`).subscribe(res => {
        const raw = res.data ? res.data : res;
        const tipos = raw.content ? raw.content : (Array.isArray(raw) ? raw : []);
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
      let coincideTexto = true;
      if (this.rolUsuario === 'ROLE_JEFE' && this.filtroProyecto) {
        coincideTexto = c.codPyto == this.filtroProyecto;
      } else if (this.rolUsuario === 'ROLE_ANALISTA' && this.filtroNombreCanvas) {
        coincideTexto = c.nomCanvas && c.nomCanvas.toLowerCase().includes(this.filtroNombreCanvas.toLowerCase());
      }

      let coincideEstado = true;
      if (this.filtroEstado !== '') {
        const busquedaEditable = this.filtroEstado === 'true';
        coincideEstado = c.editable === busquedaEditable;
      }

      return coincideTexto && coincideEstado;
    });
  }

  obtenerNombreProyecto(codPyto: number): string {
    const proyecto = this.proyectosList.find(p => p.codPyto === codPyto);
    return proyecto ? proyecto.nomPyto : 'Sin proyecto';
  }

  verCanvas(codCanvas: number) {
    this.router.navigate(['/canvas-detalle'], { queryParams: { id: codCanvas } });
  }

  // ==========================================
  // LÓGICA DEL MODAL CREAR CANVAS
  // ==========================================
  abrirModalCrearCanvas() {
    this.modoCreacion = null;
    this.nuevoCanvas = { vincularProyecto: 'SI', codPyto: '', codPersona: '', tipCanvas: '' };
    this.etapasPersonalizadas = [];
    this.modalCrearAbierto = true;
  }

  cerrarModalCrearCanvas() {
    this.modalCrearAbierto = false;
  }

  seleccionarOpcion(tipo: string) {
    this.modoCreacion = tipo;
    if (tipo === 'blanco') {
      this.etapasPersonalizadas = [{ nomEtapa: '' }, { nomEtapa: '' }, { nomEtapa: '' }];
    }
  }

  volverPaso1() {
    this.modoCreacion = null;
    this.nuevoCanvas = { vincularProyecto: 'SI', codPyto: '', codPersona: '', tipCanvas: '' };
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

    if (!this.nuevoCanvas.nomCanvas) {
      alert("El nombre del canvas es obligatorio");
      return;
    }

    if (this.nuevoCanvas.vincularProyecto === 'SI' && !this.nuevoCanvas.codPyto) {
      alert("Debe seleccionar un proyecto si desea vincularlo");
      return;
    }

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
    } else {
      const etapasValidas = this.etapasPersonalizadas.filter(e => e.nomEtapa.trim() !== '');
      if (etapasValidas.length === 0) {
        alert("Agregue al menos una etapa válida");
        return;
      }
      payload.tipoCanvas = { tipCanvas: 'F', desTipCanvas: "Libre", vigente: 1 };
      payload.etapasPersonalizadas = etapasValidas.map((e, i) => ({
        nomEtapa: e.nomEtapa.trim(),
        desEtapa: '',
        numEtapa: i + 1,
        vigente: 1
      }));
    }

    this.guardandoCanvas = true;

    this.http.post<any>(`${this.API_URL}/sc/canvas`, payload).subscribe({
      next: (res) => {
        alert("Canvas creado correctamente");
        this.guardandoCanvas = false;
        this.cerrarModalCrearCanvas();
        
        if (payload.etapasPersonalizadas && res.data?.id) {
          this.guardarEtapasPersonalizadas(res.data.id, payload.etapasPersonalizadas);
        } else {
          this.cargarDatosIniciales();
        }
      },
      error: (err) => {
        console.error(err);
        alert("Error al crear el canvas");
        this.guardandoCanvas = false;
      }
    });
  }

  private guardarEtapasPersonalizadas(codCanvas: number, etapas: any[]) {
    let completadas = 0;
    etapas.forEach(etapa => {
      this.http.post(`${this.API_URL}/sc/etapa`, { ...etapa, canvas: { codCanvas } }).subscribe({
        next: () => {
          completadas++;
          if (completadas === etapas.length) this.cargarDatosIniciales();
        },
        error: () => {
          completadas++;
          if (completadas === etapas.length) this.cargarDatosIniciales();
        }
      });
    });
  }
}