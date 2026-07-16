import { Routes } from '@angular/router';

import { Login } from './pages/login/login'; // Asegúrate de importar el componente
import { Inicio } from './pages/inicio/inicio';
import { PerfilComponent } from './pages/perfil/perfil';
import { CanvasDetalle } from './pages/canvas-detalle/canvas-detalle';
import { ProyectosJefeComponent } from './pages/proyectos-jefe/proyectos-jefe';
import { ReportesComponent } from './pages/reportes/reportes';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },  

  { path: 'login', component: Login },
  { path: 'inicio', component: Inicio },
  { path: 'perfil', component: PerfilComponent },
  { path: 'canvas-detalle', component: CanvasDetalle },
  { path: 'proyectos-jefe', component: ProyectosJefeComponent },
  { path: 'reportes', component: ReportesComponent },

 // Carga el login por defecto
  { path: '**', redirectTo: '/login' }
];