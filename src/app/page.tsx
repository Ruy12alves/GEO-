import { ArrowUpRight, BarChart3, Bot, CircleHelp, Compass, Radar, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const metrics = [
  { label: "Presença nas respostas", value: "—", note: "Aguardando primeira análise", icon: Radar },
  { label: "Menções encontradas", value: "—", note: "Ainda sem execuções", icon: Bot },
  { label: "Concorrentes monitorados", value: "0", note: "Adicione empresas para comparar", icon: BarChart3 },
];

export default async function Home() {
  let project: { id: string; name: string; website_url: string; region: string } | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("projects")
          .select("id, name, website_url, region")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        project = data;
      }
    } catch {
      // Keep the onboarding screen available before the local Supabase stack is configured.
    }
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="flex flex-col border-r border-[var(--line)] bg-white px-5 py-6 md:min-h-screen">
        <a href="/" className="mb-10 flex items-center gap-3 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--green)] text-white"><Radar size={19} /></span>
          <span>Amazônico <span className="text-[var(--green)]">GEO</span></span>
        </a>
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Workspace</p>
        <nav className="space-y-1 text-sm">
          <a className="flex items-center gap-3 rounded-xl bg-[#edf5ef] px-3 py-2.5 font-medium text-[var(--green)]" href="/"><BarChart3 size={17} /> Visão geral</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--muted)] hover:bg-[var(--paper)]" href="#projeto"><Compass size={17} /> Meu projeto</a>
        </nav>
        <div className="mt-auto hidden space-y-1 border-t border-[var(--line)] pt-4 text-sm md:block">
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--muted)] hover:bg-[var(--paper)]" href="#ajuda"><CircleHelp size={17} /> Guia do MVP</a>
          <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--muted)] hover:bg-[var(--paper)]" href="#configuracao"><Settings2 size={17} /> Configuração</a>
        </div>
      </aside>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-11">
        <header className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div><p className="mb-2 text-sm text-[var(--muted)]">Painel de inteligência</p><h1 className="text-3xl font-semibold tracking-tight">Visão geral</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Acompanhe como ferramentas de IA mencionam e recomendam sua empresa.</p></div>
          <div className="flex items-center gap-3">
            <a href="/login" className="rounded-xl px-3 py-3 text-sm font-medium text-[var(--muted)] hover:bg-white">Entrar</a>
            <a href="#projeto" className="inline-flex items-center gap-2 rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#19563b]">Configurar projeto <ArrowUpRight size={16} /></a>
          </div>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {metrics.map(({ label, value, note, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="mb-5 flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{label}</p><Icon className="text-[var(--green)]" size={18} /></div>
              <p className="text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <article id="projeto" className="rounded-2xl border border-[var(--line)] bg-white p-6 md:p-8">
            {project ? <>
              <div className="mb-6 flex size-11 items-center justify-center rounded-2xl bg-[#edf5ef] text-[var(--green)]"><Compass size={21} /></div>
              <p className="mb-2 text-sm font-medium text-[var(--green)]">Projeto monitorado</p>
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{project.website_url} · {project.region}</p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">O cadastro está pronto. O próximo passo é configurar perguntas e concorrentes antes de ativar a primeira coleta.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/projects/new" className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-medium hover:bg-[var(--paper)]">Adicionar outro projeto</a>
                <a href="#ajuda" className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-medium hover:bg-[var(--paper)]">Ver etapas do MVP</a>
              </div>
            </> : <>
              <div className="mb-6 flex size-11 items-center justify-center rounded-2xl bg-[#edf5ef] text-[var(--green)]"><Compass size={21} /></div>
              <p className="mb-2 text-sm font-medium text-[var(--green)]">Primeiro passo</p>
              <h2 className="text-xl font-semibold">Configure a empresa que você quer monitorar</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Cadastre o site, a região atendida e os serviços. Depois, defina perguntas de referência e concorrentes para iniciar uma análise comparável.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/projects/new" className="rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-medium text-white hover:bg-[#19563b]">Criar primeiro projeto</a>
                <a href="#ajuda" className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-medium hover:bg-[var(--paper)]">Ver etapas do MVP</a>
              </div>
            </>}
          </article>
          <article id="ajuda" className="rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="font-semibold">Como a análise funciona</h2>
            <ol className="mt-5 space-y-5 text-sm">
              {[["01", "Defina o contexto", "Empresa, serviços, região e concorrentes."], ["02", "Escolha as perguntas", "Perguntas reais de potenciais clientes."], ["03", "Compare evidências", "Menções, fontes e respostas por provedor." ]].map(([number, title, detail]) => (
                <li key={number} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-xs font-semibold text-[var(--green)]">{number}</span><div><p className="font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p></div></li>
              ))}
            </ol>
            <p id="configuracao" className="mt-6 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">Dados reais aparecerão depois que o Supabase local e o provedor de IA estiverem configurados.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
