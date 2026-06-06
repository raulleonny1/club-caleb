import { doc } from "firebase/firestore";
import { db } from "@/src/firebase";

/** Documento único editable desde Admin → Calendario */
export const RETO_MIEMBRO_DOC_REF = doc(db, "config", "retoMiembroDashboard");

export type RetoMiembroDashboardConfig = {
  activo: boolean;
  etiqueta: string;
  titulo: string;
  textoBoton: string;
  /** Si tiene valor, el botón abre esta URL (WhatsApp, formulario, etc.) */
  urlBoton: string;
  mostrarIconoFondo: boolean;
  /** Cambia cada vez que admin guarda el reto; las aceptaciones van ligadas a esta versión. */
  retoVersionId?: string;
};

export const DEFAULT_RETO_MIEMBRO: RetoMiembroDashboardConfig = {
  activo: true,
  etiqueta: "Reto Especial",
  titulo: "Aprende 5 nudos nuevos y gana 200 XP extra",
  textoBoton: "¡Aceptar Reto!",
  urlBoton: "",
  mostrarIconoFondo: true,
};

export function mergeRetoConfig(data: Partial<RetoMiembroDashboardConfig> | undefined): RetoMiembroDashboardConfig {
  const d = data || {};
  return {
    ...DEFAULT_RETO_MIEMBRO,
    ...d,
    activo: typeof d.activo === "boolean" ? d.activo : DEFAULT_RETO_MIEMBRO.activo,
    mostrarIconoFondo:
      typeof d.mostrarIconoFondo === "boolean" ? d.mostrarIconoFondo : DEFAULT_RETO_MIEMBRO.mostrarIconoFondo,
    etiqueta: typeof d.etiqueta === "string" ? d.etiqueta : DEFAULT_RETO_MIEMBRO.etiqueta,
    titulo: typeof d.titulo === "string" ? d.titulo : DEFAULT_RETO_MIEMBRO.titulo,
    textoBoton: typeof d.textoBoton === "string" ? d.textoBoton : DEFAULT_RETO_MIEMBRO.textoBoton,
    urlBoton: typeof d.urlBoton === "string" ? d.urlBoton : DEFAULT_RETO_MIEMBRO.urlBoton,
    retoVersionId: typeof d.retoVersionId === "string" ? d.retoVersionId : undefined,
  };
}

/** Id estable del reto activo (usa retoVersionId de Firebase o hash del texto si aún no se guardó). */
export function versionIdRetoMiembro(
  config: Pick<RetoMiembroDashboardConfig, "retoVersionId" | "titulo" | "etiqueta">
): string {
  const guardado = config.retoVersionId?.trim();
  if (guardado) return guardado;
  const base = `${config.titulo}|${config.etiqueta}`.trim();
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  }
  return `legacy_${Math.abs(h).toString(36)}`;
}
