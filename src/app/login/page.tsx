"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Cadastro iniciado. Confirme seu e-mail e depois entre.");
      } else {
        window.location.assign("/");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-7 shadow-sm md:p-9">
        <Link href="/" className="text-sm font-semibold text-[var(--green)]">← Amazônico GEO</Link>
        <h1 className="mt-8 text-2xl font-semibold">{mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use seu e-mail para acessar o painel de visibilidade em IA.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">E-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          <label className="block text-sm font-medium">Senha<input required minLength={8} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          <button disabled={loading} className="w-full rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}</button>
        </form>
        {message && <p role="status" className="mt-4 rounded-xl bg-[#edf5ef] p-3 text-sm text-[var(--green)]">{message}</p>}
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }} className="mt-5 text-sm text-[var(--muted)] underline underline-offset-4">{mode === "signin" ? "Ainda não tenho conta" : "Já tenho conta"}</button>
      </section>
    </main>
  );
}
