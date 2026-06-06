"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Database,
  Download,
  FileUp,
  HardDriveDownload,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";
import {
  COLECCIONES_RESPALDO,
  descargarJsonRespaldo,
  exportarFirestoreCompleto,
  importarFirestoreCompleto,
  resumirArchivoRespaldo,
  validarArchivoRespaldo,
  type ArchivoRespaldoFirestore,
  type ProgresoRespaldo,
} from "@/src/lib/firestoreRespaldo";

function etiquetaProgreso(p: ProgresoRespaldo | null): string {
  if (!p) return "";
  const verb =
    p.fase === "exportando"
      ? "Exportando"
      : p.fase === "eliminando"
        ? "Limpiando"
        : "Importando";
  return `${verb}: ${p.coleccion} (${p.hecho}/${p.total})…`;
}

export default function RespaldoAdminPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoRespaldo | null>(null);
  const [archivoPreview, setArchivoPreview] = useState<ArchivoRespaldoFirestore | null>(null);
  const [reemplazarTodo, setReemplazarTodo] = useState(true);
  const [ultimoExport, setUltimoExport] = useState<ArchivoRespaldoFirestore | null>(null);

  const handleExportar = async () => {
    setExportando(true);
    setProgreso(null);
    try {
      const data = await exportarFirestoreCompleto(setProgreso);
      setUltimoExport(data);
      descargarJsonRespaldo(data);
      toast.success(
        `Respaldo descargado: ${data.stats.totalDocumentos} documentos en ${COLECCIONES_RESPALDO.length} colecciones.`
      );
    } catch (err) {
      console.error(err);
      toast.error("No se pudo exportar. Revisa la conexión y las reglas de Firebase.");
    } finally {
      setExportando(false);
      setProgreso(null);
    }
  };

  const handleArchivo = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validarArchivoRespaldo(JSON.parse(text));
      setArchivoPreview(parsed);
      toast.success("Archivo de respaldo leído correctamente.");
    } catch (err) {
      console.error(err);
      setArchivoPreview(null);
      toast.error(err instanceof Error ? err.message : "Archivo inválido.");
    }
  };

  const handleImportar = async () => {
    if (!archivoPreview) return;
    const resumen = resumirArchivoRespaldo(archivoPreview);
    const msg = reemplazarTodo
      ? `¿REEMPLAZAR TODOS los datos actuales con el respaldo del ${resumen.exportedAt}?\n\n` +
        `Se borrarán las ${COLECCIONES_RESPALDO.length} colecciones del club y se importarán ${resumen.totalDocumentos} documentos.\n\n` +
        "Esta acción NO se puede deshacer."
      : `¿Fusionar el respaldo (${resumen.totalDocumentos} documentos) con los datos actuales?\n\n` +
        "Los documentos con el mismo ID serán sobrescritos.";

    if (!confirm(msg)) return;
    if (reemplazarTodo && !confirm("Última confirmación: ¿Seguro que deseas restaurar todo?")) return;

    setImportando(true);
    setProgreso(null);
    try {
      const result = await importarFirestoreCompleto(
        archivoPreview,
        { reemplazarTodo },
        setProgreso
      );
      toast.success(
        reemplazarTodo
          ? `Restauración completa: ${result.importados} documentos importados (${result.eliminados} eliminados antes).`
          : `Importación lista: ${result.importados} documentos actualizados.`
      );
      setArchivoPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error(err);
      toast.error("Error al importar. Revisa la consola y las reglas de Firebase.");
    } finally {
      setImportando(false);
      setProgreso(null);
    }
  };

  const previewResumen = archivoPreview ? resumirArchivoRespaldo(archivoPreview) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/configuracion"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50"
        >
          <ArrowLeft size={18} />
          Volver a configuración
        </Link>

        <header className="mb-8 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Respaldo y restauración</h1>
            <p className="text-sm text-slate-600">
              Descarga una copia completa de Firebase en tu PC e impórtala si necesitas recuperar
              todo.
            </p>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Descargar respaldo</h2>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Exporta las {COLECCIONES_RESPALDO.length} colecciones del club (conquistadores,
            unidades, calificaciones, eventos, especialidades, etc.) a un archivo{" "}
            <strong>.json</strong> en tu computadora.
          </p>
          <button
            type="button"
            onClick={handleExportar}
            disabled={exportando || importando}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportando ? "Generando respaldo…" : "Descargar respaldo completo"}
          </button>
          {ultimoExport ? (
            <p className="mt-3 text-xs text-slate-500">
              Último export: {ultimoExport.stats.totalDocumentos} documentos ·{" "}
              {new Date(ultimoExport.exportedAt).toLocaleString("es")}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Restaurar desde archivo</h2>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Selecciona un archivo <strong>.json</strong> que hayas descargado antes con «Descargar
            respaldo completo».
          </p>

          <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 hover:border-indigo-300 hover:bg-indigo-50/30">
            <FileUp className="mb-2 h-8 w-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              Haz clic para elegir archivo de respaldo
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={importando}
              onChange={(e) => handleArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {previewResumen ? (
            <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm">
              <p className="font-bold text-indigo-900">Vista previa del respaldo</p>
              <p className="mt-1 text-slate-600">
                Fecha del respaldo:{" "}
                {previewResumen.exportedAt !== "—"
                  ? new Date(previewResumen.exportedAt).toLocaleString("es")
                  : "—"}
              </p>
              <p className="font-semibold text-slate-800">
                Total: {previewResumen.totalDocumentos} documentos
              </p>
              <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-600">
                {Object.entries(previewResumen.porColeccion)
                  .filter(([, n]) => n > 0)
                  .map(([nombre, n]) => (
                    <li key={nombre}>
                      {nombre}: {n}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <input
              type="checkbox"
              checked={reemplazarTodo}
              onChange={(e) => setReemplazarTodo(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <ShieldAlert className="h-4 w-4" />
                Reemplazar todos los datos actuales (restauración completa)
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Recomendado si borraste la base por error. Borra las colecciones del club e importa
                el respaldo. Desmarca solo para fusionar documentos sin borrar lo demás.
              </p>
            </div>
          </label>

          <button
            type="button"
            onClick={handleImportar}
            disabled={!archivoPreview || importando || exportando}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            {importando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importando ? "Restaurando…" : "Importar respaldo"}
          </button>
        </section>

        {(exportando || importando) && progreso ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {etiquetaProgreso(progreso)}
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-400">
          Guarda el archivo .json en un lugar seguro (USB, nube personal). Haz respaldos periódicos
          después de registrar datos importantes.
        </p>
      </div>
    </div>
  );
}
