import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/firebase";
import {
  type EspecialidadEnCurso,
  type EstadoEspecialidad,
  etiquetaEstadoEspecialidad,
} from "@/src/lib/especialidadEnCurso";

export type EspecialidadAvanceNotif = {
  estado: EstadoEspecialidad;
  estadoAnterior: EstadoEspecialidad | null;
  mensaje: string;
  fecha: string;
  visto: boolean;
};

export type EspecialidadAvanceHistorialDoc = {
  conquisId: string;
  pin: string;
  nombre: string;
  unidad: string;
  area: string;
  categoria: string;
  especialidad: string;
  estadoAnterior: EstadoEspecialidad | null;
  estadoNuevo: EstadoEspecialidad;
  tipo: "asignacion" | "cambio_estado";
  origen: "individual" | "unidad";
  createdAt: string;
};

export type EspecialidadAvanceHistorialEntry = EspecialidadAvanceHistorialDoc & {
  id: string;
};

export function mensajeCambioEstadoEspecialidad(params: {
  especialidad: string;
  estadoAnterior: EstadoEspecialidad | null;
  estadoNuevo: EstadoEspecialidad;
  origen: "individual" | "unidad";
  unidad?: string;
}): string {
  const { especialidad, estadoAnterior, estadoNuevo, origen, unidad } = params;
  if (estadoAnterior === null) {
    return `Se te asignó «${especialidad}» — estado: ${etiquetaEstadoEspecialidad(estadoNuevo)}.`;
  }
  if (origen === "unidad" && unidad) {
    return `Tu unidad «${unidad}» actualizó «${especialidad}»: ${etiquetaEstadoEspecialidad(estadoAnterior)} → ${etiquetaEstadoEspecialidad(estadoNuevo)}.`;
  }
  return `«${especialidad}» pasó de ${etiquetaEstadoEspecialidad(estadoAnterior)} a ${etiquetaEstadoEspecialidad(estadoNuevo)}.`;
}

export function parseNotificacionAvance(raw: unknown): EspecialidadAvanceNotif | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<EspecialidadAvanceNotif & { estadoAnterior?: unknown }>;
  if (!o.mensaje || !o.fecha || !o.estado) return null;
  return {
    estado: o.estado as EstadoEspecialidad,
    estadoAnterior:
      o.estadoAnterior === null || o.estadoAnterior === undefined
        ? null
        : (o.estadoAnterior as EstadoEspecialidad),
    mensaje: String(o.mensaje),
    fecha: String(o.fecha),
    visto: Boolean(o.visto),
  };
}

export function parseHistorialAvanceDoc(
  id: string,
  raw: Record<string, unknown>
): EspecialidadAvanceHistorialEntry {
  return {
    id,
    conquisId: String(raw.conquisId ?? ""),
    pin: String(raw.pin ?? ""),
    nombre: String(raw.nombre ?? ""),
    unidad: String(raw.unidad ?? ""),
    area: String(raw.area ?? ""),
    categoria: String(raw.categoria ?? ""),
    especialidad: String(raw.especialidad ?? ""),
    estadoAnterior:
      raw.estadoAnterior === null || raw.estadoAnterior === undefined
        ? null
        : (raw.estadoAnterior as EstadoEspecialidad),
    estadoNuevo: raw.estadoNuevo as EstadoEspecialidad,
    tipo: raw.tipo === "asignacion" ? "asignacion" : "cambio_estado",
    origen: raw.origen === "unidad" ? "unidad" : "individual",
    createdAt: String(raw.createdAt ?? ""),
  };
}

export async function registrarAvanceEspecialidad(params: {
  conquisId: string;
  pin: string;
  nombre: string;
  unidad: string;
  esp: EspecialidadEnCurso;
  estadoAnterior: EstadoEspecialidad | null;
  estadoNuevo: EstadoEspecialidad;
  tipo: "asignacion" | "cambio_estado";
  origen: "individual" | "unidad";
}): Promise<void> {
  const fecha = new Date().toISOString();
  const mensaje = mensajeCambioEstadoEspecialidad({
    especialidad: params.esp.especialidad,
    estadoAnterior: params.estadoAnterior,
    estadoNuevo: params.estadoNuevo,
    origen: params.origen,
    unidad: params.unidad,
  });

  try {
    await addDoc(collection(db, "especialidadAvanceHistorial"), {
      conquisId: params.conquisId,
      pin: params.pin,
      nombre: params.nombre,
      unidad: params.unidad,
      area: params.esp.area,
      categoria: params.esp.categoria,
      especialidad: params.esp.especialidad,
      estadoAnterior: params.estadoAnterior,
      estadoNuevo: params.estadoNuevo,
      tipo: params.tipo,
      origen: params.origen,
      createdAt: fecha,
    } satisfies EspecialidadAvanceHistorialDoc);
  } catch (err) {
    console.warn(
      "No se pudo guardar especialidadAvanceHistorial (revisa reglas Firestore):",
      err
    );
  }

  await updateDoc(doc(db, "RegistroConquis", params.conquisId), {
    especialidadAvanceNotif: {
      estado: params.estadoNuevo,
      estadoAnterior: params.estadoAnterior,
      mensaje,
      fecha,
      visto: false,
    },
  });
}

export async function marcarNotificacionAvanceVista(conquisId: string): Promise<void> {
  await updateDoc(doc(db, "RegistroConquis", conquisId), {
    "especialidadAvanceNotif.visto": true,
  });
}

export function formatearFechaAvance(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
