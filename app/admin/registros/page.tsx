"use client";
import { useRouter } from "next/navigation";

const PASOS_RESTAURACION = [
  { n: 0, titulo: "Respaldo y restauración", ruta: "/admin/respaldo", nota: "Descarga .json al PC o recupera todo si borraste datos." },
  { n: 1, titulo: "Unidades", ruta: "/admin/unidades", nota: "Gacelas, Tigres, etc." },
  { n: 2, titulo: "Consejeros", ruta: "/admin/consejero", nota: "Asigna unidades a cada consejero. Guarda el PIN que genera." },
  { n: 3, titulo: "Registro Conquis", ruta: "/admin/RegistroConquis", nota: "Conquistadores con unidad y clase." },
  { n: 4, titulo: "Especialidades (catálogo)", ruta: "/admin/especialidades", nota: "Pulsa «Cargar especialidades base» si está vacío." },
  { n: 5, titulo: "Calificaciones (catálogo)", ruta: "/admin/calificaciones", nota: "Actividades con nombre y puntos XP." },
  { n: 6, titulo: "Directiva / Aspirantes", ruta: "/admin/directiva", nota: "Opcional: directiva, aspirantes a Guía Mayor." },
  { n: 7, titulo: "Calendario y eventos", ruta: "/admin/calendario", nota: "Eventos y reto del dashboard." },
  { n: 8, titulo: "Especialidades en curso", ruta: "/admin/especialidades-en-curso", nota: "Asignar y dar seguimiento por unidad." },
];

export default function RegistrosPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white border-l-4 border-teal-500 rounded-xl shadow p-8 flex flex-col items-center mb-4 w-full">
        <h2 className="text-2xl font-bold text-teal-700 mb-2">Registros</h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-xl">
          Admin: entra con PIN <strong className="text-slate-700">1844</strong> en la pantalla
          principal. Si la base está vacía, sigue este orden para volver a cargar todo.
        </p>

        <div className="w-full mb-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left">
          <p className="text-sm font-bold text-amber-900 mb-3">Orden recomendado para ingresar datos</p>
          <ol className="space-y-2">
            {PASOS_RESTAURACION.map((p) => (
              <li key={p.n} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-black text-teal-700">{p.n}.</span>
                <button
                  type="button"
                  onClick={() => router.push(p.ruta)}
                  className="font-semibold text-indigo-700 underline hover:text-indigo-900"
                >
                  {p.titulo}
                </button>
                <span className="text-slate-500">— {p.nota}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
          <button onClick={() => router.push('/admin/RegistroConquis')} className="bg-blue-50 border border-blue-500 text-blue-600 rounded-xl p-6 font-bold shadow hover:bg-blue-100 transition-all text-lg">Registro Conquis</button>
          <button onClick={() => router.push('/admin/aspirante')} className="bg-orange-50 border border-orange-500 text-orange-600 rounded-xl p-6 font-bold shadow hover:bg-orange-100 transition-all text-lg">Aspirante a Guía Mayor</button>
          <button onClick={() => router.push('/admin/unidades')} className="bg-purple-50 border border-purple-500 text-purple-600 rounded-xl p-6 font-bold shadow hover:bg-purple-100 transition-all text-lg">Unidades</button>
          <button onClick={() => router.push('/admin/especialidades')} className="bg-amber-50 border border-amber-500 text-amber-600 rounded-xl p-6 font-bold shadow hover:bg-amber-100 transition-all text-lg">Registro de Especialidades</button>
          <button onClick={() => router.push('/admin/consejero')} className="bg-green-50 border border-green-500 text-green-600 rounded-xl p-6 font-bold shadow hover:bg-green-100 transition-all text-lg">Consejeros</button>
          <button
            onClick={() => router.push('/admin/registros/actividades-conquistadores')}
            className="bg-cyan-50 border border-cyan-500 text-cyan-700 rounded-xl p-6 font-bold shadow hover:bg-cyan-100 transition-all text-lg text-left"
          >
            Puntos actividades — Conquistadores
            <span className="mt-2 block text-sm font-normal text-cyan-800/90">
              Por persona o por unidad (toda la unidad de una vez)
            </span>
          </button>
          <button
            onClick={() => router.push('/admin/registros/actividades-aspirantes')}
            className="bg-rose-50 border border-rose-500 text-rose-700 rounded-xl p-6 font-bold shadow hover:bg-rose-100 transition-all text-lg text-left"
          >
            Puntos actividades — Aspirantes
            <span className="mt-2 block text-sm font-normal text-rose-800/90">
              Por persona o por asociación / misión (grupo completo)
            </span>
          </button>
          <button
            onClick={() => router.push('/admin/registros/actividades-consejeros')}
            className="bg-emerald-50 border border-emerald-600 text-emerald-800 rounded-xl p-6 font-bold shadow hover:bg-emerald-100 transition-all text-lg md:col-span-2"
          >
            Registro puntos consejeros y asociados
          </button>
        </div>
        <button onClick={() => router.push('/admin')} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-teal-800 transition">Regresar al menú</button>
      </div>
    </div>
  );
}
