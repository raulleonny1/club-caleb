"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/src/firebase";
import { canonicalizarUnidad } from "@/src/lib/unidades";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  Layers,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import {
  type EspecialidadEnCurso,
  type EstadoEspecialidad,
  ESTADOS_ESPECIALIDAD,
  ESTADO_INICIAL_ESPECIALIDAD,
  claveEspecialidadEnCurso,
  etiquetaEstadoEspecialidad,
  estiloEstadoEspecialidad,
  parseEspecialidadEnCurso,
} from "@/src/lib/especialidadEnCurso";
import {
  formatearFechaAvance,
  parseHistorialAvanceDoc,
  registrarAvanceEspecialidad,
  type EspecialidadAvanceHistorialEntry,
} from "@/src/lib/especialidadAvance";

type EspecialidadCatalogo = {
  area: string;
  categoria: string;
  especialidad: string;
};

type CatalogoEsp = EspecialidadCatalogo & { id: string };

type ConquisRow = {
  id: string;
  nombre: string;
  apellido: string;
  unidad: string;
  unidadCanon: string;
  clase: string;
  pin: string;
  especialidadEnCurso: EspecialidadEnCurso | null;
};

function nombreCompleto(c: Pick<ConquisRow, "nombre" | "apellido">): string {
  return [c.nombre, c.apellido].filter(Boolean).join(" ").trim();
}

async function registrarAvanceMiembro(
  miembro: ConquisRow,
  esp: EspecialidadEnCurso,
  estadoAnterior: EstadoEspecialidad | null,
  estadoNuevo: EstadoEspecialidad,
  tipo: "asignacion" | "cambio_estado",
  origen: "individual" | "unidad"
) {
  if (!miembro.pin.trim()) return;
  await registrarAvanceEspecialidad({
    conquisId: miembro.id,
    pin: miembro.pin,
    nombre: nombreCompleto(miembro),
    unidad: miembro.unidadCanon,
    esp,
    estadoAnterior,
    estadoNuevo,
    tipo,
    origen,
  });
}

function parseClaveEspecialidad(clave: string): EspecialidadEnCurso | null {
  if (!clave) return null;
  const [area, categoria, especialidad] = clave.split("|||");
  if (!especialidad?.trim()) return null;
  return {
    area: area?.trim() ?? "",
    categoria: categoria?.trim() ?? "",
    especialidad: especialidad.trim(),
    estado: ESTADO_INICIAL_ESPECIALIDAD,
  };
}

export function claveEspecialidad(e: EspecialidadCatalogo): string {
  return claveEspecialidadEnCurso(e);
}

function etiquetaEspecialidad(e: EspecialidadCatalogo): string {
  const partes = [e.area, e.categoria, e.especialidad].filter(Boolean);
  return partes.join(" · ");
}

function estadoComunUnidad(
  miembros: ConquisRow[]
): { estado: EstadoEspecialidad; mixta: boolean } {
  const conEsp = miembros.filter((m) => m.especialidadEnCurso);
  if (conEsp.length === 0) return { estado: ESTADO_INICIAL_ESPECIALIDAD, mixta: false };
  const estados = conEsp.map((m) => m.especialidadEnCurso!.estado);
  const primera = estados[0];
  const unificada = estados.every((e) => e === primera);
  return { estado: primera, mixta: !unificada };
}

function SelectEstado({
  value,
  onChange,
  disabled,
  className = "",
}: {
  value: EstadoEspecialidad;
  onChange: (estado: EstadoEspecialidad) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EstadoEspecialidad)}
      disabled={disabled}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 ${className}`}
    >
      {ESTADOS_ESPECIALIDAD.map((e) => (
        <option key={e.id} value={e.id}>
          {e.label}
        </option>
      ))}
    </select>
  );
}

function BadgeEstado({ estado }: { estado: EstadoEspecialidad }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${estiloEstadoEspecialidad(estado)}`}
    >
      {etiquetaEstadoEspecialidad(estado)}
    </span>
  );
}

function especialidadComunUnidad(miembros: ConquisRow[]): { clave: string; mixta: boolean } {
  if (miembros.length === 0) return { clave: "", mixta: false };
  const claves = miembros.map((m) =>
    m.especialidadEnCurso ? claveEspecialidad(m.especialidadEnCurso) : ""
  );
  const asignadas = claves.filter(Boolean);
  if (asignadas.length === 0) return { clave: "", mixta: false };
  const primera = asignadas[0];
  const unificada =
    asignadas.length === miembros.length && asignadas.every((k) => k === primera);
  return { clave: unificada ? primera : "", mixta: !unificada };
}

function agruparCatalogo(catalogo: CatalogoEsp[]) {
  const porArea = new Map<string, Map<string, CatalogoEsp[]>>();
  for (const item of catalogo) {
    const area = item.area || "Sin área";
    const categoria = item.categoria || "Sin categoría";
    if (!porArea.has(area)) porArea.set(area, new Map());
    const porCategoria = porArea.get(area)!;
    if (!porCategoria.has(categoria)) porCategoria.set(categoria, []);
    porCategoria.get(categoria)!.push(item);
  }

  return [...porArea.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([area, porCategoria]) => ({
      area,
      categorias: [...porCategoria.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "es"))
        .map(([categoria, items]) => ({
          categoria,
          items: items.sort((a, b) =>
            a.especialidad.localeCompare(b.especialidad, "es")
          ),
        })),
    }));
}

const AREA_STYLES: Record<string, { badge: string; border: string; icon: string }> = {
  Naturaleza: { badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200", icon: "🌿" },
  "Aire Libre": { badge: "bg-sky-100 text-sky-800", border: "border-sky-200", icon: "⛺" },
  Salud: { badge: "bg-rose-100 text-rose-800", border: "border-rose-200", icon: "❤️" },
  "Habilidades Domésticas": { badge: "bg-orange-100 text-orange-800", border: "border-orange-200", icon: "🏠" },
  Arte: { badge: "bg-violet-100 text-violet-800", border: "border-violet-200", icon: "🎨" },
  Recreación: { badge: "bg-blue-100 text-blue-800", border: "border-blue-200", icon: "⚽" },
  Agricultura: { badge: "bg-lime-100 text-lime-800", border: "border-lime-200", icon: "🌾" },
  Misionero: { badge: "bg-indigo-100 text-indigo-800", border: "border-indigo-200", icon: "✝️" },
  Espiritual: { badge: "bg-amber-100 text-amber-900", border: "border-amber-200", icon: "📖" },
};

function estiloArea(area: string) {
  return (
    AREA_STYLES[area] ?? {
      badge: "bg-slate-100 text-slate-800",
      border: "border-slate-200",
      icon: "📌",
    }
  );
}

function ResumenEspecialidad({ esp }: { esp: EspecialidadCatalogo | EspecialidadEnCurso | null }) {
  if (!esp) return null;
  const estilo = estiloArea(esp.area);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
      {esp.area ? (
        <span className={`rounded-full px-2 py-0.5 font-bold ${estilo.badge}`}>{esp.area}</span>
      ) : null}
      {esp.categoria ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
          {esp.categoria}
        </span>
      ) : null}
      {esp.especialidad ? (
        <span className="font-medium text-slate-600">{esp.especialidad}</span>
      ) : null}
    </div>
  );
}

function PickerEspecialidadCatalogo({
  catalogo,
  value,
  onChange,
  disabled,
  className = "",
}: {
  catalogo: CatalogoEsp[];
  value: string;
  onChange: (clave: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busquedaPicker, setBusquedaPicker] = useState("");
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set());
  const [openCategorias, setOpenCategorias] = useState<Set<string>>(new Set());

  const seleccion = value ? parseClaveEspecialidad(value) : null;

  const catalogoFiltrado = useMemo(() => {
    const term = busquedaPicker.trim().toLowerCase();
    if (!term) return catalogo;
    return catalogo.filter(
      (e) =>
        e.area.toLowerCase().includes(term) ||
        e.categoria.toLowerCase().includes(term) ||
        e.especialidad.toLowerCase().includes(term)
    );
  }, [catalogo, busquedaPicker]);

  const agrupado = useMemo(() => agruparCatalogo(catalogoFiltrado), [catalogoFiltrado]);

  useEffect(() => {
    if (!abierto || !busquedaPicker.trim()) return;
    setOpenAreas(new Set(agrupado.map((a) => a.area)));
    setOpenCategorias(
      new Set(
        agrupado.flatMap((a) => a.categorias.map((c) => `${a.area}::${c.categoria}`))
      )
    );
  }, [abierto, busquedaPicker, agrupado]);

  const toggleArea = (nombre: string) => {
    setOpenAreas((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const toggleCategoria = (key: string) => {
    setOpenCategorias((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const elegir = (clave: string) => {
    onChange(clave);
    setAbierto(false);
    setBusquedaPicker("");
    setOpenAreas(new Set());
    setOpenCategorias(new Set());
  };

  const cerrar = () => {
    setAbierto(false);
    setBusquedaPicker("");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(true)}
        className="flex w-full min-w-[220px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0 truncate">
          {seleccion ? etiquetaEspecialidad(seleccion) : "— Sin asignar —"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {seleccion ? <ResumenEspecialidad esp={seleccion} /> : null}

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={cerrar}
          role="presentation"
        >
          <div
            className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Elegir especialidad"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="font-bold text-slate-900">Elegir especialidad</p>
              <p className="text-xs text-slate-500">Área · categoría · especialidad</p>
            </div>

            <div className="relative border-b border-slate-100 px-4 py-3">
              <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={busquedaPicker}
                onChange={(e) => setBusquedaPicker(e.target.value)}
                placeholder="Buscar área, categoría o especialidad…"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                autoFocus
              />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {agrupado.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Sin resultados</p>
              ) : (
                agrupado.map(({ area, categorias }) => {
                  const estilo = estiloArea(area);
                  const areaAbierta = openAreas.has(area);
                  const totalArea = categorias.reduce((n, c) => n + c.items.length, 0);

                  return (
                    <div
                      key={area}
                      className={`overflow-hidden rounded-2xl border bg-white ${estilo.border}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleArea(area)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-lg">{estilo.icon}</span>
                          <div className="min-w-0">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${estilo.badge}`}
                            >
                              Área
                            </span>
                            <p className="truncate font-bold text-slate-800">{area}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                            {totalArea}
                          </span>
                          {areaAbierta ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {areaAbierta && (
                        <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 px-2 py-2">
                          {categorias.map(({ categoria, items }) => {
                            const catKey = `${area}::${categoria}`;
                            const catAbierta = openCategorias.has(catKey);

                            return (
                              <div
                                key={catKey}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleCategoria(catKey)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-50/40"
                                >
                                  <span className="text-sm font-semibold text-slate-700">
                                    {categoria}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      {items.length}
                                    </span>
                                    {catAbierta ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </button>

                                {catAbierta && (
                                  <ul className="border-t border-slate-100 py-1">
                                    {items.map((item) => {
                                      const clave = claveEspecialidad(item);
                                      const activa = value === clave;
                                      return (
                                        <li key={item.id || clave}>
                                          <button
                                            type="button"
                                            onClick={() => elegir(clave)}
                                            className={`w-full px-3 py-2 text-left text-sm transition ${
                                              activa
                                                ? "bg-indigo-100 font-bold text-indigo-900"
                                                : "text-slate-700 hover:bg-indigo-50"
                                            }`}
                                          >
                                            {item.especialidad}
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
              {seleccion ? (
                <button
                  type="button"
                  onClick={() => elegir("")}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Quitar asignación
                </button>
              ) : null}
              <button
                type="button"
                onClick={cerrar}
                className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EspecialidadesEnCursoPage() {
  const [conquis, setConquis] = useState<ConquisRow[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoEsp[]>([]);
  const [catalogoUnidades, setCatalogoUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"unidad" | "individual">("unidad");
  const [menuSeccion, setMenuSeccion] = useState<"asignacion" | "seguimiento">("asignacion");
  const [guardando, setGuardando] = useState<Set<string>>(new Set());
  const [guardandoUnidad, setGuardandoUnidad] = useState<Set<string>>(new Set());
  const [unidadesAbiertas, setUnidadesAbiertas] = useState<Set<string>>(new Set());
  const [historialAvance, setHistorialAvance] = useState<EspecialidadAvanceHistorialEntry[]>([]);

  useEffect(() => {
    if (menuSeccion !== "seguimiento") return;
    return onSnapshot(collection(db, "especialidadAvanceHistorial"), (snap) => {
      const items = snap.docs
        .map((d) => parseHistorialAvanceDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setHistorialAvance(items.slice(0, 80));
    });
  }, [menuSeccion]);

  useEffect(() => {
    return onSnapshot(collection(db, "unidades"), (snap) => {
      setCatalogoUnidades(
        snap.docs
          .map((d) => String((d.data() as { nombre?: string }).nombre ?? "").trim())
          .filter(Boolean)
      );
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "RegistroConquis"), (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data();
          const unidadRaw = String(data.unidad ?? "").trim();
          const unidadCanon = unidadRaw
            ? canonicalizarUnidad(unidadRaw, catalogoUnidades)
            : "Sin unidad";
          return {
            id: d.id,
            nombre: String(data.nombre ?? ""),
            apellido: String(data.apellido ?? ""),
            unidad: unidadRaw,
            unidadCanon,
            clase: String(data.clase ?? ""),
            pin: String(data.pin ?? ""),
            especialidadEnCurso: parseEspecialidadEnCurso(data.especialidades ?? data.especialidad),
          };
        })
        .sort((a, b) =>
          `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, "es")
        );
      setConquis(rows);
      setLoading(false);
    });
  }, [catalogoUnidades]);

  useEffect(() => {
    return onSnapshot(collection(db, "especialidades"), (snap) => {
      const lista = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            area: String(data.area ?? "").trim(),
            categoria: String(data.categoria ?? "").trim(),
            especialidad: String(data.especialidad ?? "").trim(),
          };
        })
        .filter((e) => e.especialidad)
        .sort(
          (a, b) =>
            a.area.localeCompare(b.area, "es") ||
            a.categoria.localeCompare(b.categoria, "es") ||
            a.especialidad.localeCompare(b.especialidad, "es")
        );
      setCatalogo(lista);
      setLoading(false);
    });
  }, []);

  const guardarEspecialidad = useCallback(
    async (conquisId: string, clave: string) => {
      const miembro = conquis.find((c) => c.id === conquisId);
      const parsed = parseClaveEspecialidad(clave);
      const esp = parsed
        ? { ...parsed, estado: ESTADO_INICIAL_ESPECIALIDAD }
        : null;
      setGuardando((s) => new Set(s).add(conquisId));
      try {
        await updateDoc(doc(db, "RegistroConquis", conquisId), {
          especialidades: esp ? [esp] : [],
        });
        if (esp && miembro) {
          await registrarAvanceMiembro(
            miembro,
            esp,
            null,
            esp.estado,
            "asignacion",
            "individual"
          );
        }
        setConquis((prev) =>
          prev.map((c) =>
            c.id === conquisId ? { ...c, especialidadEnCurso: esp } : c
          )
        );
        toast.success(esp ? "Especialidad guardada" : "Especialidad quitada");
      } catch (err) {
        console.error(err);
        toast.error("No se pudo guardar en Firebase");
      } finally {
        setGuardando((s) => {
          const n = new Set(s);
          n.delete(conquisId);
          return n;
        });
      }
    },
    [conquis]
  );

  const guardarEstadoConquis = useCallback(
    async (conquisId: string, estado: EstadoEspecialidad) => {
      const miembro = conquis.find((c) => c.id === conquisId);
      if (!miembro?.especialidadEnCurso) return;
      if (miembro.especialidadEnCurso.estado === estado) return;
      const estadoAnterior = miembro.especialidadEnCurso.estado;
      const payload = { ...miembro.especialidadEnCurso, estado };
      setGuardando((s) => new Set(s).add(conquisId));
      try {
        await updateDoc(doc(db, "RegistroConquis", conquisId), {
          especialidades: [payload],
        });
        await registrarAvanceMiembro(
          miembro,
          payload,
          estadoAnterior,
          estado,
          "cambio_estado",
          "individual"
        );
        setConquis((prev) =>
          prev.map((c) =>
            c.id === conquisId ? { ...c, especialidadEnCurso: payload } : c
          )
        );
        toast.success("Estado actualizado — el conquistador recibirá la notificación");
      } catch (err) {
        console.error(err);
        toast.error("No se pudo guardar el estado");
      } finally {
        setGuardando((s) => {
          const n = new Set(s);
          n.delete(conquisId);
          return n;
        });
      }
    },
    [conquis]
  );

  const asignarATodaUnidad = async (unidad: string, clave: string) => {
    const miembros = conquis.filter((c) => c.unidadCanon === unidad);
    if (miembros.length === 0) return;
    setGuardandoUnidad((s) => new Set(s).add(unidad));
    try {
      const parsed = parseClaveEspecialidad(clave);
      const esp = parsed
        ? { ...parsed, estado: ESTADO_INICIAL_ESPECIALIDAD }
        : null;
      await Promise.all(
        miembros.map(async (m) => {
          await updateDoc(doc(db, "RegistroConquis", m.id), {
            especialidades: esp ? [esp] : [],
          });
          if (esp) {
            await registrarAvanceMiembro(
              m,
              esp,
              null,
              esp.estado,
              "asignacion",
              "unidad"
            );
          }
        })
      );
      setConquis((prev) =>
        prev.map((c) =>
          c.unidadCanon === unidad ? { ...c, especialidadEnCurso: esp } : c
        )
      );
      toast.success(
        clave
          ? `Especialidad asignada a los ${miembros.length} de «${unidad}»`
          : `Especialidad quitada en «${unidad}»`
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la unidad");
    } finally {
      setGuardandoUnidad((s) => {
        const n = new Set(s);
        n.delete(unidad);
        return n;
      });
    }
  };

  const guardarEstadoUnidad = async (unidad: string, estado: EstadoEspecialidad) => {
    const miembros = conquis.filter(
      (c) => c.unidadCanon === unidad && c.especialidadEnCurso
    );
    if (miembros.length === 0) return;
    setGuardandoUnidad((s) => new Set(s).add(unidad));
    try {
      await Promise.all(
        miembros.map(async (m) => {
          if (m.especialidadEnCurso!.estado === estado) return;
          const estadoAnterior = m.especialidadEnCurso!.estado;
          const payload = { ...m.especialidadEnCurso!, estado };
          await updateDoc(doc(db, "RegistroConquis", m.id), {
            especialidades: [payload],
          });
          await registrarAvanceMiembro(
            m,
            payload,
            estadoAnterior,
            estado,
            "cambio_estado",
            "unidad"
          );
        })
      );
      setConquis((prev) =>
        prev.map((c) =>
          c.unidadCanon === unidad && c.especialidadEnCurso
            ? { ...c, especialidadEnCurso: { ...c.especialidadEnCurso, estado } }
            : c
        )
      );
      toast.success(
        `Estado «${etiquetaEstadoEspecialidad(estado)}» en «${unidad}» — notificación enviada a los miembros`
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el estado de la unidad");
    } finally {
      setGuardandoUnidad((s) => {
        const n = new Set(s);
        n.delete(unidad);
        return n;
      });
    }
  };

  const filtrada = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return conquis;
    return conquis.filter((c) => {
      const nombre = `${c.nombre} ${c.apellido}`.toLowerCase();
      const esp = c.especialidadEnCurso
        ? etiquetaEspecialidad(c.especialidadEnCurso).toLowerCase()
        : "";
      return (
        nombre.includes(term) ||
        c.unidadCanon.toLowerCase().includes(term) ||
        c.unidad.toLowerCase().includes(term) ||
        c.clase.toLowerCase().includes(term) ||
        esp.includes(term)
      );
    });
  }, [conquis, busqueda]);

  const porUnidad = useMemo(() => {
    const map = new Map<string, ConquisRow[]>();
    for (const c of filtrada) {
      const u = c.unidadCanon || "Sin unidad";
      if (!map.has(u)) map.set(u, []);
      map.get(u)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filtrada]);

  const filtradaSeguimiento = useMemo(
    () => filtrada.filter((c) => c.especialidadEnCurso),
    [filtrada]
  );

  const porUnidadSeguimiento = useMemo(() => {
    const map = new Map<string, ConquisRow[]>();
    for (const c of filtradaSeguimiento) {
      const u = c.unidadCanon || "Sin unidad";
      if (!map.has(u)) map.set(u, []);
      map.get(u)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filtradaSeguimiento]);

  const historialFiltrado = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return historialAvance;
    return historialAvance.filter(
      (h) =>
        h.nombre.toLowerCase().includes(term) ||
        h.unidad.toLowerCase().includes(term) ||
        h.especialidad.toLowerCase().includes(term) ||
        h.pin.includes(term)
    );
  }, [historialAvance, busqueda]);

  const stats = useMemo(() => {
    const conEsp = conquis.filter((c) => c.especialidadEnCurso).length;
    return { total: conquis.length, conEsp, sinEsp: conquis.length - conEsp };
  }, [conquis]);

  const statsSeguimiento = useMemo(() => {
    const conEsp = conquis.filter((c) => c.especialidadEnCurso);
    const porEstado = ESTADOS_ESPECIALIDAD.map((e) => ({
      ...e,
      count: conEsp.filter((c) => c.especialidadEnCurso!.estado === e.id).length,
    }));
    return { total: conEsp.length, porEstado };
  }, [conquis]);

  const unidadesInicializadas = useRef(false);

  useEffect(() => {
    if (unidadesInicializadas.current || porUnidad.length === 0) return;
    unidadesInicializadas.current = true;
    setUnidadesAbiertas(new Set(porUnidad.map(([u]) => u)));
  }, [porUnidad]);

  const toggleUnidad = (nombre: string) => {
    setUnidadesAbiertas((prev) => {
      const n = new Set(prev);
      if (n.has(nombre)) n.delete(nombre);
      else n.add(nombre);
      return n;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50"
        >
          <ArrowLeft size={18} />
          Volver al panel admin
        </Link>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Especialidades en curso</h1>
              <p className="text-sm text-slate-600">
                {menuSeccion === "asignacion"
                  ? "Asigna especialidades por unidad o individualmente."
                  : "Actualiza el avance de cada especialidad asignada."}{" "}
                Catálogo en{" "}
                <Link href="/admin/especialidades" className="font-semibold text-indigo-700 underline">
                  Especialidades
                </Link>
                .
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="shrink-0 lg:w-56">
            <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setMenuSeccion("asignacion")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  menuSeccion === "asignacion"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Award size={18} />
                Asignar especialidades
              </button>
              <button
                type="button"
                onClick={() => setMenuSeccion("seguimiento")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  menuSeccion === "seguimiento"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ClipboardList size={18} />
                Seguimiento de avances
              </button>
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
        {menuSeccion === "asignacion" ? (
          <>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Conquistadores", value: stats.total, icon: Users },
            { label: "Con especialidad", value: stats.conEsp, icon: Award },
            { label: "Sin asignar", value: stats.sinEsp, icon: Layers },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setVista("unidad")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                vista === "unidad"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Por unidad
            </button>
            <button
              type="button"
              onClick={() => setVista("individual")}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                vista === "individual"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Individual
            </button>
          </div>
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nombre, unidad o especialidad…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando conquistadores y catálogo…
          </p>
        ) : catalogo.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-semibold text-amber-900">No hay especialidades en el catálogo</p>
            <p className="mt-1 text-sm text-amber-800">
              Regístralas primero en{" "}
              <Link href="/admin/especialidades" className="font-bold underline">
                Admin → Especialidades
              </Link>{" "}
              o pulsa «Cargar especialidades base».
            </p>
          </div>
        ) : conquis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-700">No hay conquistadores registrados</p>
          </div>
        ) : vista === "individual" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-indigo-50 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Clase</th>
                    <th className="px-4 py-3">Especialidad en curso</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map((c) => {
                    const clave = c.especialidadEnCurso
                      ? claveEspecialidad(c.especialidadEnCurso)
                      : "";
                    const busy = guardando.has(c.id);
                    return (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {[c.nombre, c.apellido].filter(Boolean).join(" ")}
                          {c.pin ? (
                            <span className="mt-0.5 block text-xs font-normal text-slate-400">
                              PIN {c.pin}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.unidadCanon}</td>
                        <td className="px-4 py-3 text-slate-600">{c.clase || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PickerEspecialidadCatalogo
                              catalogo={catalogo}
                              value={clave}
                              disabled={busy}
                              onChange={(v) => guardarEspecialidad(c.id, v)}
                            />
                            {busy ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {porUnidad.map(([unidad, miembrosVisibles]) => {
              const abierta = unidadesAbiertas.has(unidad);
              const miembrosUnidad = conquis.filter((c) => c.unidadCanon === unidad);
              const { clave: claveUnidad, mixta } = especialidadComunUnidad(miembrosUnidad);
              const busyUnidad = guardandoUnidad.has(unidad);
              const espUnidad = claveUnidad ? parseClaveEspecialidad(claveUnidad) : null;
              return (
                <section
                  key={unidad}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleUnidad(unidad)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      {abierta ? (
                        <ChevronDown className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-indigo-600" />
                      )}
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{unidad}</h2>
                        <p className="text-xs text-slate-500">
                          {miembrosUnidad.length} conquistador
                          {miembrosUnidad.length === 1 ? "" : "es"}
                          {espUnidad
                            ? ` · ${etiquetaEspecialidad(espUnidad)}`
                            : mixta
                              ? " · especialidades distintas"
                              : " · sin especialidad"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                      {miembrosUnidad.length}
                    </span>
                  </button>

                  {abierta && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <p className="mb-2 text-sm font-semibold text-indigo-900">
                          Especialidad de la unidad «{unidad}»
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <PickerEspecialidadCatalogo
                            catalogo={catalogo}
                            value={claveUnidad}
                            disabled={busyUnidad}
                            className="sm:min-w-[320px] sm:flex-1"
                            onChange={(clave) => asignarATodaUnidad(unidad, clave)}
                          />
                          {busyUnidad ? (
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                          ) : null}
                        </div>
                        {mixta ? (
                          <p className="mt-2 text-xs text-amber-700">
                            Algunos miembros tienen especialidades distintas. Elige una para
                            unificar a toda la unidad.
                          </p>
                        ) : null}
                      </div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Miembros de {unidad}
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {miembrosVisibles.map((c) => (
                          <li
                            key={c.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <p className="font-bold text-slate-800">
                              {[c.nombre, c.apellido].filter(Boolean).join(" ")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {c.clase || "Sin clase"}
                              {c.pin ? ` · PIN ${c.pin}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
          </>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Con especialidad</p>
                  <p className="text-2xl font-black text-slate-800">{statsSeguimiento.total}</p>
                </div>
              </div>
              {statsSeguimiento.porEstado.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <BadgeEstado estado={e.id} />
                  <p className="mt-1 text-xl font-black text-slate-800">{e.count}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setVista("unidad")}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    vista === "unidad"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Por unidad
                </button>
                <button
                  type="button"
                  onClick={() => setVista("individual")}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    vista === "individual"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Individual
                </button>
              </div>
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar unidad, nombre o especialidad…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {loading ? (
              <p className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando seguimiento…
              </p>
            ) : statsSeguimiento.total === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-semibold text-slate-700">No hay especialidades asignadas aún</p>
                <p className="mt-1 text-sm text-slate-500">
                  Primero asigna especialidades en «Asignar especialidades».
                </p>
              </div>
            ) : vista === "individual" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-indigo-50 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">
                      <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Unidad</th>
                        <th className="px-4 py-3">Especialidad</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradaSeguimiento.map((c) => {
                        const esp = c.especialidadEnCurso!;
                        const busy = guardando.has(c.id);
                        return (
                          <tr key={c.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {[c.nombre, c.apellido].filter(Boolean).join(" ")}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{c.unidadCanon}</td>
                            <td className="px-4 py-3">
                              <ResumenEspecialidad esp={esp} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <SelectEstado
                                  value={esp.estado}
                                  disabled={busy}
                                  onChange={(estado) => guardarEstadoConquis(c.id, estado)}
                                />
                                {busy ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {porUnidadSeguimiento.map(([unidad, miembrosVisibles]) => {
                  const abierta = unidadesAbiertas.has(unidad);
                  const miembrosUnidad = conquis.filter(
                    (c) => c.unidadCanon === unidad && c.especialidadEnCurso
                  );
                  const espUnidad = miembrosUnidad[0]?.especialidadEnCurso ?? null;
                  const { estado: estadoUnidad, mixta: estadoMixto } =
                    estadoComunUnidad(miembrosUnidad);
                  const busyUnidad = guardandoUnidad.has(unidad);
                  return (
                    <section
                      key={unidad}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleUnidad(unidad)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          {abierta ? (
                            <ChevronDown className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-indigo-600" />
                          )}
                          <div>
                            <h2 className="text-lg font-black text-slate-900">{unidad}</h2>
                            <p className="text-xs text-slate-500">
                              {miembrosUnidad.length} con especialidad
                              {espUnidad ? ` · ${etiquetaEspecialidad(espUnidad)}` : ""}
                            </p>
                          </div>
                        </div>
                        <BadgeEstado estado={estadoUnidad} />
                      </button>

                      {abierta && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                          {espUnidad ? <ResumenEspecialidad esp={espUnidad} /> : null}
                          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                            <p className="mb-2 text-sm font-semibold text-indigo-900">
                              Estado de avance — unidad «{unidad}»
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <SelectEstado
                                value={estadoUnidad}
                                disabled={busyUnidad}
                                className="sm:min-w-[220px]"
                                onChange={(estado) => guardarEstadoUnidad(unidad, estado)}
                              />
                              {busyUnidad ? (
                                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                              ) : null}
                            </div>
                            {estadoMixto ? (
                              <p className="mt-2 text-xs text-amber-700">
                                Hay estados distintos entre miembros. Elige uno para unificar la
                                unidad.
                              </p>
                            ) : null}
                          </div>
                          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                            Miembros
                          </p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {miembrosVisibles.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                              >
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {[c.nombre, c.apellido].filter(Boolean).join(" ")}
                                  </p>
                                  <p className="text-xs text-slate-500">{c.clase || "Sin clase"}</p>
                                </div>
                                {c.especialidadEnCurso ? (
                                  <BadgeEstado estado={c.especialidadEnCurso.estado} />
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
            <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <History className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="font-bold text-slate-900">Historial de avances</h2>
                  <p className="text-xs text-slate-500">
                    Cambios y asignaciones en tiempo real — también visibles para cada conquistador
                  </p>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {historialFiltrado.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Aún no hay movimientos registrados.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {historialFiltrado.map((h) => (
                      <li key={h.id} className="px-5 py-3.5 hover:bg-slate-50">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {h.nombre || "Conquistador"}{" "}
                              <span className="font-normal text-slate-500">· {h.unidad}</span>
                            </p>
                            <p className="text-xs text-slate-600">{h.especialidad}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {h.tipo === "asignacion" ? "Asignación" : "Cambio de estado"} ·{" "}
                              {h.origen === "unidad" ? "Por unidad" : "Individual"}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {h.estadoAnterior ? (
                                <BadgeEstado estado={h.estadoAnterior} />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Nuevo</span>
                              )}
                              <span className="text-slate-300">→</span>
                              <BadgeEstado estado={h.estadoNuevo} />
                            </div>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {formatearFechaAvance(h.createdAt)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
          </main>
        </div>
      </div>
    </div>
  );
}
