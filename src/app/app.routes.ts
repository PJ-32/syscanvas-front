import { Routes } from '@angular/router';
import { PerfilComponent } from './pages/perfil/perfil';
import { Login } from './pages/login/login'; // Asegúrate de importar el componente

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'perfil', component: PerfilComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Carga el login por defecto
  { path: '**', redirectTo: '/login' }
];