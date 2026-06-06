import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/src/firebase";

export const COLECCION_ACEPTACIONES_RETO = "retoMiembroAceptaciones";

export type AceptacionRetoMiembro = {
  pin: string;
  nombre: string;
  unidad: string;
  retoVersionId: string;
  tituloReto: string;
  aceptadoEn: string;
};

export function idDocAceptacionReto(retoVersionId: string, pin: string): string {
  const v = retoVersionId.trim() || "sin_version";
  const p = pin.trim();
  return `${v}__${p}`;
}

export function refAceptacionReto(retoVersionId: string, pin: string) {
  return doc(db, COLECCION_ACEPTACIONES_RETO, idDocAceptacionReto(retoVersionId, pin));
}

export async function registrarAceptacionRetoMiembro(
  datos: Omit<AceptacionRetoMiembro, "aceptadoEn">
): Promise<void> {
  const pin = datos.pin.trim();
  const retoVersionId = datos.retoVersionId.trim();
  if (!pin || !retoVersionId) {
    throw new Error("PIN y versión del reto son obligatorios.");
  }
  await setDoc(refAceptacionReto(retoVersionId, pin), {
    ...datos,
    pin,
    retoVersionId,
    aceptadoEn: new Date().toISOString(),
  });
}

export function nuevaVersionRetoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}`;
}
