import { nombreCategoria, toNumberPuntos } from "@/src/lib/categoriasPuntos";

export type MovimientoPuntosHistorial = {
  id?: string;
  pin?: string;
  fecha?: string;
  tipo?: string;
  origen?: string;
  alcance?: string;
  unidad?: string;
  categoriaId?: string;
  catalogoNombre?: string;
  catalogoId?: string;
  motivoTexto?: string;
  motivo?: string;
  puntos?: Record<string, unknown>;
  totalEvento?: number;
  etiquetaActividad?: string;
};

export function puntosMovimientoHistorial(reg: MovimientoPuntosHistorial): number {
  if (typeof reg.totalEvento === "number" && reg.totalEvento > 0) {
    return reg.totalEvento;
  }
  if (!reg.puntos) return 0;
  return Object.values(reg.puntos).reduce<number>(
    (acc, v) => acc + toNumberPuntos(v),
    0
  );
}

export function tituloMovimientoHistorial(reg: MovimientoPuntosHistorial): string {
  if (reg.catalogoNombre?.trim()) return reg.catalogoNombre.trim();
  if (reg.etiquetaActividad?.trim()) return reg.etiquetaActividad.trim();
  if (reg.categoriaId) return nombreCategoria(reg.categoriaId);
  if (reg.puntos) {
    const key = Object.keys(reg.puntos).find((k) => toNumberPuntos(reg.puntos![k]) > 0);
    if (key) return nombreCategoria(key);
  }
  if (reg.tipo === "resta") {
    return reg.motivoTexto || reg.motivo || "Resta de puntos";
  }
  return "Movimiento de puntos";
}

export function esMovimientoUnidad(reg: MovimientoPuntosHistorial): boolean {
  if (reg.alcance === "unidad") return true;
  return String(reg.pin ?? "").startsWith("unidad_");
}

/** Actividades recientes para el dashboard (personales + de unidad del miembro). */
export function actividadesRecientesMiembro(
  historialPersonal: MovimientoPuntosHistorial[],
  historialUnidad: MovimientoPuntosHistorial[],
  limite = 8
): { reg: MovimientoPuntosHistorial; esUnidad: boolean }[] {
  const personal = historialPersonal.map((reg) => ({ reg, esUnidad: false }));
  const unidad = historialUnidad.map((reg) => ({ reg, esUnidad: true }));
  return [...personal, ...unidad]
    .filter(({ reg }) => puntosMovimientoHistorial(reg) > 0 || reg.tipo === "resta")
    .sort((a, b) => (b.reg.fecha || "").localeCompare(a.reg.fecha || ""))
    .slice(0, limite);
}
