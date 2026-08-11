"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErro(data?.erro ?? "Não foi possível entrar.");
      setEnviando(false);
      return;
    }

    router.push("/dossies");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-6">
      <div className="w-full max-w-[380px] border border-acento p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/assets/marca-rabelo-aguiar.png"
            alt="Rabelo Aguiar Advocacia"
            width={266}
            height={68}
            style={{ height: 56, width: "auto" }}
            priority
          />
          <span className="text-[11px] font-normal uppercase tracking-[0.18em] text-neutro-700">
            Dossiês processuais
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-borda-campo bg-neutro-100 px-3 py-2 text-[14px] text-texto outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-neutro-700">
              Senha
            </span>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full border border-borda-campo bg-neutro-100 px-3 py-2 pr-9 text-[14px] text-texto outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-neutro-700 hover:text-texto"
              >
                {mostrarSenha ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path
                      d="M10.6 5.1A10.8 10.8 0 0 1 12 5c5.5 0 9 4.5 10 7-.4 1-1.2 2.4-2.4 3.7M6.2 6.2C4 7.7 2.6 9.7 2 12c1 2.5 4.5 7 10 7 1.4 0 2.7-.3 3.9-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2 12c1-2.5 4.5-7 10-7s9 4.5 10 7c-1 2.5-4.5 7-10 7s-9-4.5-10-7Z" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {erro && (
            <div className="border-l-[3px] border-acento bg-tinta-clara px-3 py-2 text-[12.5px] text-acento-profundo">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-acento px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-acento-escuro disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
