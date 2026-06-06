"use client";
import React, { useState } from "react";
import { db } from "../../src/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { irARuta } from "@/src/lib/navegacion";

export default function LoginAspirante() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const pinTrim = pin.trim();
    if (!pinTrim) return;
    setLoading(true);
    setError("");
    try {
      const ref = doc(db, "aspirantesGuiaMayor", pinTrim);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        irARuta(`/aspirante/dashboard?pin=${encodeURIComponent(pinTrim)}`);
        return;
      }
      const q = query(collection(db, "aspirantesGuiaMayor"), where("pin", "==", pinTrim));
      const result = await getDocs(q);
      if (!result.empty) {
        irARuta(`/aspirante/dashboard?pin=${encodeURIComponent(pinTrim)}`);
        return;
      }
      setError("PIN inválido o aspirante no registrado.");
    } catch {
      setError("Error al consultar datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-indigo-700">Ingreso Aspirante a Guía Mayor</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN de acceso"
          className="border p-2 rounded-xl mb-4 w-full"
          maxLength={6}
        />
        <button
          onClick={handleLogin}
          className="bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-900 transition-all w-full"
          disabled={loading || !pin.trim()}
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </div>
    </div>
  );
}
