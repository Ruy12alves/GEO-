"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [region, setRegion] = useState("Brasil");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, websiteUrl, region, description }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível criar o projeto.");
      router.push(`/?created=${payload.project.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o projeto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:py-16">
      <Link href="/" className="text-sm font-medium text-[var(--green)]">← Voltar ao painel</Link>
      <section className="mt-7 rounded-3xl border border-[var(--line)] bg-white p-6 md:p-9">
        <p className="text-sm font-medium text-[var(--green)]">Configuração inicial</p>
        <h1 className="mt-2 text-2xl font-semibold">Cadastre sua empresa</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Essas informações formam o contexto usado para comparar respostas de ferramentas de IA.</p>
        <form className="mt-7 grid gap-5" onSubmit={submit}>
          <label className="text-sm font-medium">Nome da empresa<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Amazônico Projetos e Serviços Industriais" className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          <label className="text-sm font-medium">Site<input required type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://suaempresa.com.br" className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          <label className="text-sm font-medium">Região atendida<input required maxLength={120} value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Ceará e Nordeste" className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          <label className="text-sm font-medium">Serviços e contexto<textarea rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva os serviços que deseja monitorar…" className="mt-2 w-full resize-y rounded-xl border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]" /></label>
          {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
          <button disabled={loading} className="w-fit rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{loading ? "Salvando…" : "Criar projeto"}</button>
        </form>
      </section>
    </main>
  );
}
