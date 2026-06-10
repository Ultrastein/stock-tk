import api from './client.js';
import { getToken } from '../store/state.js';
import { ApiError } from './client.js';

export const auth = {
  login:         (email, password) => api.post('/auth/login',          { email, password }, { noQueue: true, timeout: 60000 }),
  firebaseLogin: (idToken)         => api.post('/auth/firebase-login', { idToken },         { noQueue: true, timeout: 60000 }),
  perfil:        ()                => api.get('/auth/perfil', { timeout: 30000 }),
};

export async function warmup() {
  try {
    const base = (window.API_BASE_URL || 'http://localhost:3000/api').replace('/api', '');
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 55000);
    await fetch(`${base}/health`, { method: 'GET', signal: ctrl.signal });
    clearTimeout(tid);
  } catch (_) { /* silence — just waking Render free tier */ }
}

export const usuarios = {
  listar:      ()          => api.get('/usuarios'),
  crear:       (data)      => api.post('/usuarios', data),
  actualizar:  (id, data)  => api.put(`/usuarios/${id}`, data),
  desactivar:  (id)        => api.patch(`/usuarios/${id}/desactivar`),
  reactivar:   (id)        => api.patch(`/usuarios/${id}/reactivar`),
};

export const categorias = {
  listar:    ()          => api.get('/categorias'),
  crear:     (data)      => api.post('/categorias', data),
  actualizar:(id, data)  => api.put(`/categorias/${id}`, data),
  eliminar:  (id)        => api.delete(`/categorias/${id}`),
};

export const ubicaciones = {
  listar:    ()          => api.get('/ubicaciones'),
  crear:     (data)      => api.post('/ubicaciones', data),
  actualizar:(id, data)  => api.put(`/ubicaciones/${id}`, data),
  eliminar:  (id)        => api.delete(`/ubicaciones/${id}`),
};

export const productos = {
  listar:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/productos?${qs}` : '/productos');
  },
  obtener:    (id)          => api.get(`/productos/${id}`),
  crear:      (data)        => api.post('/productos', data),
  actualizar: (id, data)    => api.put(`/productos/${id}`, data),
  eliminar:   (id)          => api.delete(`/productos/${id}`),
};

export const activos = {
  listar:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/activos?${qs}` : '/activos');
  },
  obtener:    (id)          => api.get(`/activos/${id}`),
  crear:      (data)        => api.post('/activos', data),
  actualizar: (id, data)    => api.put(`/activos/${id}`, data),
  porSerie:   (serie)       => api.get(`/activos/serie/${encodeURIComponent(serie)}`),
  porQR:      (codigo)      => api.get(`/activos/qr/${encodeURIComponent(codigo)}`),
};

export const kits = {
  listar:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/kits?${qs}` : '/kits');
  },
  obtener:  (id)          => api.get(`/kits/${id}`),
  crear:    (data)        => api.post('/kits', data),
  checkout: (id, data)    => api.post(`/kits/${id}/checkout`, data),
  checkin:  (id, data)    => api.post(`/kits/${id}/checkin`, data),
  porQR:    (codigo)      => api.get(`/kits/qr/${encodeURIComponent(codigo)}`),
  despachoActivo: (id)   => api.get(`/kits/${id}/despacho-activo`, { noQueue: true }),
};

export const despachos = {
  listar:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/despachos?${qs}` : '/despachos');
  },
  obtener:    (id)          => api.get(`/despachos/${id}`),
  crear:      (data)        => api.post('/despachos', data),
  actualizar: (id, data)    => api.patch(`/despachos/${id}`, data),
  checkin:    (id, data)    => api.post(`/despachos/${id}/checkin`, data),
  cancelar:   (id)          => api.patch(`/despachos/${id}/cancelar`),
};

export const reservas = {
  listar:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/reservas?${qs}` : '/reservas');
  },
  obtener:    (id)          => api.get(`/reservas/${id}`),
  crear:      (data)        => api.post('/reservas', data),
  actualizar: (id, data)    => api.patch(`/reservas/${id}`, data),
  confirmar:  (id)          => api.patch(`/reservas/${id}/confirmar`),
  cancelar:   (id)          => api.patch(`/reservas/${id}/cancelar`),
};

export const tickets = {
  listar:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/tickets?${qs}` : '/tickets');
  },
  obtener:       (id)          => api.get(`/tickets/${id}`),
  crear:         (data)        => api.post('/tickets', data),
  avanzarEstado: (id, data)    => api.patch(`/tickets/${id}/estado`, data),
  asignarTecnico:(id, data)    => api.patch(`/tickets/${id}/tecnico`, data),
};

export const pedidos = {
  listar:               (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/pedidos?${qs}` : '/pedidos');
  },
  obtener:              (id)          => api.get(`/pedidos/${id}`),
  crear:                (data)        => api.post('/pedidos', data),
  actualizar:           (id, data)    => api.patch(`/pedidos/${id}`, data),
  avanzarEstado:        (id, data)    => api.patch(`/pedidos/${id}/estado`, data),
  agregarCotizacion:    (id, data)    => api.post(`/pedidos/${id}/cotizaciones`, data),
  seleccionarCotizacion:(id, cotId)   => api.patch(`/pedidos/${id}/cotizaciones/${cotId}/seleccionar`),
};

export const alertas = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/alertas?${qs}` : '/alertas');
  },
  marcarLeida:       (id) => api.patch(`/alertas/${id}/leer`),
  marcarTodasLeidas: ()   => api.patch('/alertas/leer-todas'),
};

export const historial = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `/historial?${qs}` : '/historial');
  },
};

export const proveedores = {
  listar:    (params = {}) => { const qs = new URLSearchParams(params).toString(); return api.get(qs ? `/proveedores?${qs}` : '/proveedores'); },
  obtener:   (id)          => api.get(`/proveedores/${id}`),
  crear:     (data)        => api.post('/proveedores', data),
  actualizar:(id, data)    => api.put(`/proveedores/${id}`, data),
  eliminar:  (id)          => api.delete(`/proveedores/${id}`),
};

export const inventario = {
  listar:       ()             => api.get('/inventario'),
  obtener:      (id)           => api.get(`/inventario/${id}`),
  crear:        (data)         => api.post('/inventario', data),
  iniciar:      (id)           => api.post(`/inventario/${id}/iniciar`, {}),
  actualizarItem:(id, itemId, data) => api.patch(`/inventario/${id}/items/${itemId}`, data),
  finalizar:    (id)           => api.post(`/inventario/${id}/finalizar`, {}),
};

export const mantenimientoPreventivo = {
  listar:        (params = {}) => { const qs = new URLSearchParams(params).toString(); return api.get(qs ? `/mantenimiento-preventivo?${qs}` : '/mantenimiento-preventivo'); },
  crear:         (data)        => api.post('/mantenimiento-preventivo', data),
  actualizar:    (id, data)    => api.put(`/mantenimiento-preventivo/${id}`, data),
  marcarEjecutado:(id)         => api.post(`/mantenimiento-preventivo/${id}/ejecutar`, {}),
  eliminar:      (id)          => api.delete(`/mantenimiento-preventivo/${id}`),
};

export const presupuesto = {
  listar:        (params = {}) => { const qs = new URLSearchParams(params).toString(); return api.get(qs ? `/presupuesto?${qs}` : '/presupuesto'); },
  crear:         (data)        => api.post('/presupuesto', data),
  actualizar:    (id, data)    => api.put(`/presupuesto/${id}`, data),
  registrarGasto:(id, monto)   => api.post(`/presupuesto/${id}/gasto`, { monto }),
  eliminar:      (id)          => api.delete(`/presupuesto/${id}`),
};

export const reportes = {
  resumen:          ()       => api.get('/reportes/resumen'),
  prestamosActivos: ()       => api.get('/reportes/prestamos-activos'),
  stockCritico:     ()       => api.get('/reportes/stock-critico'),
  garantias:        ()       => api.get('/reportes/garantias'),
  movimientosMes:   ()       => api.get('/reportes/movimientos-mes'),
  presupuestoAnio:  (anio)   => api.get(`/reportes/presupuesto/${anio}`),
};

export const importacion = {
  subir: async (formData) => {
    const token = getToken();
    const url   = (window.API_BASE_URL || 'http://localhost:3000/api') + '/importacion';
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    formData, // No poner Content-Type — el browser setea el boundary automáticamente
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`);
      return data;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(503, 'Sin conexión al servidor.');
    }
  },
};

export default { auth, usuarios, categorias, ubicaciones, productos, activos, kits, despachos, reservas, tickets, pedidos, alertas, historial, importacion, proveedores, inventario, mantenimientoPreventivo, presupuesto, reportes };
