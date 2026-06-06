"use client";

import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, Loader2, Upload } from "lucide-react";
import {
  descargarJsonRespaldo,
  exportarFirestoreCompleto,
  importarFirestoreCompleto,
  resumirArchivoRespaldo,
  validarArchivoRespaldo,
} from "@/src/lib/firestoreRespaldo";

export default function RespaldoConfigPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const descargar = async () => {
    setBusy("export");
    try {
      const data = await exportarFirestoreCompleto();
      descargarJsonRespaldo(data);
      toast.success(`Descargado: ${data.stats.totalDocumentos} documentos.`);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo descargar el respaldo.");
    } finally {
      setBusy(null);
    }
  };

  const importarArchivo = async (file: File) => {
    setBusy("import");
    try {
      const parsed = validarArchivoRespaldo(JSON.parse(await file.text()));
      const resumen = resumirArchivoRespaldo(parsed);
      const ok = confirm(
        `¿Restaurar ${resumen.totalDocumentos} documentos?\n\nSe reemplazarán todos los datos actuales del club.`
      );
      if (!ok) return;

      const result = await importarFirestoreCompleto(parsed, { reemplazarTodo: true });
      toast.success(`Importado: ${result.importados} documentos.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "No se pudo importar.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Respaldo de datos</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">
        Descarga todo en un .json o restaura desde el mismo tipo de archivo.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={descargar}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "export" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Descargar todo
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy === "import" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Importar respaldo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importarArchivo(f);
          }}
        />
      </div>
    </div>
  );
}
