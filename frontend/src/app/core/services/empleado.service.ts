import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Empleado } from '../models/empleado.model';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
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

  obtenerEmpleadosActivos(): Observable<Empleado[]> {
    return this.http.get<any>(`${this.API_URL}/t/empleado/activos`).pipe(
      map(res => this.extractList(res))
    );
  }
}
