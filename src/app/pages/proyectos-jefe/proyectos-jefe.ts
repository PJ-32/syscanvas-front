import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-proyectos-jefe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos-jefe.html',
  styleUrls: ['./proyectos-jefe.css']
})
export class ProyectosJefeComponent implements OnInit {
  
  // Variables de Sesión
  rolUsuario: string = '';
  nombreUsuario: string = 'Usuario';
  cargando: boolean = false;
  
  // Listas de Datos Globales
  proyectosList: any[] = [];
  proyectosFiltrados: any[] = [];
  canvasList: any[] = [];
  empleadosList: any[] = [];

  // Filtros
  filtroNombre: string = '';
  filtroEstado: string = '1'; // Activos por defecto, como en la versión antigua

  // Drawer / Detalle Proyecto
  drawerAbierto: boolean = false;
  proyectoSeleccionado: any = null;
  canvasProyecto: any[] = [];
  analistasProyecto: any[] = [];
  tabActivo: 'canvas' | 'estadisticas' = 'canvas';

  // KPIs del Proyecto Seleccionado
  kpiTotalCanvas: number = 0;
  kpiTotalTareas: number = 0;
  kpiProgresoPromedio: number = 0;

  // URL de la API (apuntando a Spring Boot)
  private API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.nombreUsuario = nombreCompleto.split(' ')[0];

    // Cargar todos los datos necesarios
    this.inicializarVista();
  }

  inicializarVista() {
    this.cargando = true;
    
    // Carga paralela de Proyectos, Canvas y Empleados para calcular estadísticas y asignar encargados
    this.http.get<any>(`${this.API_URL}/t/proyecto?page=0&size=100`).subscribe({
      next: (resProyectos) => {
        const rawP = resProyectos.data ? resProyectos.data : resProyectos;
        this.proyectosList = rawP.content ? rawP.content : (Array.isArray(rawP) ? rawP : []);

        this.http.get<any>(`${this.API_URL}/sc/canvas?page=0&size=200`).subscribe({
          next: (resCanvas) => {
            const rawC = resCanvas.data ? resCanvas.data : resCanvas;
            this.canvasList = rawC.content ? rawC.content : (Array.isArray(rawC) ? rawC : []);

            this.http.get<any>(`${this.API_URL}/t/empleado/activos`).subscribe({
              next: (resEmpleados) => {
                const rawE = resEmpleados.data ? resEmpleados.data : resEmpleados;
                this.empleadosList = rawE.content ? rawE.content : (Array.isArray(rawE) ? rawE : []);

                // Procesar proyectos y calcular estadísticas dinámicas
                this.procesarMetricasProyectos();
                this.aplicarFiltros();
                
                this.cargando = false;
                this.cdr.detectChanges();
              },
              error: (err) => this.manejarError('empleados', err)
            });
          },
          error: (err) => this.manejarError('canvas', err)
        });
      },
      error: (err) => this.manejarError('proyectos', err)
    });
  }

  procesarMetricasProyectos() {
    this.proyectosList.forEach(p => {
      const canvasProyecto = this.canvasList.filter(c => c.codPyto === p.codPyto);
      p.totalCanvas = canvasProyecto.length;
      
      const totalTareas = canvasProyecto.reduce((sum, c) => sum + (c.totalTareas || 0), 0);
      const tareasCompletadas = canvasProyecto.reduce((sum, c) => sum + (c.tareasCompletadas || 0), 0);
      
      p.totalTareas = totalTareas;
      p.tareasCompletadas = tareasCompletadas;
      p.progreso = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
    });
  }

  aplicarFiltros() {
    this.proyectosFiltrados = this.proyectosList.filter(p => {
      // Filtro de Texto (Nombre)
      const coincideTexto = !this.filtroNombre || p.nomPyto.toLowerCase().includes(this.filtroNombre.toLowerCase());
      
      // Filtro de Estado (Activos: vigente = 1, Inactivos: vigente = 0, Todos: '')
      let coincideEstado = true;
      if (this.filtroEstado !== '') {
        coincideEstado = p.vigente === Number(this.filtroEstado);
      }

      return coincideTexto && coincideEstado;
    });
    this.cdr.detectChanges();
  }

  limpiarFiltros() {
    this.filtroNombre = '';
    this.filtroEstado = '1';
    this.aplicarFiltros();
  }

  // ==========================================
  // LÓGICA DEL SLIDE-OVER DRAWER (WORKSPACE)
  // ==========================================
  abrirEspacioTrabajo(proyecto: any) {
    this.proyectoSeleccionado = proyecto;
    this.tabActivo = 'canvas';
    
    // Filtrar los canvas de este proyecto y precalcular su progreso individual
    this.canvasProyecto = this.canvasList.filter(c => c.codPyto === proyecto.codPyto).map(c => {
      const prog = c.totalTareas > 0 ? Math.round((c.tareasCompletadas / c.totalTareas) * 100) : 0;
      return { ...c, progreso: prog };
    });

    // Calcular KPIs específicos de este proyecto
    this.kpiTotalCanvas = this.canvasProyecto.length;
    this.kpiTotalTareas = this.canvasProyecto.reduce((sum, c) => sum + (c.totalTareas || 0), 0);
    const completadas = this.canvasProyecto.reduce((sum, c) => sum + (c.tareasCompletadas || 0), 0);
    this.kpiProgresoPromedio = this.kpiTotalTareas > 0 ? Math.round((completadas / this.kpiTotalTareas) * 100) : 0;

    // Cargar analistas asignados desde el backend (opcional pero aporta valor premium)
    this.analistasProyecto = [];
    this.http.get<any>(`${this.API_URL}/t/pytopers/proyecto/${proyecto.codPyto}`).subscribe({
      next: (res) => {
        const raw = res.data ? res.data : res;
        const asignaciones = Array.isArray(raw) ? raw : (raw.content ? raw.content : []);
        this.analistasProyecto = asignaciones.filter((a: any) => a.vigente === 1);
        this.cdr.detectChanges();
      },
      error: (err) => console.warn('No se pudieron obtener analistas para el proyecto:', err)
    });

    this.drawerAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarEspacioTrabajo() {
    this.drawerAbierto = false;
    // Retrasar el vaciado de variables para permitir que termine la animación de cierre CSS
    setTimeout(() => {
      this.proyectoSeleccionado = null;
      this.canvasProyecto = [];
      this.analistasProyecto = [];
      this.cdr.detectChanges();
    }, 300);
  }

  seleccionarTab(tab: 'canvas' | 'estadisticas') {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  verCanvasDetalle(codCanvas: number) {
    // Redirigir al detalle del canvas
    this.router.navigate(['/canvas-detalle'], { queryParams: { id: codCanvas } });
  }

  // ==========================================
  // MÉTODOS AUXILIARES DE RENDERIZACIÓN
  // ==========================================
  obtenerEncargado(codPersona: any): any {
    if (!codPersona) return null;
    const personaId = Number(codPersona);
    return this.empleadosList.find(e => Number(e.codPersona) === personaId);
  }

  obtenerIniciales(nombre: string, apellido: string): string {
    const iniNombre = nombre ? nombre.trim().charAt(0).toUpperCase() : '';
    const iniApellido = apellido ? apellido.trim().charAt(0).toUpperCase() : '';
    return `${iniNombre}${iniApellido}` || '?';
  }

  obtenerColorAvatar(nombre: string): string {
    if (!nombre) return '#6366f1'; // Indigo base
    const colores = [
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#0ea5e9', // Sky
      '#10b981', // Emerald
      '#f59e0b', // Amber
    ];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colores.length;
    return colores[index];
  }

  obtenerClaseProgreso(progreso: number): string {
    if (progreso < 30) return 'progreso-bajo';
    if (progreso < 70) return 'progreso-medio';
    return 'progreso-alto';
  }

  // Carga manual / actualizar
  actualizarVista() {
    this.inicializarVista();
  }

  private manejarError(seccion: string, err: any) {
    console.error(`Error al cargar ${seccion}:`, err);
    this.cargando = false;
    this.cdr.detectChanges();
  }
}
