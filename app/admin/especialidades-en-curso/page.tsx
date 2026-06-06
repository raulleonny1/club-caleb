"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/firebase";
import { ArrowLeft, Award, Search, User } from "lucide-react";

type EspecialidadObj = {
  area?: string;
  categoria?: string;
  especialidad?: string;
};

type ConquisEsp = {
  id: string;
  nombre: string;
  apellido: string;
  unidad: string;
  clase: string;
  pin: string;
  especialidades: EspecialidadObj[];
};

function etiquetaEspecialidad(e: EspecialidadObj): string {
  if (e.especialidad?.trim()) return e.especialidad.trim();
  if (typeof e === "string") return e;
  return [e.area, e.categoria].filter(Boolean).join(" · ") || "Especialidad";
}

export default function EspecialidadesEnCursoPage() {
  const [lista, setLista] = useState<ConquisEsp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "RegistroConquis"), (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data();
          const raw = data.especialidades;
          let especialidades: EspecialidadObj[] = [];
          if (Array.isArray(raw)) {
            especialidades = raw as EspecialidadObj[];
          } else if (typeof raw === "string" && raw.trim()) {
            especialidades = [{ especialidad: raw.trim() }];
          } else if (data.especialidad) {
            especialidades = [{ especialidad: String(data.especialidad) }];
          }
          return {
            id: d.id,
            nombre: String(data.nombre ?? ""),
            apellido: String(data.apellido ?? ""),
            unidad: String(data.unidad ?? ""),
            clase: String(data.clase ?? ""),
            pin: String(data.pin ?? ""),
            especialidades,
          };
        })
        .filter((c) => c.especialidades.length > 0)
        .sort((a, b) =>
          `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, "es")
        );
      setLista(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtrada = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return lista;
    return lista.filter((c) => {
      const nombre = `${c.nombre} ${c.apellido}`.toLowerCase();
      const esps = c.especialidades.map((e) => etiquetaEspecialidad(e).toLowerCase()).join(" ");
      return (
        nombre.includes(term) ||
        c.unidad.toLowerCase().includes(term) ||
        c.clase.toLowerCase().includes(term) ||
        esps.includes(term)
      );
    });
  }, [lista, busqueda]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50"
        >
          <ArrowLeft size={18} />
          Volver al panel admin
        </Link>

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Especialidades en curso</h1>
              <p className="text-sm text-slate-600">
                Conquistadores con especialidades asignadas en su registro.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-bold text-indigo-800">
            {filtrada.length} conquistador{filtrada.length === 1 ? "" : "es"}
          </span>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, unidad, clase o especialidad…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {loading ? (
          <p className="text-center text-slate-500">Cargando registros…</p>
        ) : filtrada.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Award className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-700">No hay especialidades en curso</p>
            <p className="mt-1 text-sm text-slate-500">
              Asigna especialidades al editar un conquistador en{" "}
              <Link href="/admin/RegistroConquis" className="font-bold text-indigo-700 underline">
                Registro Conquis
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtrada.map((c) => (
              <article
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {[c.nombre, c.apellido].filter(Boolean).join(" ")}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {c.unidad || "Sin unidad"}
                      {c.clase ? ` · ${c.clase}` : ""}
                      {c.pin ? ` · PIN ${c.pin}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/RegistroConquis?editar=${encodeURIComponent(c.id)}`}
                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    Editar registro
                  </Link>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {c.especialidades.map((e, i) => (
                    <li
                      key={`${c.id}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200"
                    >
                      <User className="h-3 w-3 opacity-60" />
                      {etiquetaEspecialidad(e)}
                      {e.area && e.categoria ? (
                        <span className="font-normal text-amber-700/80">
                          ({e.area} · {e.categoria})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
