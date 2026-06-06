"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { Trophy, Sparkles, Save, Eye, Users, Loader2 } from "lucide-react";
import { db, formatFechaDDMMYYYY } from "@/src/firebase";
import {
  DEFAULT_RETO_MIEMBRO,
  mergeRetoConfig,
  RETO_MIEMBRO_DOC_REF,
  type RetoMiembroDashboardConfig,
} from "@/src/lib/retoMiembroDashboard";
import {
  COLECCION_ACEPTACIONES_RETO,
  nuevaVersionRetoId,
  type AceptacionRetoMiembro,
} from "@/src/lib/retoMiembroAceptaciones";

export default function RetoMiembroEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RetoMiembroDashboardConfig>(DEFAULT_RETO_MIEMBRO);
  const [aceptaciones, setAceptaciones] = useState<AceptacionRetoMiembro[]>([]);
  const [cargandoAceptaciones, setCargandoAceptaciones] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(RETO_MIEMBRO_DOC_REF, (snap) => {
      setForm(mergeRetoConfig(snap.exists() ? (snap.data() as Partial<RetoMiembroDashboardConfig>) : undefined));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const versionId = form.retoVersionId?.trim();
    if (!versionId) {
      setAceptaciones([]);
      return;
    }
    setCargandoAceptaciones(true);
    const q = query(
      collection(db, COLECCION_ACEPTACIONES_RETO),
      where("retoVersionId", "==", versionId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => d.data() as AceptacionRetoMiembro);
        lista.sort((a, b) => (b.aceptadoEn || "").localeCompare(a.aceptadoEn || ""));
        setAceptaciones(lista);
        setCargandoAceptaciones(false);
      },
      () => {
        setAceptaciones([]);
        setCargandoAceptaciones(false);
      }
    );
    return () => unsub();
  }, [form.retoVersionId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const retoVersionId = nuevaVersionRetoId();
      await setDoc(
        RETO_MIEMBRO_DOC_REF,
        {
          ...form,
          retoVersionId,
          actualizadoEn: new Date().toISOString(),
        },
        { merge: true }
      );
      setForm((prev) => ({ ...prev, retoVersionId }));
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar. Revisa permisos de Firestore para la colección config.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 text-center text-sm text-violet-800">
        Cargando reto del dashboard…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 via-white to-indigo-50 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-violet-900">Reto en dashboard de miembros</h3>
            <p className="text-xs text-violet-700/80">
              Lo ven los conquistadores en su panel. Pensado para móvil.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-violet-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/80 bg-white/90 p-4 shadow-inner">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-violet-600"
            />
            Mostrar tarjeta en el dashboard
          </label>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Etiqueta (badge)</label>
            <input
              value={form.etiqueta}
              onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Ej. Reto Especial"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Texto principal</label>
            <textarea
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-snug"
              placeholder="Desafío que verán los miembros…"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Texto del botón</label>
            <input
              value={form.textoBoton}
              onChange={(e) => setForm({ ...form, textoBoton: e.target.value })}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Ej. ¡Aceptar reto!"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Enlace del botón (opcional)
            </label>
            <input
              value={form.urlBoton}
              onChange={(e) => setForm({ ...form, urlBoton: e.target.value })}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="https://… (WhatsApp, formulario, etc.)"
            />
            <p className="mt-1 text-[11px] text-slate-500">Si lo dejas vacío, el botón no abre ningún enlace.</p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={form.mostrarIconoFondo}
              onChange={(e) => setForm({ ...form, mostrarIconoFondo: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-violet-600"
            />
            Mostrar icono de trofeo de fondo (sutil, sin animación)
          </label>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Eye className="h-3.5 w-3.5" /> Vista previa (móvil)
          </p>
          <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl bg-linear-to-br from-violet-600 via-indigo-700 to-slate-900 p-6 text-white shadow-xl ring-1 ring-white/10">
            {form.mostrarIconoFondo && (
              <div className="pointer-events-none absolute -right-1 bottom-0 top-0 flex items-center opacity-[0.12]">
                <Trophy className="h-28 w-28 shrink-0 text-white" strokeWidth={1.25} />
              </div>
            )}
            <div className="relative z-10">
              <span className="mb-3 inline-block rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                {form.etiqueta || "—"}
              </span>
              <p className="text-xl font-black leading-tight tracking-tight text-balance">{form.titulo || "—"}</p>
              <div className="mt-5">
                <span className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white text-center text-xs font-black uppercase tracking-widest text-indigo-900 shadow-lg">
                  {form.textoBoton || "Botón"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-violet-200 bg-white/90 p-4 shadow-inner">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-700" />
            <h4 className="text-sm font-black text-violet-900">Conquistadores que aceptaron el reto</h4>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
            {aceptaciones.length} aceptación{aceptaciones.length === 1 ? "" : "es"}
          </span>
        </div>
        {!form.retoVersionId?.trim() ? (
          <p className="text-sm text-slate-600">
            Guarda el reto con <strong>Guardar</strong> para empezar a registrar quién lo acepta en los dashboards.
          </p>
        ) : cargandoAceptaciones ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando aceptaciones…
          </p>
        ) : aceptaciones.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nadie ha aceptado este reto todavía. Aparecerán aquí en cuanto un conquistador pulse el botón en su dashboard.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-violet-50 text-xs font-bold uppercase tracking-wide text-violet-900">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Unidad</th>
                  <th className="px-3 py-2">PIN</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {aceptaciones.map((a) => (
                  <tr key={`${a.pin}-${a.aceptadoEn}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{a.nombre || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{a.unidad || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-indigo-700">{a.pin}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {a.aceptadoEn ? formatFechaDDMMYYYY(a.aceptadoEn.slice(0, 10)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          Cada vez que guardas un reto nuevo, la lista se reinicia para esa versión. Los conquistadores deben aceptar de nuevo si cambias el desafío.
        </p>
      </div>
    </div>
  );
}
