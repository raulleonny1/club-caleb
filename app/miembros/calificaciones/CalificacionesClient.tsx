"use client";

import React, { useEffect, useState } from "react";
import { db } from "../../../src/firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { BookOpen, Star, Award, Trophy } from "lucide-react";
import {
  getCategoriasConPuntos,
  sumarPuntos,
  esDocumentoCalificacionesUnidad,
} from "@/src/lib/categoriasPuntos";
import {
  actividadesRecientesMiembro,
  puntosMovimientoHistorial,
  tituloMovimientoHistorial,
  type MovimientoPuntosHistorial,
} from "@/src/lib/historialPuntosMiembro";

export default function CalificacionesClient() {
  const searchParams = useSearchParams();
  const pin = searchParams.get("pin") || "";
  const [puntosCategorias, setPuntosCategorias] = useState<Record<string, unknown>>({});
  const [etiquetasActividades, setEtiquetasActividades] = useState<Record<string, string>>({});
  const [calificacionesRecientes, setCalificacionesRecientes] = useState<
    { id: string; materia?: string; nota?: string }[]
  >([]);
  const [historialSemanal, setHistorialSemanal] = useState<MovimientoPuntosHistorial[]>([]);
  const [historialUnidad, setHistorialUnidad] = useState<MovimientoPuntosHistorial[]>([]);
  const [unidadMiembro, setUnidadMiembro] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pin) return;
    const pinKey = pin.trim();

    const aplicarPuntosDoc = (data: Record<string, unknown>, docId: string) => {
      if (esDocumentoCalificacionesUnidad(docId, data)) return;
      setPuntosCategorias((data.puntos as Record<string, unknown>) || {});
      setEtiquetasActividades((data.etiquetasActividades as Record<string, string>) || {});
      if (data.nombre) setNombre(String(data.nombre));
      setLoading(false);
    };

    const unsubDoc = onSnapshot(doc(db, "calificacionesConquis", pinKey), (snap) => {
      if (snap.exists()) aplicarPuntosDoc(snap.data() as Record<string, unknown>, snap.id);
    });

    const qCalif = query(collection(db, "calificacionesConquis"), where("pin", "==", pinKey));
    const unsubQuery = onSnapshot(qCalif, (snap) => {
      if (snap.empty) return;
      for (const docSnap of snap.docs) {
        if (esDocumentoCalificacionesUnidad(docSnap.id, docSnap.data())) continue;
        aplicarPuntosDoc(docSnap.data() as Record<string, unknown>, docSnap.id);
        break;
      }
    });

    const califQuery = query(collection(db, "calificaciones"), where("pin", "==", pinKey));
    const unsubCalif = onSnapshot(califQuery, (snap) => {
      setCalificacionesRecientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qHist = query(collection(db, "calificacionesSemanal"), where("pin", "==", pinKey));
    const unsubHist = onSnapshot(qHist, (snap) => {
      setHistorialSemanal(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as MovimientoPuntosHistorial) }))
      );
    });

    const qRegistro = query(collection(db, "RegistroConquis"), where("pin", "==", pinKey));
    const unsubRegistro = onSnapshot(qRegistro, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUnidadMiembro(String(data.unidad ?? "").trim());
        if (data.nombre) setNombre(String(data.nombre));
      }
      setLoading(false);
    });

    return () => {
      unsubDoc();
      unsubQuery();
      unsubCalif();
      unsubHist();
      unsubRegistro();
    };
  }, [pin]);

  useEffect(() => {
    const unidad = unidadMiembro.trim();
    if (!unidad) {
      setHistorialUnidad([]);
      return;
    }
    const qHistUnidad = query(collection(db, "calificacionesSemanal"), where("unidad", "==", unidad));
    const unsub = onSnapshot(qHistUnidad, (snap) => {
      setHistorialUnidad(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as MovimientoPuntosHistorial) }))
          .filter(
            (reg) => reg.alcance === "unidad" || String(reg.pin ?? "").startsWith("unidad_")
          )
      );
    });
    return () => unsub();
  }, [unidadMiembro]);

  const categoriasConPuntos = getCategoriasConPuntos(puntosCategorias, etiquetasActividades);
  const total = sumarPuntos(puntosCategorias, etiquetasActividades);
  const actividadesRecientes = actividadesRecientesMiembro(historialSemanal, historialUnidad, 12);

  if (loading) return <div className="text-center mt-10 text-lg text-indigo-700">Cargando datos...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <Star fill="white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{nombre || "Conquistador"}</h2>
            <p className="text-slate-500 text-sm">Evaluación de Calificaciones</p>
          </div>
        </div>
        <button onClick={() => window.history.back()} className="text-slate-400">
          Volver
        </button>
      </div>

      <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold">Puntaje Total</p>
            <h3 className="text-5xl font-black">
              {Number(total)} <span className="text-xl opacity-70">pts</span>
            </h3>
          </div>
          <div className="text-right">
            <Award size={40} className="ml-auto mb-2 opacity-50" />
          </div>
        </div>
      </div>

      {categoriasConPuntos.length > 0 && (
        <div className="mb-8">
          <div className="font-bold text-xs text-indigo-600 mb-2">Puntaje por categoría</div>
          <div className="grid md:grid-cols-2 gap-4">
            {categoriasConPuntos.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center"
              >
                <span className="font-bold text-slate-700">{cat.nombre}</span>
                <span className="text-sm font-bold text-blue-600">{cat.valor} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {calificacionesRecientes.length > 0 && (
        <div className="mb-8">
          <div className="font-bold text-xs text-indigo-600 mb-2">Notas registradas</div>
          <div className="space-y-4">
            {calificacionesRecientes.map((cal) => (
              <div
                key={cal.id}
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-3xl border border-transparent hover:border-slate-200 hover:bg-white transition-all"
              >
                <div className="flex items-center gap-4">
                  <BookOpen size={20} />
                  <div>
                    <p className="font-black text-slate-800 text-sm">{cal.materia}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nota</p>
                  </div>
                </div>
                <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-black uppercase shadow-sm">
                  {cal.nota}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {actividadesRecientes.length > 0 && (
        <div className="mb-8">
          <div className="font-bold text-xs text-indigo-600 mb-2">Actividades y movimientos</div>
          <div className="space-y-3">
            {actividadesRecientes.map(({ reg, esUnidad }) => {
              const pts = puntosMovimientoHistorial(reg);
              const esResta = reg.tipo === "resta";
              return (
                <div
                  key={reg.id || `${reg.fecha}-${tituloMovimientoHistorial(reg)}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                      <Trophy size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{tituloMovimientoHistorial(reg)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {reg.fecha || "—"} · {esUnidad ? "Unidad" : "Personal"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black ${
                      esResta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {esResta ? "−" : "+"}
                    {pts} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categoriasConPuntos.length === 0 &&
        calificacionesRecientes.length === 0 &&
        actividadesRecientes.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-8">
          No hay puntos ni notas registrados para este PIN.
        </p>
      )}
    </div>
  );
}
