import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Proyecto } from '../models/proyecto.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  private extractData(res: any): any {
    return res && res.data ? res.data : res;
  }

  private extractList(res: any): any[] {
    const data = this.extractData(res);
    if (!data) return [];
    return data.content ? data.content : (Array.isArray(data) ? data : []);
  }

  obtenerProyectos(page: number = 0, size: number = 200): Observable<Proyecto[]> {
    return this.http.get<any>(`${this.API_URL}/t/proyecto?page=${page}&size=${size}`).pipe(
      map(res => this.extractList(res))
    );
  }

  obtenerProyectosActivos(): Observable<Proyecto[]> {
    return this.http.get<any>(`${this.API_URL}/t/proyecto/activos`).pipe(
      map(res => this.extractList(res))
    );
  }

  obtenerAnalistasPorProyecto(idProyecto: number): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/t/pytopers/proyecto/${idProyecto}`).pipe(
      map(res => this.extractList(res))
    );
  }
}
