"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { resolverLoginPorPin } from "@/src/lib/loginPin";
import {
  LOGO_APLICACION_HEIGHT,
  LOGO_APLICACION_SRC,
  LOGO_APLICACION_VERSION,
  LOGO_APLICACION_WIDTH,
} from "@/src/constants/branding";

export default function HomeLoginPage() {
  const handleKeypad = (num: string) => {
    if (verificandoRef.current || pin.length >= 4) return;
    setPin(pin + num);
  };
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  const verificandoRef = useRef(false);

  const handleDelete = () => {
    if (verificandoRef.current) return;
    if (pin.length > 0) setPin(pin.slice(0, -1));
  };

  React.useEffect(() => {
    if (pin.length !== 4 || verificandoRef.current) return;

    verificandoRef.current = true;
    setVerificando(true);
    setError("");

    (async () => {
      const resultado = await resolverLoginPorPin(pin);
      if (!resultado.ok) {
        setError(resultado.mensaje);
        setTimeout(() => setPin(""), 600);
      }
      verificandoRef.current = false;
      setVerificando(false);
    })();
  }, [pin]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 font-sans">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-70"
        aria-hidden
      >
        <source src="/fondo-login.mp4" type="video/mp4" />
      </video>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-slate-900/40 via-indigo-900/60 to-slate-900/90"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 text-center duration-700">
          <div className="relative mx-auto mb-5 flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
            <div className="absolute inset-0 rounded-[2rem] bg-white/15 blur-xl" aria-hidden />
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/35 bg-white/20 p-3 shadow-2xl shadow-indigo-900/40 backdrop-blur-xl ring-1 ring-white/25">
              <Image
                key={LOGO_APLICACION_VERSION}
                src={LOGO_APLICACION_SRC}
                alt="Logo Club Caleb - Conquistadores"
                width={LOGO_APLICACION_WIDTH}
                height={LOGO_APLICACION_HEIGHT}
                priority
                unoptimized
                className="h-full w-full object-contain"
                sizes="(max-width: 640px) 128px, 144px"
              />
            </div>
          </div>
          <h1 className="mb-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            CLUB <span className="text-indigo-400">CALEB</span>
          </h1>
          <p className="text-sm font-medium tracking-wide text-indigo-100/80 sm:text-base">
            CENTRO DE COMANDO
          </p>
        </div>
        <div className="relative w-full rounded-[3rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-lg font-bold text-white">Ingresa tu PIN</h2>
            <div className="mb-2 flex justify-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                    pin.length > i
                      ? "scale-110 border-white bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                      : "border-white/30 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                disabled={verificando}
                onClick={() => handleKeypad(num.toString())}
                className="flex aspect-square w-full touch-manipulation select-none items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-bold text-white transition-all hover:bg-white/20 active:scale-95 active:bg-white/30 disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={verificando}
              onClick={() => handleKeypad("*")}
              className="flex aspect-square w-full touch-manipulation select-none items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-2xl font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 active:scale-95 disabled:opacity-50"
            >
              *
            </button>
            <button
              type="button"
              disabled={verificando}
              onClick={() => handleKeypad("0")}
              className="flex aspect-square w-full touch-manipulation select-none items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-bold text-white transition-all hover:bg-white/20 active:scale-95 active:bg-white/30 disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={verificando}
              onClick={handleDelete}
              className="flex aspect-square w-full touch-manipulation select-none items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <button className="mt-8 w-full text-xs font-bold uppercase tracking-widest text-indigo-200/50 transition-colors hover:text-white">
            ¿Olvidaste tu PIN?
          </button>
          {verificando && (
            <p className="mt-4 text-center text-sm font-semibold text-indigo-200">
              Verificando PIN…
            </p>
          )}
          {error && (
            <div className="mt-4 animate-pulse text-center text-sm font-bold text-red-400">
              {error}
            </div>
          )}
        </div>
        <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
          Preparados para servir • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
