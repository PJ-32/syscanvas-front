import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Obtenemos el token que guardó tu Login
  const token = localStorage.getItem('token');

  // 2. Si existe el token, clonamos la petición original y le pegamos el header
  if (token) {
    const peticionClonada = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    // Enviamos la petición modificada a Java
    return next(peticionClonada);
  }

  // Si no hay token (ej. cuando recién está haciendo login), la deja pasar normal
  return next(req);
};