import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card';

// Registrar todos los módulos necesarios de Chart.js
Chart.register(...registerables);

interface LeaderboardAnalista {
  codPersona: number;
  nombreCompleto: string;
  avatarUrl: string;
  iniciales: string;
  colorAvatar: string;
  totalTareas: number;
  tareasCompletadas: number;
  tasaEfectividad: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiCardComponent],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class ReportesComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // Elementos HTML de los Gráficos
  @ViewChild('chartProyectosCanvas') chartProyectosCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTiempoCanvas') chartTiempoCanvas!: ElementRef<HTMLCanvasElement>;

  // Variables de Sesión
  rolUsuario: string = '';
  nombreUsuario: string = 'Usuario';
  cargando: boolean = false;

  // Listas de Datos Globales
  proyectosList: any[] = [];
  canvasList: any[] = [];
  tareasList: any[] = [];
  empleadosList: any[] = [];

  // Filtros
  proyectoFiltro: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';

  // KPIs
  kpiProyectosActivos: number = 0;
  kpiCanvasTotales: number = 0;
  kpiTareasTotales: number = 0;
  kpiProgresoPromedio: number = 0;

  // Leaderboard
  topAnalistas: LeaderboardAnalista[] = [];

  // Referencias a los Gráficos
  private chartProyectos: Chart | null = null;
  private chartTiempo: Chart | null = null;

  // URL base
  private API_URL = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.rolUsuario = localStorage.getItem('rol') || '';
    const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Usuario';
    this.nombreUsuario = nombreCompleto.split(' ')[0];

    this.cargarDatosBase();
  }

  ngAfterViewInit() {
    // Si los datos ya se cargaron, renderizamos los gráficos
    if (!this.cargando && this.proyectosList.length > 0) {
      this.actualizarGraficosyKPIs();
    }
  }

  ngOnDestroy() {
    // Destruir gráficos al salir del componente para evitar fugas de memoria
    this.destruirGraficos();
  }

  cargarDatosBase() {
    this.cargando = true;
    this.cdr.detectChanges();

    // Carga paralela de Proyectos, Canvas, Tareas y Empleados
    this.http.get<any>(`${this.API_URL}/t/proyecto?page=0&size=200`).subscribe({
      next: (resP) => {
        const rawP = resP.data ? resP.data : resP;
        this.proyectosList = rawP.content ? rawP.content : (Array.isArray(rawP) ? rawP : []);

        this.http.get<any>(`${this.API_URL}/sc/canvas?page=0&size=500`).subscribe({
          next: (resC) => {
            const rawC = resC.data ? resC.data : resC;
            this.canvasList = rawC.content ? rawC.content : (Array.isArray(rawC) ? rawC : []);

            this.http.get<any>(`${this.API_URL}/sc/tarea?page=0&size=2000`).subscribe({
              next: (resT) => {
                const rawT = resT.data ? resT.data : resT;
                this.tareasList = rawT.content ? rawT.content : (Array.isArray(rawT) ? rawT : []);

                this.http.get<any>(`${this.API_URL}/t/empleado/activos`).subscribe({
                  next: (resE) => {
                    const rawE = resE.data ? resE.data : resE;
                    this.empleadosList = rawE.content ? rawE.content : (Array.isArray(rawE) ? rawE : []);

                    this.cargando = false;
                    this.actualizarGraficosyKPIs();
                    this.cdr.detectChanges();
                  },
                  error: (err) => this.manejarError('empleados', err)
                });
              },
              error: (err) => this.manejarError('tareas', err)
            });
          },
          error: (err) => this.manejarError('canvas', err)
        });
      },
      error: (err) => this.manejarError('proyectos', err)
    });
  }

  // ==========================================
  // FILTRADO Y AGREGACIÓN DE DATOS (BI)
  // ==========================================
  actualizarGraficosyKPIs() {
    let canvasFiltrados = [...this.canvasList];
    let tareasFiltradas = [...this.tareasList];

    // 1. Filtrar por Proyecto
    if (this.proyectoFiltro) {
      const projId = Number(this.proyectoFiltro);
      canvasFiltrados = this.canvasList.filter(c => c.codPyto === projId);
      
      const codCanvasFiltrados = canvasFiltrados.map(c => c.codCanvas);
      tareasFiltradas = this.tareasList.filter(t => {
        const canvasId = t.codCanvas || (t.etapa && t.etapa.codCanvas);
        return canvasId && codCanvasFiltrados.includes(canvasId);
      });
    }

    // 2. Filtrar por Fechas
    if (this.fechaDesde) {
      const inicio = new Date(this.fechaDesde);
      inicio.setHours(0, 0, 0, 0);
      tareasFiltradas = tareasFiltradas.filter(t => new Date(t.fecCreacion) >= inicio);
    }
    if (this.fechaHasta) {
      const fin = new Date(this.fechaHasta);
      fin.setHours(23, 59, 59, 999);
      tareasFiltradas = tareasFiltradas.filter(t => new Date(t.fecCreacion) <= fin);
    }

    // 3. Calcular KPIs
    this.calcularKPIs(canvasFiltrados, tareasFiltradas);

    // 4. Calcular Leaderboard de Analistas
    this.calcularLeaderboard(tareasFiltradas);

    // 5. Renderizar o actualizar los gráficos de Chart.js
    setTimeout(() => {
      this.renderizarGraficoProyectos(canvasFiltrados);
      this.renderizarGraficoEvolucion(tareasFiltradas);
    }, 50);

    this.cdr.detectChanges();
  }

  calcularKPIs(canvas: any[], tareas: any[]) {
    // Proyectos activos únicos en el subconjunto de canvas filtrados
    if (this.proyectoFiltro) {
      const p = this.proyectosList.find(proj => proj.codPyto === Number(this.proyectoFiltro));
      this.kpiProyectosActivos = p && p.vigente === 1 ? 1 : 0;
    } else {
      this.kpiProyectosActivos = this.proyectosList.filter(p => p.vigente === 1).length;
    }

    this.kpiCanvasTotales = canvas.length;
    this.kpiTareasTotales = tareas.length;

    const completadas = tareas.filter(t => t.vigente === 0).length;
    this.kpiProgresoPromedio = this.kpiTareasTotales > 0 
      ? Math.round((completadas / this.kpiTareasTotales) * 100) 
      : 0;
  }

  calcularLeaderboard(tareas: any[]) {
    const agrupado: { [key: number]: { total: number; completadas: number } } = {};
    
    // Contar tareas totales y completadas por persona
    tareas.forEach(t => {
      if (t.codPersona) {
        const personaId = Number(t.codPersona);
        if (!agrupado[personaId]) {
          agrupado[personaId] = { total: 0, completadas: 0 };
        }
        agrupado[personaId].total++;
        if (t.vigente === 0) {
          agrupado[personaId].completadas++;
        }
      }
    });

    // Mapear analistas con su información y calcular efectividad
    const analistas: LeaderboardAnalista[] = this.empleadosList.map(e => {
      const stats = agrupado[Number(e.codPersona)] || { total: 0, completadas: 0 };
      const tasa = stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;
      
      return {
        codPersona: e.codPersona,
        nombreCompleto: `${e.nombre} ${e.apellido}`,
        avatarUrl: e.fotoUrl && e.fotoUrl !== '/uploads/default-foto.png' ? `${this.API_URL}${e.fotoUrl}` : '',
        iniciales: this.obtenerIniciales(e.nombre, e.apellido),
        colorAvatar: this.obtenerColorAvatar(e.nombre),
        totalTareas: stats.total,
        tareasCompletadas: stats.completadas,
        tasaEfectividad: tasa
      };
    });

    // Ordenar por tareas completadas (productividad) descendentemente y tomar el Top 5
    this.topAnalistas = analistas
      .sort((a, b) => b.tareasCompletadas - a.tareasCompletadas)
      .slice(0, 5);
  }

  // ==========================================
  // RENDERIZADO DE GRÁFICOS (CHART.JS)
  // ==========================================
  renderizarGraficoProyectos(canvas: any[]) {
    if (!this.chartProyectosCanvas) return;

    const ctx = this.chartProyectosCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chartProyectos) {
      this.chartProyectos.destroy();
    }

    // Agrupar tareas por proyecto
    const porProyecto: { [key: number]: { nombre: string; total: number; completadas: number } } = {};
    canvas.forEach(c => {
      if (c.codPyto) {
        const pytoId = Number(c.codPyto);
        if (!porProyecto[pytoId]) {
          const proj = this.proyectosList.find(p => p.codPyto === pytoId);
          porProyecto[pytoId] = {
            nombre: proj ? proj.nomPyto : `Proyecto ${pytoId}`,
            total: 0,
            completadas: 0
          };
        }
        porProyecto[pytoId].total += (c.totalTareas || 0);
        porProyecto[pytoId].completadas += (c.tareasCompletadas || 0);
      }
    });

    const labels = Object.values(porProyecto).map(p => 
      p.nombre.length > 18 ? p.nombre.substring(0, 15) + '...' : p.nombre
    );
    const progresos = Object.values(porProyecto).map(p => 
      p.total > 0 ? Math.round((p.completadas / p.total) * 100) : 0
    );

    // Si no hay datos, mostrar aviso
    if (labels.length === 0) {
      labels.push('Sin Datos');
      progresos.push(0);
    }

    this.chartProyectos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: progresos,
          backgroundColor: [
            '#9292DB', // Indigo
            '#10B981', // Success Emerald
            '#F59E0B', // Warning Amber
            '#3B82F6', // Sky Info
            '#EC4899', // Pink
            '#8B5CF6', // Violet
            '#06B6D4', // Cyan
            '#EF4444'  // Error Red
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 12
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
              font: {
                family: 'inherit',
                size: 11,
                weight: 600
              },
              color: '#374151'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw;
                return ` ${context.label}: ${val}% de Progreso`;
              }
            }
          }
        },
        cutout: '65%' // Hace la dona más estilizada y delgada (estilo ejecutivo)
      }
    });
  }

  renderizarGraficoEvolucion(tareas: any[]) {
    if (!this.chartTiempoCanvas) return;

    const ctx = this.chartTiempoCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chartTiempo) {
      this.chartTiempo.destroy();
    }

    // Filtrar solo tareas completadas (vigente === 0)
    const completadas = tareas.filter(t => t.vigente === 0 && t.fecModificacion);

    let labels: string[] = [];
    let datos: number[] = [];

    // Calcular la diferencia de días entre Desde y Hasta si existen filtros
    let diffDays = 0;
    if (this.fechaDesde && this.fechaHasta) {
      const d1 = new Date(this.fechaDesde);
      const d2 = new Date(this.fechaHasta);
      diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (this.fechaDesde && this.fechaHasta && diffDays <= 14) {
      // 1. Rango pequeño: agrupar por DÍA
      const dias: { [key: string]: number } = {};
      const d1 = new Date(this.fechaDesde);
      const d2 = new Date(this.fechaHasta);
      
      for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
        const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        dias[label] = 0;
      }

      completadas.forEach(t => {
        const fechaT = new Date(t.fecModificacion);
        const label = fechaT.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        if (dias[label] !== undefined) {
          dias[label]++;
        }
      });

      labels = Object.keys(dias);
      datos = Object.values(dias);

    } else if (this.fechaDesde && this.fechaHasta && diffDays > 60) {
      // 2. Rango muy grande: agrupar por MES
      const meses: { [key: string]: number } = {};
      const d1 = new Date(this.fechaDesde);
      const d2 = new Date(this.fechaHasta);

      for (let d = new Date(d1); d <= d2; d.setMonth(d.getMonth() + 1)) {
        const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        meses[label] = 0;
      }
      // Asegurarse de incluir el mes de destino
      const labelDest = d2.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      meses[labelDest] = 0;

      completadas.forEach(t => {
        const fechaT = new Date(t.fecModificacion);
        const label = fechaT.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (meses[label] !== undefined) {
          meses[label]++;
        }
      });

      labels = Object.keys(meses);
      datos = Object.values(meses);

    } else {
      // 3. Rango mediano o sin filtro: agrupar por SEMANA (últimas 8 semanas o las del rango)
      const semanas: { [key: string]: number } = {};
      const hoy = new Date();

      if (this.fechaDesde && this.fechaHasta) {
        const d1 = new Date(this.fechaDesde);
        const d2 = new Date(this.fechaHasta);
        
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 7)) {
          const key = `Semanas W${this.getWeekNumber(d)}`;
          semanas[key] = 0;
        }
        const keyDest = `Semanas W${this.getWeekNumber(d2)}`;
        semanas[keyDest] = 0;

        completadas.forEach(t => {
          const fechaT = new Date(t.fecModificacion);
          const key = `Semanas W${this.getWeekNumber(fechaT)}`;
          if (semanas[key] !== undefined) {
            semanas[key]++;
          }
        });
      } else {
        // Por defecto: últimas 8 semanas
        for (let i = 7; i >= 0; i--) {
          const fecha = new Date(hoy);
          fecha.setDate(fecha.getDate() - (i * 7));
          const key = `Semana W${this.getWeekNumber(fecha)}`;
          semanas[key] = 0;
        }

        completadas.forEach(t => {
          const fechaT = new Date(t.fecModificacion);
          const key = `Semana W${this.getWeekNumber(fechaT)}`;
          if (semanas[key] !== undefined) {
            semanas[key]++;
          }
        });
      }

      labels = Object.keys(semanas);
      datos = Object.values(semanas);
    }

    // Crear gradiente de relleno para el área
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(146, 146, 219, 0.45)');
    gradient.addColorStop(1, 'rgba(146, 146, 219, 0.01)');

    this.chartTiempo = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tareas Completadas',
          data: datos,
          borderColor: '#9292DB', // primary color
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4, // Suaviza la línea (Smooth Area Chart)
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
          legend: {
            display: false // Ocultamos leyenda para aspecto BI moderno
          },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            titleFont: { weight: 'bold' }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11,
                weight: 600
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#6B7280',
              font: {
                size: 11
              }
            },
            grid: {
              color: '#E5E7EB'
            }
          }
        }
      }
    });
  }

  // ==========================================
  // EXPORTACIÓN DE REPORTES (PDF)
  // ==========================================
  exportarPDF() {
    // Usamos el sistema nativo de impresión del navegador optimizado con estilos de impresión CSS.
    // Esto es robusto, vectorial y garantiza que no se rompan las dependencias en compilación.
    window.print();
  }

  // ==========================================
  // ACCIONES Y MÉTODOS AUXILIARES
  // ==========================================
  aplicarFiltros() {
    this.actualizarGraficosyKPIs();
  }

  restablecerFiltros() {
    this.proyectoFiltro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.actualizarGraficosyKPIs();
  }

  actualizarDatos() {
    this.cargarDatosBase();
  }

  private destruirGraficos() {
    if (this.chartProyectos) {
      this.chartProyectos.destroy();
      this.chartProyectos = null;
    }
    if (this.chartTiempo) {
      this.chartTiempo.destroy();
      this.chartTiempo = null;
    }
  }

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private obtenerIniciales(nombre: string, apellido: string): string {
    const n = nombre ? nombre.trim().charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.trim().charAt(0).toUpperCase() : '';
    return `${n}${a}` || '?';
  }

  private obtenerColorAvatar(nombre: string): string {
    if (!nombre) return '#9292DB';
    const colores = ['#9292DB', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4', '#0ea5e9', '#10b981', '#f59e0b'];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colores.length;
    return colores[index];
  }

  private manejarError(seccion: string, err: any) {
    console.error(`Error al cargar ${seccion} en Reportes:`, err);
    this.cargando = false;
    this.cdr.detectChanges();
  }
}
