import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/src/firebase";

export const COLECCIONES_RESPALDO = [
  "unidades",
  "consejeros",
  "aspirantesGuiaMayor",
  "directivaClub",
  "RegistroConquis",
  "calificaciones",
  "calificacionesSemanal",
  "calificacionesConquis",
  "eventos",
  "config",
  "retosEspeciales",
  "retoMiembroAceptaciones",
  "especialidadAvanceHistorial",
  "frasesSemana",
  "especialidades",
  "evaluacionesGuiaMayor",
  "tarjetaGuiaMayor",
  "actividadesTarjetaGuiaMayor",
  "fichasMedicas",
] as const;

export type NombreColeccionRespaldo = (typeof COLECCIONES_RESPALDO)[number];

export const VERSION_RESPALDO = 1;

export type DocumentosRespaldo = Record<string, Record<string, unknown>>;

export type ArchivoRespaldoFirestore = {
  version: number;
  exportedAt: string;
  app: string;
  collections: Partial<Record<NombreColeccionRespaldo, DocumentosRespaldo>>;
  stats: {
    totalDocumentos: number;
    porColeccion: Record<string, number>;
  };
};

export type ProgresoRespaldo = {
  fase: "exportando" | "importando" | "eliminando";
  coleccion: string;
  hecho: number;
  total: number;
};

function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Timestamp) {
    return {
      __firestoreType: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeFirestoreValue(v),
      ])
    );
  }
  return value;
}

function deserializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(deserializeFirestoreValue);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (
      o.__firestoreType === "timestamp" &&
      typeof o.seconds === "number" &&
      typeof o.nanoseconds === "number"
    ) {
      return new Timestamp(o.seconds, o.nanoseconds);
    }
    return Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, deserializeFirestoreValue(v)])
    );
  }
  return value;
}

function nombreArchivoRespaldo(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `conquis-respaldo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export function descargarJsonRespaldo(data: ArchivoRespaldoFirestore): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivoRespaldo();
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarFirestoreCompleto(
  onProgreso?: (p: ProgresoRespaldo) => void
): Promise<ArchivoRespaldoFirestore> {
  const collections: Partial<Record<NombreColeccionRespaldo, DocumentosRespaldo>> = {};
  const porColeccion: Record<string, number> = {};
  let totalDocumentos = 0;

  for (let i = 0; i < COLECCIONES_RESPALDO.length; i++) {
    const nombre = COLECCIONES_RESPALDO[i];
    onProgreso?.({
      fase: "exportando",
      coleccion: nombre,
      hecho: i,
      total: COLECCIONES_RESPALDO.length,
    });

    const snap = await getDocs(collection(db, nombre));
    const docs: DocumentosRespaldo = {};
    for (const d of snap.docs) {
      docs[d.id] = serializeFirestoreValue(d.data()) as Record<string, unknown>;
    }
    collections[nombre] = docs;
    porColeccion[nombre] = snap.size;
    totalDocumentos += snap.size;
  }

  onProgreso?.({
    fase: "exportando",
    coleccion: "listo",
    hecho: COLECCIONES_RESPALDO.length,
    total: COLECCIONES_RESPALDO.length,
  });

  return {
    version: VERSION_RESPALDO,
    exportedAt: new Date().toISOString(),
    app: "conquistadores-app",
    collections,
    stats: { totalDocumentos, porColeccion },
  };
}

export function validarArchivoRespaldo(raw: unknown): ArchivoRespaldoFirestore {
  if (!raw || typeof raw !== "object") {
    throw new Error("El archivo no es un respaldo válido.");
  }
  const o = raw as Partial<ArchivoRespaldoFirestore>;
  if (!o.collections || typeof o.collections !== "object") {
    throw new Error("Falta la sección «collections» en el respaldo.");
  }
  if (typeof o.version !== "number" || o.version > VERSION_RESPALDO) {
    throw new Error("Versión de respaldo no compatible.");
  }
  return o as ArchivoRespaldoFirestore;
}

export function resumirArchivoRespaldo(archivo: ArchivoRespaldoFirestore): {
  totalDocumentos: number;
  porColeccion: Record<string, number>;
  exportedAt: string;
} {
  const porColeccion: Record<string, number> = {};
  let total = 0;
  for (const [nombre, docs] of Object.entries(archivo.collections)) {
    const n = docs ? Object.keys(docs).length : 0;
    porColeccion[nombre] = n;
    total += n;
  }
  return {
    totalDocumentos: archivo.stats?.totalDocumentos ?? total,
    porColeccion,
    exportedAt: archivo.exportedAt || "—",
  };
}

const BATCH_SIZE = 400;

async function eliminarColeccion(nombre: string): Promise<number> {
  const snap = await getDocs(collection(db, nombre));
  if (snap.empty) return 0;
  let eliminados = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
    eliminados += chunk.length;
  }
  return eliminados;
}

async function importarDocumentosColeccion(
  nombre: string,
  documentos: DocumentosRespaldo
): Promise<number> {
  const entries = Object.entries(documentos);
  if (entries.length === 0) return 0;
  let importados = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = entries.slice(i, i + BATCH_SIZE);
    for (const [id, data] of chunk) {
      const payload = deserializeFirestoreValue(data) as Record<string, unknown>;
      batch.set(doc(db, nombre, id), payload);
    }
    await batch.commit();
    importados += chunk.length;
  }
  return importados;
}

export type ResultadoImportacion = {
  importados: number;
  eliminados: number;
  porColeccion: Record<string, { importados: number; eliminados?: number }>;
};

export async function importarFirestoreCompleto(
  archivo: ArchivoRespaldoFirestore,
  opciones: { reemplazarTodo: boolean },
  onProgreso?: (p: ProgresoRespaldo) => void
): Promise<ResultadoImportacion> {
  const nombresEnArchivo = Object.keys(archivo.collections).filter(
    (k) => COLECCIONES_RESPALDO.includes(k as NombreColeccionRespaldo)
  ) as NombreColeccionRespaldo[];

  const coleccionesProcesar = opciones.reemplazarTodo
    ? [...COLECCIONES_RESPALDO]
    : nombresEnArchivo;

  let eliminados = 0;
  let importados = 0;
  const porColeccion: ResultadoImportacion["porColeccion"] = {};

  if (opciones.reemplazarTodo) {
    for (let i = 0; i < coleccionesProcesar.length; i++) {
      const nombre = coleccionesProcesar[i];
      onProgreso?.({
        fase: "eliminando",
        coleccion: nombre,
        hecho: i,
        total: coleccionesProcesar.length,
      });
      const n = await eliminarColeccion(nombre);
      eliminados += n;
    }
  }

  const paraImportar = opciones.reemplazarTodo ? COLECCIONES_RESPALDO : nombresEnArchivo;

  for (let i = 0; i < paraImportar.length; i++) {
    const nombre = paraImportar[i];
    const docs = archivo.collections[nombre] ?? {};
    onProgreso?.({
      fase: "importando",
      coleccion: nombre,
      hecho: i,
      total: paraImportar.length,
    });
    const n = await importarDocumentosColeccion(nombre, docs);
    importados += n;
    porColeccion[nombre] = {
      importados: n,
      ...(opciones.reemplazarTodo ? { eliminados: undefined } : {}),
    };
  }

  return { importados, eliminados, porColeccion };
}
