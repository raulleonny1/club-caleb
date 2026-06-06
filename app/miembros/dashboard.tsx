"use client";
import React, { useEffect, useState } from 'react';
import { db, formatFechaDDMMYYYY } from "../../src/firebase";
import { collection, getDocs, query, where, doc, onSnapshot } from "firebase/firestore";
import { nombreEvento, ordenarEventosPorFecha, type EventoFirestore } from "@/src/lib/eventos";
import {
	DEFAULT_RETO_MIEMBRO,
	mergeRetoConfig,
	RETO_MIEMBRO_DOC_REF,
	versionIdRetoMiembro,
	type RetoMiembroDashboardConfig,
} from "@/src/lib/retoMiembroDashboard";
import {
	registrarAceptacionRetoMiembro,
	refAceptacionReto,
} from "@/src/lib/retoMiembroAceptaciones";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Trophy,
	Calendar,
	BookOpen,
	LogOut,
	Bell,
	ChevronRight,
	Medal,
	CheckCircle2,
	Clock,
	ShieldCheck,
	TrendingUp
} from 'lucide-react';
import { getCategoriasConPuntos, indexarTotalesPorPin, sumarPuntos } from "@/src/lib/categoriasPuntos";
import {
	construirRankingConquistadores,
	posicionConquistador,
	type PosicionRankingConquistador as PosicionRanking,
} from "@/src/lib/rankingConquistadores";
import PosicionRankingConquistador from "@/src/components/PosicionRankingConquistador";
import {
	getProgresoClasePorcentaje,
	getSiguienteClase,
	resumenTareasDesdeHistorial,
	type ResumenTareasMiembro,
} from "@/src/lib/progresoConquistador";
import RetoEspecialCard from "@/src/components/RetoEspecialCard";
import {
	ordenarRetosPorFecha,
	tituloRetoMiembro,
	type RetoEspecialDoc,
} from "@/src/lib/retosEspeciales";
import { toast } from "react-hot-toast";
import {
	iconoAreaEspecialidad,
	parseEspecialidadesEnCurso,
	etiquetaEstadoEspecialidad,
	estiloEstadoEspecialidad,
	type EspecialidadEnCurso,
} from "@/src/lib/especialidadEnCurso";
import {
	formatearFechaAvance,
	marcarNotificacionAvanceVista,
	parseHistorialAvanceDoc,
	parseNotificacionAvance,
	type EspecialidadAvanceHistorialEntry,
	type EspecialidadAvanceNotif,
} from "@/src/lib/especialidadAvance";

interface Usuario {
	nombre?: string;
	unidad?: string;
	clase?: string;
	tareasCompletadas?: number;
	tareasPendientes?: number;
	siguienteNivel?: string;
	rango?: string;
	puntos?: number;
	progresoClase?: number;
}
function App() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pin = searchParams.get("pin") || "";
	const [user, setUser] = useState<Usuario | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [especialidadesEnCurso, setEspecialidadesEnCurso] = useState<EspecialidadEnCurso[]>([]);
	const [calificacionesRecientes, setCalificacionesRecientes] = useState<any[]>([]);
	const [puntosCategorias, setPuntosCategorias] = useState<Record<string, number>>({});
	const [etiquetasActividades, setEtiquetasActividades] = useState<Record<string, string>>({});
	const [proximosEventos, setProximosEventos] = useState<EventoFirestore[]>([]);
	const [progresoClase, setProgresoClase] = useState(0);
	const [siguienteClase, setSiguienteClase] = useState<string | null>(null);
	const [resumenTareas, setResumenTareas] = useState<ResumenTareasMiembro>({
		tareasRegistradas: 0,
		puntosTareas: 0,
	});
	const [historialSemanal, setHistorialSemanal] = useState<{ puntos?: Record<string, unknown> }[]>([]);
	const [retoMiembro, setRetoMiembro] = useState<RetoMiembroDashboardConfig>(DEFAULT_RETO_MIEMBRO);
	const [unidadMiembro, setUnidadMiembro] = useState("");
	const [retoConsejero, setRetoConsejero] = useState<RetoEspecialDoc | null>(null);
	const [posicionRanking, setPosicionRanking] = useState<PosicionRanking | null>(null);
	const [cargandoRanking, setCargandoRanking] = useState(true);
	const [registrosConquis, setRegistrosConquis] = useState<{ pin: string; unidad: string }[]>([]);
	const [totalesRanking, setTotalesRanking] = useState<Record<string, number>>({});
	const [retoMiembroAceptado, setRetoMiembroAceptado] = useState(false);
	const [aceptandoReto, setAceptandoReto] = useState(false);
	const [conquisDocId, setConquisDocId] = useState("");
	const [notificacionAvance, setNotificacionAvance] = useState<EspecialidadAvanceNotif | null>(null);
	const [historialAvanceEsp, setHistorialAvanceEsp] = useState<EspecialidadAvanceHistorialEntry[]>([]);
	const [cerrandoNotif, setCerrandoNotif] = useState(false);

	useEffect(() => {
		const unsub = onSnapshot(
			RETO_MIEMBRO_DOC_REF,
			(snap) => {
				setRetoMiembro(mergeRetoConfig(snap.exists() ? (snap.data() as Partial<RetoMiembroDashboardConfig>) : undefined));
			},
			() => {
				setRetoMiembro(DEFAULT_RETO_MIEMBRO);
			}
		);
		return () => unsub();
	}, []);

	useEffect(() => {
		const versionId = versionIdRetoMiembro(retoMiembro);
		if (!pin.trim()) {
			setRetoMiembroAceptado(false);
			return;
		}
		const unsub = onSnapshot(
			refAceptacionReto(versionId, pin),
			(snap) => setRetoMiembroAceptado(snap.exists()),
			() => setRetoMiembroAceptado(false)
		);
		return () => unsub();
	}, [pin, retoMiembro]);

	const aceptarRetoMiembro = async () => {
		const versionId = versionIdRetoMiembro(retoMiembro);
		if (!pin.trim()) return;
		if (retoMiembroAceptado || aceptandoReto) return;
		setAceptandoReto(true);
		try {
			const apellido = (user as { apellido?: string } | null)?.apellido;
			const nombre =
				[user?.nombre, apellido].filter(Boolean).join(" ").trim() ||
				user?.nombre ||
				"Conquistador";
			await registrarAceptacionRetoMiembro({
				pin,
				nombre,
				unidad: unidadMiembro || user?.unidad || "",
				retoVersionId: versionId,
				tituloReto: retoMiembro.titulo,
			});
			setRetoMiembroAceptado(true);
			toast.success("¡Reto aceptado! El admin ya puede ver tu nombre en Calendario.");
		} catch (err) {
			console.error(err);
			toast.error("No se pudo registrar. Revisa tu conexión o pide al admin desplegar las reglas de Firebase.");
		} finally {
			setAceptandoReto(false);
		}
	};

	useEffect(() => {
		if (!pin) return;

		const unsubConquis = onSnapshot(doc(db, "calificacionesConquis", pin), (conquisSnap) => {
			if (conquisSnap.exists()) {
				const data = conquisSnap.data();
				setPuntosCategorias(data.puntos || {});
				setEtiquetasActividades(
					(data.etiquetasActividades as Record<string, string>) || {}
				);
			} else {
				setPuntosCategorias({});
				setEtiquetasActividades({});
			}
		});

		const qRegistro = query(collection(db, "RegistroConquis"), where("pin", "==", pin));
		const unsubRegistro = onSnapshot(
			qRegistro,
			(snap) => {
				if (snap.empty) {
					setError("PIN inválido o usuario no encontrado.");
					setLoading(false);
					return;
				}
				const docSnap = snap.docs[0];
				const data = docSnap.data();
				const clase = (data.clase as string) || "";
				setConquisDocId(docSnap.id);
				setUser({ ...data });
				setUnidadMiembro((data.unidad as string) || "");
				setEspecialidadesEnCurso(parseEspecialidadesEnCurso(data.especialidades));
				setNotificacionAvance(parseNotificacionAvance(data.especialidadAvanceNotif));
				setSiguienteClase(getSiguienteClase(clase));
				const pctGuardado =
					typeof data.progresoClase === "number" && !Number.isNaN(data.progresoClase)
						? data.progresoClase
						: null;
				setProgresoClase(pctGuardado ?? getProgresoClasePorcentaje(clase));
				setError("");
				setLoading(false);
			},
			(err) => {
				console.error(err);
				setLoading(false);
			}
		);

		(async () => {
			try {
				const califSnap = await getDocs(
					query(collection(db, "calificaciones"), where("pin", "==", pin))
				);
				setCalificacionesRecientes(califSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

				const semSnap = await getDocs(
					query(collection(db, "calificacionesSemanal"), where("pin", "==", pin))
				);
				setHistorialSemanal(semSnap.docs.map((d) => d.data() as { puntos?: Record<string, unknown> }));
			} catch (err) {
				console.error(err);
			}
		})();

		return () => {
			unsubConquis();
			unsubRegistro();
		};
	}, [pin]);

	useEffect(() => {
		if (!pin.trim()) {
			setHistorialAvanceEsp([]);
			return;
		}
		const qHist = query(
			collection(db, "especialidadAvanceHistorial"),
			where("pin", "==", pin)
		);
		const unsub = onSnapshot(qHist, (snap) => {
			const items = snap.docs
				.map((d) => parseHistorialAvanceDoc(d.id, d.data() as Record<string, unknown>))
				.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
			setHistorialAvanceEsp(items.slice(0, 8));
		});
		return () => unsub();
	}, [pin]);

	const cerrarNotificacionAvance = async () => {
		if (!conquisDocId || cerrandoNotif) return;
		setCerrandoNotif(true);
		try {
			await marcarNotificacionAvanceVista(conquisDocId);
			setNotificacionAvance((prev) => (prev ? { ...prev, visto: true } : null));
		} catch (err) {
			console.error(err);
		} finally {
			setCerrandoNotif(false);
		}
	};

	useEffect(() => {
		setResumenTareas(resumenTareasDesdeHistorial(historialSemanal, puntosCategorias));
	}, [historialSemanal, puntosCategorias]);

	useEffect(() => {
		const unsubEventos = onSnapshot(collection(db, "eventos"), (snap) => {
			const lista = ordenarEventosPorFecha(
				snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventoFirestore))
			);
			setProximosEventos(lista);
		});
		return () => unsubEventos();
	}, []);

	useEffect(() => {
		const unsub = onSnapshot(
			collection(db, "RegistroConquis"),
			(snap) => {
				setRegistrosConquis(
					snap.docs.map((d) => {
						const data = d.data();
						return {
							pin: String(data.pin ?? "").trim(),
							unidad: String(data.unidad ?? "").trim(),
						};
					}).filter((r) => r.pin)
				);
			},
			() => setRegistrosConquis([])
		);
		return () => unsub();
	}, []);

	useEffect(() => {
		const unsub = onSnapshot(
			collection(db, "calificacionesConquis"),
			(snap) => {
				setTotalesRanking(indexarTotalesPorPin(snap.docs));
				setCargandoRanking(false);
			},
			() => {
				setTotalesRanking({});
				setCargandoRanking(false);
			}
		);
		return () => unsub();
	}, []);

	useEffect(() => {
		if (!pin.trim() || registrosConquis.length === 0) {
			setPosicionRanking(null);
			return;
		}
		const lista = construirRankingConquistadores(registrosConquis, totalesRanking);
		setPosicionRanking(posicionConquistador(pin, unidadMiembro, lista));
	}, [pin, registrosConquis, totalesRanking, unidadMiembro]);

	useEffect(() => {
		if (!unidadMiembro.trim()) {
			setRetoConsejero(null);
			return;
		}
		const q = query(
			collection(db, "retosEspeciales"),
			where("unidad", "==", unidadMiembro.trim())
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				const lista = ordenarRetosPorFecha(
					snap.docs.map((d) => ({ id: d.id, ...d.data() } as RetoEspecialDoc))
				);
				setRetoConsejero(lista[0] ?? null);
			},
			() => setRetoConsejero(null)
		);
		return () => unsub();
	}, [unidadMiembro]);

	if (loading) return <div className="text-center mt-10 text-lg text-indigo-700">Cargando datos...</div>;
	if (error) return <div className="text-center mt-10 text-lg text-red-700">{error}</div>;
	if (!user) return <div className="text-center mt-10 text-lg text-red-700">Usuario no encontrado.</div>;

	const nombre = user.nombre || "Conquistador";
	const unidad = user.unidad || "Sin unidad";
	const tareasCompletadas =
		typeof user.tareasCompletadas === "number"
			? user.tareasCompletadas
			: resumenTareas.tareasRegistradas;
	const tareasPendientes =
		typeof user.tareasPendientes === "number" ? user.tareasPendientes : 0;
	const siguienteNivel =
		user.siguienteNivel || siguienteClase || "Nivel máximo (Guía)";
	const rangoActual = user.clase || user.rango || "Sin clase";
	const categoriasConPuntos = getCategoriasConPuntos(puntosCategorias, etiquetasActividades);
	const totalPuntos = sumarPuntos(puntosCategorias, etiquetasActividades);

	return (
		<>
			<div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-10">
			<div className="absolute top-0 left-0 w-full h-80 md:h-64 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 z-0 opacity-95 rounded-b-[2.5rem] md:rounded-none" />
			<nav className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
				<div className="flex items-center gap-2 md:gap-3">
					<div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 shadow-lg">
						<ShieldCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
					</div>
					<span className="text-white font-black text-sm md:text-xl tracking-tight leading-none uppercase">
						Club de Conquistadores
					</span>
				</div>
				<div className="flex items-center gap-2 md:gap-4">
					<button className="relative p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
						<Bell size={18} />
						{notificacionAvance && !notificacionAvance.visto ? (
							<span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
						) : null}
					</button>
					<button className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white p-2 md:px-4 md:py-2 rounded-xl border border-white/20 hover:bg-red-500/80 transition-all shadow-lg active:scale-95" onClick={() => router.push("/")}>
						<LogOut size={18} />
						<span className="hidden md:inline text-sm font-black uppercase tracking-wider">Cerrar Sesión</span>
					</button>
				</div>
			</nav>
			<main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
				<div className="mt-4 md:mt-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
					<div className="space-y-1 text-center md:text-left">
						<h1 className="text-white text-4xl md:text-6xl font-black tracking-tighter leading-tight drop-shadow-md">
							¡Hola, {nombre.split(' ')[0]}! 👋
						</h1>
						<p className="text-indigo-100 text-base md:text-xl font-medium">
							Orgulloso miembro de la unidad <span className="font-bold underline decoration-pink-400 decoration-4 underline-offset-4">{unidad}</span>
						</p>
					</div>
					<div className="bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-center md:justify-start gap-4 border border-white mx-auto md:mx-0 w-full max-w-sm md:w-auto transform hover:scale-105 transition-transform cursor-default">
						<div className="bg-amber-100 p-4 rounded-3xl shadow-inner">
							<Trophy className="text-amber-500 fill-amber-500" size={32} />
						</div>
						<div className="text-left">
							<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Tu Rango Actual</p>
							<p className="text-xl font-black text-slate-800 leading-none mb-1">{rangoActual}</p>
							<div className="flex items-center gap-2 text-indigo-600 font-black">
								<TrendingUp size={16} />
								<span className="text-sm tracking-tight">{totalPuntos.toLocaleString()} PUNTOS XP</span>
							</div>
						</div>
					</div>
				</div>
				<PosicionRankingConquistador
					posicion={posicionRanking}
					cargando={cargandoRanking}
					unidad={unidad}
				/>
				{notificacionAvance && !notificacionAvance.visto ? (
					<div className="mb-6 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-start gap-3">
							<div className="rounded-xl bg-indigo-600 p-2 text-white">
								<Bell size={18} />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-black uppercase tracking-wide text-indigo-700">
									Actualización de especialidad
								</p>
								<p className="text-sm font-semibold text-slate-800">{notificacionAvance.mensaje}</p>
								<p className="mt-0.5 text-[10px] text-slate-500">
									{formatearFechaAvance(notificacionAvance.fecha)}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={cerrarNotificacionAvance}
							disabled={cerrandoNotif}
							className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
						>
							Entendido
						</button>
					</div>
				) : null}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
					<div className="lg:col-span-8 space-y-6 md:space-y-8">
						<div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-100 overflow-hidden relative">
							<div className="relative z-10">
								<div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
									<div>
										<h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Mi Progreso: {user.clase || 'Excursionista'}</h3>
										<p className="text-slate-500 text-base font-medium">¡Estás dominando los requisitos de este año!</p>
									</div>
									<div className="bg-indigo-600 text-white px-6 py-2 rounded-2xl shadow-lg shadow-indigo-200">
										<span className="text-3xl md:text-4xl font-black leading-none">{progresoClase}%</span>
									</div>
								</div>
								<div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden mb-8 shadow-inner p-1">
									<div 
										className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 shadow-md"
										style={{ width: `${progresoClase}%` }}
									/>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<div className="flex items-center gap-4 p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 group-hover:bg-indigo-50 transition-colors">
										<CheckCircle2 className="text-indigo-600 shrink-0" size={24} />
										<div>
											<p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Completado</p>
											<p className="font-black text-slate-800 text-lg">
												{tareasCompletadas} Tareas
												{resumenTareas.puntosTareas > 0 && (
													<span className="block text-xs font-bold text-indigo-500/80 mt-0.5">
														{resumenTareas.puntosTareas} pts (consejero/admin)
													</span>
												)}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-4 p-5 rounded-3xl bg-orange-50/50 border border-orange-100 group-hover:bg-orange-50 transition-colors">
										<Clock className="text-orange-600 shrink-0" size={24} />
										<div>
											<p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Pendiente</p>
											<p className="font-black text-slate-800 text-lg">{tareasPendientes} Tareas</p>
										</div>
									</div>
									<div className="flex items-center gap-4 p-5 rounded-3xl bg-purple-50/50 border border-purple-100 group-hover:bg-purple-50 transition-colors">
										<Trophy className="text-purple-600 shrink-0" size={24} />
										<div>
											<p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">Siguiente Nivel</p>
											<p className="font-black text-slate-800 text-lg">{siguienteNivel}</p>
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
									<button className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline" onClick={() => router.push(`/miembros/calificaciones?pin=${pin}`)}>Ver Todo</button>
								</div>
								<div className="space-y-4">
									{categoriasConPuntos.length === 0 && calificacionesRecientes.length === 0 ? (
										<div className="text-slate-400 text-xs">Aún no tienes puntos ni notas registradas.</div>
									) : (
										<>
											{categoriasConPuntos.map((cat) => (
												<div
													key={cat.id}
													className="flex items-center justify-between p-4 bg-slate-50/80 rounded-3xl border border-transparent hover:border-slate-200 hover:bg-white transition-all"
												>
													<div className="flex items-center gap-4">
														<div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
															<Trophy size={18} />
														</div>
														<p className="font-black text-slate-800 text-sm">{cat.nombre}</p>
													</div>
													<span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-black uppercase shadow-sm">
														{cat.valor} pts
													</span>
												</div>
											))}
											{calificacionesRecientes.map((cal: { id: string; materia?: string; nota?: string }) => (
												<div key={cal.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-3xl border border-transparent hover:border-slate-200 hover:bg-white transition-all">
													<div className="flex items-center gap-4">
														<BookOpen size={20} className="text-slate-500" />
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
										</>
									)}
								</div>
							</div>
							<div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
								<div className="flex items-center justify-between mb-8">
									<h3 className="font-black text-xl flex items-center gap-3 tracking-tight">
										<Medal className="text-pink-500" size={24} />
										Especialidad en curso
									</h3>
								</div>
								<div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
									{especialidadesEnCurso.length === 0 ? (
										<div className="text-slate-400 text-xs">
											Aún no tienes especialidad asignada. Tu unidad o el admin la
											registrará pronto.
										</div>
									) : (
										especialidadesEnCurso.map((esp, idx) => (
											<div
												key={`${esp.area}-${esp.categoria}-${esp.especialidad}-${idx}`}
												className="flex min-w-[200px] flex-col gap-3 rounded-4xl border border-indigo-100 bg-indigo-50/30 p-5 shadow-sm hover:shadow-md transition-shadow md:flex-1"
											>
												<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-indigo-50 bg-white text-3xl shadow-md">
													{iconoAreaEspecialidad(esp.area)}
												</div>
												<div className="space-y-1.5 text-center">
													{esp.area ? (
														<span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-800">
															{esp.area}
														</span>
													) : null}
													{esp.categoria ? (
														<p className="text-[11px] font-bold uppercase tracking-tight text-slate-500">
															{esp.categoria}
														</p>
													) : null}
													<p className="text-sm font-black leading-tight text-slate-800">
														{esp.especialidad}
													</p>
													<span
														className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${estiloEstadoEspecialidad(esp.estado)}`}
													>
														{etiquetaEstadoEspecialidad(esp.estado)}
													</span>
												</div>
											</div>
										))
									)}
								</div>
								{historialAvanceEsp.length > 0 ? (
									<div className="mt-6 border-t border-slate-100 pt-5">
										<p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
											Historial de avances
										</p>
										<ul className="space-y-2">
											{historialAvanceEsp.map((h) => (
												<li
													key={h.id}
													className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs"
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<span
															className={`rounded-full px-2 py-0.5 font-bold uppercase ${estiloEstadoEspecialidad(h.estadoNuevo)}`}
														>
															{etiquetaEstadoEspecialidad(h.estadoNuevo)}
														</span>
														<span className="text-slate-400">
															{formatearFechaAvance(h.createdAt)}
														</span>
													</div>
													<p className="mt-1 font-medium text-slate-600">
														{h.tipo === "asignacion"
															? "Especialidad asignada"
															: h.estadoAnterior
																? `${etiquetaEstadoEspecialidad(h.estadoAnterior)} → ${etiquetaEstadoEspecialidad(h.estadoNuevo)}`
																: etiquetaEstadoEspecialidad(h.estadoNuevo)}
													</p>
												</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
						</div>
					</div>
					<div className="lg:col-span-4 space-y-6 md:space-y-8">
						<div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
							<h3 className="font-black text-xl mb-8 flex items-center gap-3 tracking-tight">
								<Calendar className="text-orange-500" size={24} />
								Próximos Eventos
							</h3>
							<div className="space-y-4">
								{proximosEventos.length === 0 ? (
									<div className="text-slate-400 text-xs">No hay eventos próximos.</div>
								) : (
									proximosEventos.map((evento) => (
										<div key={evento.id} className="p-5 rounded-4xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer group active:scale-95">
											<div className="flex items-center justify-between mb-3">
												<span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${evento.color || 'bg-orange-100 text-orange-600'}`}>
													{evento.tipo || 'Evento'}
												</span>
												<ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
											</div>
											<h4 className="font-black text-slate-800 leading-tight mb-2 text-base">{nombreEvento(evento)}</h4>
											<div className="flex items-center gap-3 text-slate-500 text-xs font-bold uppercase tracking-widest">
												<div className="p-1.5 bg-indigo-50 rounded-lg"><Clock size={14} className="text-indigo-500" /></div>
												{formatFechaDDMMYYYY(evento.fecha)}
												{evento.hora ? ` · ${evento.hora}` : ""}
											</div>
											{evento.lugar ? (
												<p className="mt-2 text-xs font-semibold text-slate-500">Lugar: {evento.lugar}</p>
											) : null}
											{evento.observacion ? (
												<p className="mt-1 text-xs text-slate-400">{evento.observacion}</p>
											) : null}
										</div>
									))
								)}
							</div>
							  <button className="w-full mt-8 py-4 rounded-3xl bg-indigo-50 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-md active:scale-95">
								Calendario Completo
							</button>
						</div>
						{retoConsejero ? (
							<RetoEspecialCard
								etiqueta="Reto Especial"
								titulo={tituloRetoMiembro(retoConsejero)}
								descripcion={retoConsejero.descripcion}
								textoBoton="¡Aceptar Reto!"
								onAceptar={() => {
									toast.success(
										`¡Reto aceptado! Al completarlo, tu consejero te asignará ${retoConsejero.puntos} pts en calificaciones.`
									);
								}}
							/>
						) : (
							retoMiembro.activo && (
								<RetoEspecialCard
									etiqueta={retoMiembro.etiqueta}
									titulo={retoMiembro.titulo}
									textoBoton={retoMiembro.textoBoton}
									urlBoton={retoMiembro.urlBoton}
									textoEnlaceMaterial="Ver cómo hacer el nudo (material)"
									mostrarIconoFondo={retoMiembro.mostrarIconoFondo}
									aceptado={retoMiembroAceptado}
									textoAceptado="¡Reto aceptado!"
									onAceptar={aceptarRetoMiembro}
								/>
							)
						)}
					</div>
				</div>
			</main>
		</div>
		</>
	);
}

export default App;
