import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';

Chart.register(...registerables);

@Component({
  selector: 'app-mi-progreso',
  standalone: true,
  imports: [CommonModule, RouterModule, KpiCardComponent],
  templateUrl: './mi-progreso.html',
  styleUrls: ['./mi-progreso.css']
})
export class MiProgresoComponent implements OnInit, OnDestroy, AfterViewInit {

  // Elementos del DOM para los Canvas
  @ViewChild('chartProductividadCanvas') chartProductividadCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartDistribucionCanvas') chartDistribucionCanvas!: ElementRef<HTMLCanvasElement>;

  // Estado de Carga
  datosCargados = false;

  // Variables de Sesión
  rolUsuario: string = '';
  codPersonaActual: number = 0;
  nombreUsuario: string = 'Usuario';

  // Listas de Datos Procesadas
  canvasList: any[] = [];
  tareasList: any[] = [];
  proyectosList: any[] = [];
  actividadesRecientes: any[] = [];

  // KPIs
  kpiTareasCompletadas: number = 0;
  kpiTareasPendientes: number = 0;
  kpiProgresoPromedio: number = 0;
  kpiCanvasActivos: number = 0;

  // Referencias a Gráficos
  private chartProductividad: Chart | null = null;
  private chartDistribucion: Chart | null = null;

  // URL Base de la API
  private API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    this.codPersonaActual = Number(localStorage.getItem('codPersona') || 0);
    const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.nombreUsuario = nombreCompleto.split(' ')[0];

    this.cargarDatos();
  }

  ngAfterViewInit() {
    // Si los datos ya se cargaron por alguna razón, se inicializan
    if (this.datosCargados) {
      this.inicializarGraficos();
    }
  }

  ngOnDestroy() {
    this.destruirGraficos();
  }

  sincronizarDatos() {
    this.cargarDatos();
  }

  // ==========================================
  // CARGA DE DATOS DE LA API
  // ==========================================
  cargarDatos() {
    this.datosCargados = false;
    this.cdr.detectChanges();

    const canvas$ = this.http.get<any>(`${this.API_URL}/sc/canvas?page=0&size=500`).pipe(catchError(() => of([])));
    const tareas$ = this.http.get<any>(`${this.API_URL}/sc/tarea/persona/${this.codPersonaActual}?page=0&size=2000`).pipe(catchError(() => of({ content: [] })));
    const proyectos$ = this.http.get<any>(`${this.API_URL}/t/proyecto?page=0&size=500`).pipe(catchError(() => of([])));
    const historial$ = this.http.get<any>(`${this.API_URL}/sc/historial`).pipe(catchError(() => of([])));

    forkJoin({
      canvas: canvas$,
      tareas: tareas$,
      proyectos: proyectos$,
      historial: historial$
    }).subscribe({
      next: (res) => {
        // 1. Filtrar Canvas pertenecientes al analista logueado
        const todosCanvas = this.extractContent(res.canvas);
        this.canvasList = todosCanvas.filter((c: any) => Number(c.codPersona) === this.codPersonaActual);

        // 2. Extraer Tareas
        this.tareasList = this.extractContent(res.tareas);

        // 3. Extraer Proyectos
        this.proyectosList = this.extractContent(res.proyectos);

        // 4. Extraer Historial y filtrar por analista
        const todosHistorial = Array.isArray(res.historial) ? res.historial : (res.historial?.data || []);
        this.actividadesRecientes = todosHistorial
          .filter((h: any) => Number(h.codPersona) === this.codPersonaActual)
          .sort((a: any, b: any) => new Date(b.fecAccion).getTime() - new Date(a.fecAccion).getTime())
          .slice(0, 8); // 8 más recientes para la timeline

        // 5. Calcular KPIs Básicos
        this.calcularKPIs();

        // 6. Carga secundaria de etapas para clasificar tareas en el gráfico de dona
        this.cargarEtapasYGraficos();
      },
      error: (err) => {
        console.error('Error cargando datos en forkJoin:', err);
        this.datosCargados = true;
        this.cdr.detectChanges();
      }
    });
  }

  // Carga de etapas para saber cuál es la primera etapa de cada canvas
  private cargarEtapasYGraficos() {
    if (this.canvasList.length === 0) {
      this.datosCargados = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.inicializarGraficos();
      }, 50);
      return;
    }

    const canvasDetalles$ = this.canvasList.map(c => 
      this.http.get<any>(`${this.API_URL}/sc/canvas/${c.codCanvas}`).pipe(catchError(() => of(c)))
    );

    forkJoin(canvasDetalles$).subscribe({
      next: (detalles) => {
        const canvasConEtapas = detalles.map(d => d.data || d);
        
        // Activar vista
        this.datosCargados = true;
        this.cdr.detectChanges();

        // Renderizar gráficos
        setTimeout(() => {
          this.inicializarGraficos(canvasConEtapas);
        }, 50);
      },
      error: (err) => {
        console.error('Error cargando etapas de canvas:', err);
        this.datosCargados = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.inicializarGraficos();
        }, 50);
      }
    });
  }

  // ==========================================
  // CÁLCULO DE KPIs
  // ==========================================
  private calcularKPIs() {
    this.kpiTareasCompletadas = this.tareasList.filter((t: any) => t.vigente === 0).length;
    this.kpiTareasPendientes = this.tareasList.filter((t: any) => t.vigente === 1).length;
    this.kpiCanvasActivos = this.canvasList.length;

    const totalTareas = this.tareasList.length;
    this.kpiProgresoPromedio = totalTareas > 0 
      ? Math.round((this.kpiTareasCompletadas / totalTareas) * 100) 
      : 0;
  }

  // ==========================================
  // INICIALIZACIÓN DE GRÁFICOS
  // ==========================================
  private inicializarGraficos(canvasConEtapas: any[] = []) {
    this.destruirGraficos();

    this.renderizarProductividadSemanal();
    this.renderizarDistribucionTareas(canvasConEtapas);
  }

  // Gráfico de Área Suave (Spline) - Tareas Completadas por Semana
  private renderizarProductividadSemanal() {
    if (!this.chartProductividadCanvas) return;

    const ctx = this.chartProductividadCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const hoy = new Date();
    const semanas: { label: string; start: Date; end: Date; count: number }[] = [];

    // Generar últimas 8 semanas retroactivamente
    for (let i = 7; i >= 0; i--) {
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - (i * 7) - hoy.getDay() + 1); // lunes de esa semana
      inicioSemana.setHours(0, 0, 0, 0);

      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      finSemana.setHours(23, 59, 59, 999);

      let label = `Hace ${i} sem.`;
      if (i === 0) label = 'Esta Semana';
      if (i === 1) label = 'Semana Anterior';

      semanas.push({
        label: label,
        start: inicioSemana,
        end: finSemana,
        count: 0
      });
    }

    // Contar tareas del analista que fueron completadas en cada semana
    this.tareasList.forEach(t => {
      if (t.vigente === 0 && t.fecModificacion) {
        const fechaT = new Date(t.fecModificacion);
        for (const sem of semanas) {
          if (fechaT >= sem.start && fechaT <= sem.end) {
            sem.count++;
            break;
          }
        }
      }
    });

    const labels = semanas.map(s => s.label);
    const datos = semanas.map(s => s.count);

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(146, 146, 219, 0.45)');
    gradient.addColorStop(1, 'rgba(146, 146, 219, 0.01)');

    this.chartProductividad = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tareas Completadas',
          data: datos,
          borderColor: '#9292DB',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4, // Suavizado Spline
          pointBackgroundColor: '#9292DB',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'inherit', weight: 'bold' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { family: 'inherit', size: 11, weight: 600 }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#6B7280',
              font: { family: 'inherit', size: 11 }
            },
            grid: { color: '#E5E7EB' }
          }
        }
      }
    });
  }

  // Gráfico de Dona: Por hacer, En progreso, Completadas
  private renderizarDistribucionTareas(canvasConEtapas: any[]) {
    if (!this.chartDistribucionCanvas) return;

    const ctx = this.chartDistribucionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    let porHacer = 0;
    let enProgreso = 0;
    let completadas = 0;

    // Crear mapa de canvas y sus etapas ordenadas
    const mapCanvasEtapas = new Map<number, number[]>(); // codCanvas -> Array de codEtapa
    canvasConEtapas.forEach(c => {
      const etapasRaw = c.etapasPersonalizadas || c.etapas || [];
      const ordenadas = [...etapasRaw]
        .sort((a: any, b: any) => (a.numEtapa || 0) - (b.numEtapa || 0))
        .map((e: any) => Number(e.codEtapa));
      mapCanvasEtapas.set(Number(c.codCanvas), ordenadas);
    });

    this.tareasList.forEach(t => {
      if (t.vigente === 0) {
        completadas++;
      } else {
        const canvasId = t.codCanvas || (t.etapa && t.etapa.codCanvas);
        const etapas = mapCanvasEtapas.get(Number(canvasId));

        if (etapas && etapas.length > 0) {
          const firstStageId = etapas[0];
          if (Number(t.codEtapa) === firstStageId) {
            porHacer++;
          } else {
            enProgreso++;
          }
        } else {
          // Fallback si no hay etapas
          porHacer++;
        }
      }
    });

    // Si no hay tareas, mostrar valores vacíos pero consistentes
    const dataValues = [porHacer, enProgreso, completadas];
    const isNoData = porHacer === 0 && enProgreso === 0 && completadas === 0;

    this.chartDistribucion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Por hacer', 'En progreso', 'Completadas'],
        datasets: [{
          data: isNoData ? [1, 0, 0] : dataValues, // placeholder si no hay tareas
          backgroundColor: isNoData ? ['#E5E7EB'] : [
            '#F59E0B', // Por hacer: Amber Warning
            '#3B82F6', // En progreso: Blue Info
            '#10B981'  // Completadas: Emerald Success
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: { family: 'inherit', size: 11, weight: 600 },
              color: '#374151'
            }
          },
          tooltip: {
            enabled: !isNoData,
            callbacks: {
              label: function(context) {
                const val = context.raw;
                return ` Tareas: ${val}`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // ==========================================
  // MÉTODOS AUXILIARES Y ACCIONES DE VISTA
  // ==========================================
  private destruirGraficos() {
    if (this.chartProductividad) {
      this.chartProductividad.destroy();
      this.chartProductividad = null;
    }
    if (this.chartDistribucion) {
      this.chartDistribucion.destroy();
      this.chartDistribucion = null;
    }
  }

  private extractContent(res: any): any[] {
    const raw = res && res.data ? res.data : res;
    if (!raw) return [];
    return raw.content ? raw.content : (Array.isArray(raw) ? raw : []);
  }

  obtenerNombreProyecto(codPyto: number): string {
    if (!codPyto) return 'Sin Proyecto';
    const proj = this.proyectosList.find(p => p.codPyto === codPyto);
    return proj ? proj.nomPyto : `Proyecto ${codPyto}`;
  }

  obtenerPorcentajeCanvas(canvas: any): number {
    if (canvas.porcentajeProgreso !== undefined) {
      return Math.round(canvas.porcentajeProgreso);
    }
    const total = canvas.totalTareas || 0;
    const completadas = canvas.tareasCompletadas || 0;
    return total > 0 ? Math.round((completadas / total) * 100) : 0;
  }

  abrirCanvas(codCanvas: number) {
    this.router.navigate(['/canvas-detalle'], { queryParams: { id: codCanvas } });
  }

  obtenerClaseAccion(accion: string): string {
    if (!accion) return '';
    const a = accion.toLowerCase();
    if (a.includes('crear') || a.includes('nueva')) return 'badge-crear';
    if (a.includes('mover') || a.includes('desplazar')) return 'badge-mover';
    if (a.includes('bloquear') || a.includes('editar') || a.includes('modificar') || a.includes('actualizar') || a.includes('eliminar')) {
      return 'badge-modificar';
    }
    return '';
  }
}
