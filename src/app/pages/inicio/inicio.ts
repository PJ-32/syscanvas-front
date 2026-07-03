import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importantes para @for y [(ngModel)]
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

  // Filtros (Bindeados con ngModel)
  filtroProyecto: string = '';
  filtroEstado: string = '';
  filtroNombreCanvas: string = '';

  // Estadísticas (Dinámicas)
  stat1: number | string = 0;
  stat2: number = 0;
  stat3: number = 0;
  stat4: number | string = 0;

  // URL base de tu API
  private API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

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
  // CARGA DE DATOS (FUSIONADA)
  // ==========================================
  cargarDatosIniciales() {
    this.cargando = true;

    // 1. Cargamos Canvas
    const endpointCanvas = this.rolUsuario === 'ROLE_ANALISTA' 
      ? `${this.API_URL}/sc/canvas?page=0&size=100` // El back los trae todos y filtramos
      : `${this.API_URL}/sc/canvas`;

    this.http.get<any>(endpointCanvas).subscribe({
      next: (res) => {
        let todosCanvas = res.data?.content || res.data || [];
        
        // Si es analista, filtramos solo los suyos
        if (this.rolUsuario === 'ROLE_ANALISTA') {
          this.canvasList = todosCanvas.filter((c: any) => c.codPersona === this.codPersonaActual);
        } else {
          this.canvasList = todosCanvas;
        }

        this.canvasFiltrados = [...this.canvasList];
        this.calcularEstadisticas();
        this.cargando = false;
      },
      error: (err) => { console.error("Error cargando canvas", err); this.cargando = false; }
    });

    // 2. Cargamos Proyectos (Ambos roles los necesitan para los nombres en las tarjetas)
    this.http.get<any>(`${this.API_URL}/t/proyecto/activos`).subscribe(res => {
      this.proyectosList = res.data?.content || res.data || [];
    });

    // 3. Cargas exclusivas del Jefe (Para el modal de Crear Canvas)
    if (this.rolUsuario === 'ROLE_JEFE') {
      this.http.get<any>(`${this.API_URL}/t/empleado/activos`).subscribe(res => {
        this.empleadosList = res.data?.content || res.data || [];
      });
      
      this.http.get<any>(`${this.API_URL}/sc/tipo-canvas`).subscribe(res => {
        this.tiposCanvasList = (res.data || []).filter((t: any) => t.vigente === 1 && t.tipCanvas !== 'F');
      });
    }
  }

  // ==========================================
  // ESTADÍSTICAS INTELIGENTES
  // ==========================================
  calcularEstadisticas() {
    let totalTareas = 0;
    let tareasCompletadas = 0;

    this.canvasList.forEach(c => {
      totalTareas += (c.totalTareas || 0);
      tareasCompletadas += (c.tareasCompletadas || 0);
    });

    if (this.rolUsuario === 'ROLE_JEFE') {
      // Stats Jefe
      const proyectosUnicos = new Set(this.canvasList.map(c => c.codPyto).filter(Boolean)).size;
      this.stat1 = proyectosUnicos; // Proyectos activos
      this.stat2 = this.canvasList.length; // Canvas creados
      this.stat3 = totalTareas;
      this.stat4 = tareasCompletadas;
    } else {
      // Stats Analista
      const pendientes = totalTareas - tareasCompletadas;
      const progresoGeneral = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
      
      this.stat1 = this.canvasList.length; // Canvas asignados
      this.stat2 = pendientes;
      this.stat3 = tareasCompletadas;
      this.stat4 = `${progresoGeneral}%`;
    }
  }

  // ==========================================
  // FILTROS
  // ==========================================
  aplicarFiltros() {
    this.canvasFiltrados = this.canvasList.filter(c => {
      
      // 1. Filtro por Proyecto (Jefe) o Nombre (Analista)
      let coincideTexto = true;
      if (this.rolUsuario === 'ROLE_JEFE' && this.filtroProyecto) {
        coincideTexto = c.codPyto == this.filtroProyecto;
      } else if (this.rolUsuario === 'ROLE_ANALISTA' && this.filtroNombreCanvas) {
        coincideTexto = c.nomCanvas.toLowerCase().includes(this.filtroNombreCanvas.toLowerCase());
      }

      // 2. Filtro por Estado
      let coincideEstado = true;
      if (this.filtroEstado !== '') {
        const busquedaEditable = this.filtroEstado === 'true';
        coincideEstado = c.editable === busquedaEditable;
      }

      return coincideTexto && coincideEstado;
    });
  }

  // ==========================================
  // UTILIDADES DE LA VISTA
  // ==========================================
  obtenerNombreProyecto(codPyto: number): string {
    const proyecto = this.proyectosList.find(p => p.codPyto === codPyto);
    return proyecto ? proyecto.nomPyto : 'Sin proyecto';
  }

  verCanvas(codCanvas: number) {
    // Aquí implementaremos el Router a la página de detalles luego
    console.log("Navegando al detalle del canvas:", codCanvas);
  }

  abrirModalCrearCanvas() {
    console.log("Abriendo modal Crear Canvas...");
  }
}