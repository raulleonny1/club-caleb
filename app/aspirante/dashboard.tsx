"use client";
import React, { useState, useEffect } from "react";
import { db, formatFechaDDMMYYYY } from "../../src/firebase";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { LogOut, ShieldCheck, TrendingUp, Trophy, BookOpen, Medal, Map, CheckCircle2, Clock, Bell, UserCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getCategoriasConPuntos, sumarPuntos } from "@/src/lib/categoriasPuntos";
import { progresoGuiaMayorDesdeEvaluaciones } from "@/src/lib/progresoConquistador";
import { nombreCompletoAspirante } from "@/src/constants/aspirante";

const iconosEspecialidades: { [key: string]: string } = {
  "Vida al Aire Libre": "🏕️",
  "Fogatas y Cocina": "🔥",
  "Naturaleza": "🌳",
  "Cocina": "🍳",
  "Deportes": "⚽",
};

export default function AspiranteDashboard() {
  const searchParams = useSearchParams();
  const pin = searchParams.get("pin") || "";
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPuntos, setTotalPuntos] = useState(0);
  const [calificacionesRecientes, setCalificacionesRecientes] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [progresoGM, setProgresoGM] = useState({
    completadas: 0,
    pendientes: 0,
    total: 0,
    porcentaje: 0,
  });

  useEffect(() => {
    if (!pin) return;
    (async () => {
      const ref = doc(db, "aspirantesGuiaMayor", pin);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUser(data);
        setEspecialidades(Array.isArray(data.especialidades) ? data.especialidades : []);
        setLoading(false);
        return;
      }
      const q = query(collection(db, "aspirantesGuiaMayor"), where("pin", "==", pin));
      const result = await getDocs(q);
      if (!result.empty) {
        const data = result.docs[0].data();
        setUser(data);
        setEspecialidades(Array.isArray(data.especialidades) ? data.especialidades : []);
        setLoading(false);
        return;
      }
      setError("No existe aspirante con ese PIN.");
      setLoading(false);
    })();
  }, [pin]);

  useEffect(() => {
    if (!pin) return;
    const ref = doc(db, "calificacionesConquis", pin);
    const unsub = onSnapshot(ref, (snap) => {
      const puntos = snap.exists() ? snap.data().puntos || {} : {};
      const etiquetas =
        (snap.exists()
          ? (snap.data().etiquetasActividades as Record<string, string>)
          : undefined) || {};
      const categorias = getCategoriasConPuntos(puntos, etiquetas);
      setCalificacionesRecientes(
        categorias.map((cat) => ({
          id: cat.id,
          materia: cat.nombre,
          nota: `${cat.valor} pts`,
          icono:
            cat.id === "misionero" ? (
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <Trophy size={20} />
              </div>
            ) : (
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <BookOpen size={20} />
              </div>
            ),
        }))
      );
      setTotalPuntos(sumarPuntos(puntos, etiquetas));
    });
    return () => unsub();
  }, [pin]);

  useEffect(() => {
    if (!pin) return;
    (async () => {
      const qEval = query(
        collection(db, "evaluacionesGuiaMayor"),
        where("aspiranteId", "==", pin)
      );
      const snapEval = await getDocs(qEval);
      const evals = snapEval.docs.map((d) => d.data() as { actividad: string; completado: boolean });
      setProgresoGM(progresoGuiaMayorDesdeEvaluaciones(evals));
    })();
  }, [pin]);

  const handleLogout = () => {
    window.location.href = "/";
  };

  if (loading) {
    return <div className="text-center mt-10 text-lg text-indigo-700">Cargando datos...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-lg text-red-700 font-bold">{error}<br/><span className="text-xs text-slate-500">PIN ingresado: {pin}</span></div>;
  }

  const nombreDisplay = nombreCompletoAspirante(user) || user.nombre || "Aspirante";
  const genero = user.genero || user.sexo || "—";
  const nacimiento = user.nacimiento
    ? formatFechaDDMMYYYY(String(user.nacimiento).slice(0, 10))
    : "—";

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-10">
        <div className="absolute top-0 left-0 w-full h-80 md:h-64 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 z-0 opacity-95 rounded-b-4xl md:rounded-none" />
        <nav className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 shadow-lg">
              <ShieldCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-white font-black text-sm md:text-xl tracking-tight leading-none uppercase">
              Aspirante a Guía Mayor
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
              <Bell size={18} />
            </button>
            <button
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white p-2 md:px-4 md:py-2 rounded-xl border border-white/20 hover:bg-red-500/80 transition-all shadow-lg active:scale-95"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span className="hidden md:inline text-sm font-black uppercase tracking-wider">Cerrar Sesión</span>
            </button>
          </div>
        </nav>
        <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
          <div className="mt-4 md:mt-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-white text-4xl md:text-6xl font-black tracking-tighter leading-tight drop-shadow-md">
                ¡Hola, {nombreDisplay.split(" ")[0]}! 👋
              </h1>
              <p className="text-indigo-100 text-base md:text-xl font-medium">
                {user.asociacion ? (
                  <>Asociación: <span className="font-bold underline decoration-pink-400 decoration-4 underline-offset-4">{user.asociacion}</span></>
                ) : user.club ? (
                  <>Club: <span className="font-bold underline decoration-pink-400 decoration-4 underline-offset-4">{user.club}</span></>
                ) : null}
              </p>
            </div>
            <div className="bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center md:justify-start gap-4 border border-white mx-auto md:mx-0 w-full max-w-sm md:w-auto transform hover:scale-105 transition-transform cursor-default">
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Tu Rol</p>
                <p className="text-xl font-black text-slate-800 leading-none mb-1">Aspirante a Guía Mayor</p>
                <div className="flex items-center gap-2 text-green-600 font-black">
                  <TrendingUp size={16} />
                  <span className="text-sm tracking-tight">{totalPuntos} PUNTOS</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-100 overflow-hidden relative group">
                <div className="absolute -top-10 -right-10 p-8 opacity-5 group-hover:scale-110 transition-transform hidden lg:block">
                  <Map size={240} />
                </div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Mi Club: {user.club || 'Sin club'}</h3>
                      <p className="text-slate-500 text-base font-medium">Gestiona y motiva tu progreso.</p>
                    </div>
                    <div className="bg-green-600 text-white px-6 py-2 rounded-2xl shadow-lg shadow-green-200">
                      <span className="text-3xl md:text-4xl font-black leading-none">{progresoGM.porcentaje}%</span>
                    </div>
                  </div>
                  <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden mb-8 shadow-inner p-1">
                    <div
                      className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 shadow-md"
                      style={{ width: `${progresoGM.porcentaje}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                      <CheckCircle2 className="text-indigo-600 shrink-0" size={24} />
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Completado</p>
                        <p className="font-black text-slate-800 text-lg">{progresoGM.completadas} Requisitos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 rounded-3xl bg-orange-50/50 border border-orange-100 group-hover:bg-orange-50 transition-colors">
                      <Clock className="text-orange-600 shrink-0" size={24} />
                      <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Pendiente</p>
                        <p className="font-black text-slate-800 text-lg">{progresoGM.pendientes} Requisitos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 rounded-3xl bg-purple-50/50 border border-purple-100 group-hover:bg-purple-50 transition-colors">
                      <Trophy className="text-purple-600 shrink-0" size={24} />
                      <div>
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">Siguiente Nivel</p>
                        <p className="font-black text-slate-800 text-lg">Guía Mayor</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-xl flex items-center gap-3 tracking-tight">
                      <BookOpen className="text-indigo-600" size={24} />
                      Calificaciones
                    </h3>
                    <button
                      className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                      onClick={() => window.location.href = `/conquistadores/calificaciones?pin=${pin}`}
                    >
                      Ver Todo
                    </button>
                  </div>
                  <div className="space-y-4">
                    {calificacionesRecientes.length === 0 && (
                      <div className="text-slate-400 text-xs">No tienes puntos registrados aún.</div>
                    )}
                    {calificacionesRecientes.map(cal => (
                      <div key={cal.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-3xl border border-transparent hover:border-slate-200 hover:bg-white transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="group-hover:scale-110 transition-transform">{cal.icono}</div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{cal.materia}</p>
                          </div>
                        </div>
                        <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-black uppercase shadow-sm">
                          {cal.nota}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-xl flex items-center gap-3 tracking-tight">
                      <Medal className="text-pink-500" size={24} />
                      Especialidades
                    </h3>
                    <button className="text-pink-500 text-xs font-black uppercase tracking-widest hover:underline">Explorar</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                    {especialidades.length === 0 && (
                      <div className="text-slate-400 text-xs">No tienes especialidades registradas.</div>
                    )}
                    {especialidades.map((esp, idx) => (
                      <div key={esp + idx} className="flex flex-col items-center gap-3 p-5 bg-indigo-50/30 rounded-4xl border border-indigo-100 min-w-32 md:flex-1 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-md border-2 border-indigo-50">
                          {iconosEspecialidades[esp] || <Medal className="text-pink-400" size={32} />}
                        </div>
                        <p className="text-[10px] font-black text-center text-slate-600 uppercase tracking-tighter leading-none">{esp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6 md:space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
                <h3 className="font-black text-xl mb-6 flex items-center gap-3 tracking-tight">
                  <UserCircle className="text-indigo-600" size={24} />
                  Mi información
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Nombre</dt>
                    <dd className="font-bold text-slate-800 text-right">{nombreDisplay}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Edad</dt>
                    <dd className="font-bold text-slate-800">{user.edad || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Nacimiento</dt>
                    <dd className="font-bold text-slate-800">{nacimiento}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Género</dt>
                    <dd className="font-bold text-slate-800">{genero}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Asociación</dt>
                    <dd className="font-bold text-slate-800 text-right">{user.asociacion || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500 font-semibold">Cargo</dt>
                    <dd className="font-bold text-slate-800">{user.cargo || "Aspirante"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 font-semibold">PIN</dt>
                    <dd className="font-mono font-bold text-indigo-700">{pin}</dd>
                  </div>
                </dl>
                {user.fichaMedicaUrl ? (
                  <a
                    href={user.fichaMedicaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-100"
                  >
                    Ver ficha médica
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
