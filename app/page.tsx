"use client";

import { useState } from "react";

type Section = "Přehled" | "Zakázky" | "Asistent" | "Fakturace";

type Job = {
  id: string;
  machine: string;
  customer: string;
  status: "Rozpracováno" | "Čeká na díl" | "Připraveno k fakturaci";
  mechanic: string;
  symptom: string;
  hours: string;
  updated: string;
  tone: "blue" | "amber" | "green";
};

const jobs: Job[] = [
  {
    id: "ZS-2026-184",
    machine: "New Holland T6.180",
    customer: "ZD Haňovice",
    status: "Rozpracováno",
    mechanic: "Petr Prečan",
    symptom: "Kolísání otáček po zahřátí motoru",
    hours: "2,5 h",
    updated: "před 18 min",
    tone: "blue",
  },
  {
    id: "ZS-2026-181",
    machine: "Valtra T235",
    customer: "Agro Hnojice",
    status: "Čeká na díl",
    mechanic: "Radek Kořínek",
    symptom: "Únik oleje z hydrauliky",
    hours: "1,0 h",
    updated: "dnes 09:12",
    tone: "amber",
  },
  {
    id: "ZS-2026-176",
    machine: "Case IH JX1080",
    customer: "ZD Haňovice",
    status: "Připraveno k fakturaci",
    mechanic: "Radek Kořínek",
    symptom: "Oprava levé poloosy a řízení",
    hours: "13,0 h",
    updated: "včera 16:44",
    tone: "green",
  },
];

const navItems: { label: Section; icon: string }[] = [
  { label: "Přehled", icon: "⌂" },
  { label: "Zakázky", icon: "▣" },
  { label: "Asistent", icon: "✦" },
  { label: "Fakturace", icon: "₭" },
];

function Status({ status, tone }: Pick<Job, "status" | "tone">) {
  return <span className={`status status-${tone}`}>{status}</span>;
}

export default function Home() {
  const [section, setSection] = useState<Section>("Přehled");
  const [selectedJob, setSelectedJob] = useState<Job>(jobs[0]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [toast, setToast] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("Kolísání otáček po zahřátí motoru");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const selectJob = (job: Job) => {
    setSelectedJob(job);
    setSection("Zakázky");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Hlavní nabídka">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">B</div>
          <div>
            <strong>Barnet servis</strong>
            <span>Interní pilot</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${section === item.label ? "active" : ""}`}
              onClick={() => setSection(item.label)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="signal-dot" />
          Vše uloženo v cloudu
          <small>Poslední synchronizace právě teď</small>
        </div>

        <div className="profile-card">
          <div className="avatar">PP</div>
          <div><strong>Petr Prečan</strong><span>Servisní technik II</span></div>
          <button aria-label="Nastavení profilu">•••</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Úterý, 28. července</p>
            <h1>{section === "Přehled" ? "Dobré ráno, Petře." : section}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Oznámení">⌁<span className="notification" /></button>
            <button className="primary-button" onClick={() => setShowNewJob(true)}><span>＋</span> Nová zakázka</button>
          </div>
        </header>

        {section === "Přehled" && <Overview onSelectJob={selectJob} onNavigate={setSection} />}
        {section === "Zakázky" && <Jobs selectedJob={selectedJob} onSelectJob={setSelectedJob} onNotify={notify} />}
        {section === "Asistent" && <Assistant question={assistantQuestion} onQuestion={setAssistantQuestion} onUse={notify} />}
        {section === "Fakturace" && <Billing onOpen={selectJob} onNotify={notify} />}
      </section>

      <nav className="mobile-nav" aria-label="Mobilní nabídka">
        {navItems.map((item) => (
          <button key={item.label} className={section === item.label ? "active" : ""} onClick={() => setSection(item.label)}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} onSave={() => { setShowNewJob(false); notify("Zakázka je uložená jako rozpracovaná."); }} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Overview({ onSelectJob, onNavigate }: { onSelectJob: (job: Job) => void; onNavigate: (section: Section) => void }) {
  return <div className="page-grid overview-grid">
    <div className="hero-panel">
      <div className="hero-copy">
        <p className="hero-label">Dnešní servis</p>
        <h2>8 zásahů v pohybu.<br /><em>Všichni ví, co dál.</em></h2>
        <p>Každá dokončená oprava zůstává dostupná pro celý tým — včetně postupu, dílů i fotek.</p>
        <button className="text-link" onClick={() => onNavigate("Asistent")}>Otevřít servisního asistenta <span>→</span></button>
      </div>
      <div className="tractor-art" aria-hidden="true">
        <div className="sun" />
        <div className="tractor-cab" /><div className="tractor-hood" /><div className="tractor-wheel wheel-back" /><div className="tractor-wheel wheel-front" /><div className="tractor-line" />
      </div>
    </div>

    <div className="stats-row">
      <article className="stat-card"><div className="stat-icon dark">↗</div><p>Aktivní zakázky</p><strong>6</strong><span>+2 od včerejška</span></article>
      <article className="stat-card"><div className="stat-icon gold">✓</div><p>Hotovo dnes</p><strong>3</strong><span>12,5 hodin práce</span></article>
      <article className="stat-card"><div className="stat-icon pale">⌁</div><p>Čeká na díl</p><strong>2</strong><span>kontrola za 4 dny</span></article>
    </div>

    <section className="panel jobs-panel">
      <div className="panel-heading"><div><p className="eyebrow">Aktuální práce</p><h2>Zakázky na dnešek</h2></div><button className="quiet-button" onClick={() => onNavigate("Zakázky")}>Všechny zakázky <span>→</span></button></div>
      <div className="job-list">
        {jobs.map((job) => <button key={job.id} className="job-row" onClick={() => onSelectJob(job)}>
          <div className={`machine-badge ${job.tone}`}>{job.machine.slice(0, 2).toUpperCase()}</div>
          <div className="job-main"><strong>{job.machine}</strong><span>{job.customer} · {job.symptom}</span></div>
          <Status status={job.status} tone={job.tone} />
          <span className="row-arrow">→</span>
        </button>)}
      </div>
    </section>

    <section className="panel ai-preview">
      <div className="ai-stamp">✦</div>
      <div><p className="eyebrow">Servisní asistent</p><h2>Podobná oprava už v týmu byla</h2><p>U závady hydrauliky na Valtra T235 se ve 3 předchozích případech potvrdilo těsnění rozdělovače.</p></div>
      <button className="secondary-button" onClick={() => onNavigate("Asistent")}>Zobrazit postup</button>
    </section>
  </div>;
}

function Jobs({ selectedJob, onSelectJob, onNotify }: { selectedJob: Job; onSelectJob: (job: Job) => void; onNotify: (message: string) => void }) {
  return <div className="jobs-layout">
    <section className="panel job-catalog">
      <div className="panel-heading"><div><p className="eyebrow">Zakázková kniha</p><h2>Otevřené případy</h2></div><button className="filter-button">⌄ Filtr</button></div>
      <div className="search"><span>⌕</span><input aria-label="Hledat zakázku" placeholder="Hledat stroj, zákazníka nebo VIN" /></div>
      <div className="catalog-list">
        {jobs.map((job) => <button key={job.id} className={`catalog-card ${selectedJob.id === job.id ? "selected" : ""}`} onClick={() => onSelectJob(job)}>
          <div className={`machine-badge ${job.tone}`}>{job.machine.slice(0, 2).toUpperCase()}</div>
          <div><span className="job-id">{job.id}</span><strong>{job.machine}</strong><small>{job.customer}</small></div><Status status={job.status} tone={job.tone} />
        </button>)}
      </div>
    </section>
    <JobDetail job={selectedJob} onNotify={onNotify} />
  </div>;
}

function JobDetail({ job, onNotify }: { job: Job; onNotify: (message: string) => void }) {
  const [tab, setTab] = useState<"Výkaz práce" | "Diagnostika" | "Díly">("Výkaz práce");
  return <section className="panel job-detail">
    <div className="detail-top"><div><div className="back-label">{job.id} <span>·</span> aktualizováno {job.updated}</div><h2>{job.machine}</h2><p>{job.customer} <span>·</span> VIN: HJTO23842</p></div><Status status={job.status} tone={job.tone} /></div>
    <div className="tabs">{(["Výkaz práce", "Diagnostika", "Díly"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Výkaz práce" && <>
      <div className="detail-section"><div className="section-title"><h3>Provedená práce</h3><button onClick={() => onNotify("Můžeš přidat další řádek práce.")}>＋ Přidat řádek</button></div>
        <div className="work-table"><div className="table-head"><span>Datum</span><span>Popis práce</span><span>Mechanik</span><span>Hodiny</span></div>
          <div className="table-row"><span>22. 7. 2026</span><strong>Demontáž kola, řízení a levé poloosy</strong><span>Kořínek, Prečan</span><b>5,0 h</b></div>
          <div className="table-row"><span>23. 7. 2026</span><strong>Montáž poloosy, reduktoru a řízení</strong><span>Kořínek, Prečan</span><b>8,0 h</b></div>
        </div>
      </div>
      <div className="detail-section travel"><div><p>Servisní vůz</p><strong>VIV 4100</strong></div><div><p>Celková vzdálenost</p><strong>240 km</strong></div><div><p>Čas na cestě</p><strong>—</strong></div></div>
      <div className="completion-box"><div className="completion-number">03</div><div><p className="eyebrow">Před uzavřením</p><h3>Doplň technické řešení</h3><span>Pomůže dalšímu mechanikovi najít správný postup.</span></div><button className="primary-button" onClick={() => onNotify("Otevřel se formulář pro uzavření opravy.")}>Uzavřít opravu</button></div>
    </>}
    {tab === "Diagnostika" && <div className="diagnostics"><p className="eyebrow">Závada a řešení</p><h3>Oprava levé poloosy a řízení</h3><div className="diagnostic-grid"><div><span>Příznaky</span><p>Vůle v levé poloose, poškozené řízení a únik oleje u reduktoru.</p></div><div><span>Potvrzená příčina</span><p>Poškozený kříž a opotřebené těsnění reduktoru.</p></div><div><span>Výsledek</span><p>Po montáži a kontrole bez vůle, řízení funguje správně.</p></div></div></div>}
    {tab === "Díly" && <div className="parts-list"><p className="eyebrow">Spotřebovaný materiál</p><h3>6 položek k vyúčtování</h3>{["5184124N · Těsnění", "5191024 · Kříž", "5191412 · Poloosa", "14460680 · O-kroužek", "Čistič Wurth · 3 ks"].map((part, index) => <div className="part-row" key={part}><span>{String(index + 1).padStart(2, "0")}</span><strong>{part}</strong><b>{index === 4 ? "3 ks" : "1 ks"}</b></div>)}</div>}
  </section>;
}

function Assistant({ question, onQuestion, onUse }: { question: string; onQuestion: (value: string) => void; onUse: (message: string) => void }) {
  return <div className="assistant-layout">
    <section className="assistant-intro"><div className="ai-orb">✦</div><p className="eyebrow">Barnet servisní asistent</p><h2>Najde řešení,<br /><em>ne dohady.</em></h2><p>Vyhledává pouze v servisní dokumentaci a ověřených případech vašeho týmu.</p><div className="trust-line"><span>✓</span> Každý návrh uvádí zdroj</div></section>
    <section className="panel assistant-chat">
      <div className="chat-question"><span>Vyhledat v dokumentaci a opravách</span><textarea value={question} onChange={(event) => onQuestion(event.target.value)} aria-label="Dotaz pro servisního asistenta" /><button className="send-button" onClick={() => onUse("Asistent prohledal 18 ověřených zdrojů.")}>↑</button></div>
      <div className="assistant-answer"><div className="answer-heading"><div className="mini-ai">✦</div><div><strong>Nejpravděpodobnější postup</strong><span>Ověřeno ve 4 podobných případech</span></div><span className="confidence">Vysoká shoda</span></div><p>U modelů New Holland T6 se při kolísání otáček po zahřátí opakovaně potvrdil problém v okruhu snímače otáček klikové hřídele.</p><ol><li>Načti aktivní a uložené chybové kódy.</li><li>Zkontroluj konektor a kabeláž snímače při zahřátém motoru.</li><li>Proměř odpor snímače podle servisního manuálu.</li><li>Po výměně smaž kódy a proveď zkušební start za tepla.</li></ol><div className="sources"><p>ZDROJE</p><button>ZS-2026-096 · New Holland T6.175 <span>↗</span></button><button>Manuál New Holland T6 · Kapitola 10.4 <span>↗</span></button><button>ZS-2025-212 · New Holland T6.160 <span>↗</span></button></div><div className="answer-actions"><button className="secondary-button" onClick={() => onUse("Postup byl přidán do této zakázky.")}>＋ Přidat do zakázky</button><button className="quiet-button" onClick={() => onUse("Děkujeme — zpětná vazba byla zaznamenána.")}>Je to užitečné? <span>👍</span></button></div></div>
    </section>
  </div>;
}

function Billing({ onOpen, onNotify }: { onOpen: (job: Job) => void; onNotify: (message: string) => void }) {
  return <div className="billing-layout"><section className="billing-hero"><p className="eyebrow">Podklady pro POHODU</p><h2>3 výkazy čekají<br />na vyfakturování.</h2><p>Účetní pracuje s hotovým přehledem práce, dílů a cesty. Faktura samotná zůstává v POHODĚ.</p><div className="billing-kpis"><div><strong>41 415 Kč</strong><span>hodnota připravených výkazů</span></div><div><strong>3</strong><span>výkazy ke kontrole</span></div></div></section><section className="panel billing-panel"><div className="panel-heading"><div><p className="eyebrow">Připravené výkazy</p><h2>Fakturace</h2></div><button className="secondary-button" onClick={() => onNotify("Připravuje se export podkladů do Excelu.")}>↓ Export přehledu</button></div><div className="invoice-card"><div className="invoice-main"><span className="invoice-number">ZS-2026-176</span><strong>Case IH JX1080</strong><p>ZD Haňovice · Radek Kořínek, Petr Prečan</p></div><div className="invoice-total"><span>Odhad k fakturaci</span><strong>41 415 Kč</strong><small>včetně DPH</small></div><button className="quiet-button" onClick={() => onOpen(jobs[2])}>Otevřít výkaz →</button></div><div className="billing-table"><div><span>Práce serv. technika II</span><b>9 h</b><strong>11 979 Kč</strong></div><div><span>Práce serv. technika I</span><b>4 h</b><strong>4 792 Kč</strong></div><div><span>Doprava</span><b>240 km</b><strong>6 679 Kč</strong></div><div><span>Náhradní díly a materiál</span><b>6 položek</b><strong>17 966 Kč</strong></div></div></section></div>;
}

function NewJobModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nová zakázka"><section className="modal"><div className="modal-heading"><div><p className="eyebrow">Nový digitální výkaz</p><h2>Založit zakázku</h2></div><button className="close-button" onClick={onClose} aria-label="Zavřít">×</button></div><div className="form-grid"><label>Zákazník<select defaultValue=""><option value="" disabled>Vyber zákazníka</option><option>ZD Haňovice</option><option>Agro Hnojice</option><option>Nový zákazník</option></select></label><label>Stroj<select defaultValue=""><option value="" disabled>Vyber stroj</option><option>New Holland T6.180</option><option>Valtra T235</option><option>Jiný stroj</option></select></label><label className="full">Příznaky závady<textarea placeholder="Např. motor po zahřátí kolísá a špatně startuje…" /></label><label>Mechanik<select defaultValue="Petr Prečan"><option>Petr Prečan</option><option>Radek Kořínek</option></select></label><label>Priorita<select defaultValue="Běžná"><option>Běžná</option><option>Urgentní</option><option>Čeká na termín</option></select></label></div><div className="modal-footer"><span>Uloží se jako rozpracovaná zakázka.</span><button className="primary-button" onClick={onSave}>Založit zakázku →</button></div></section></div>;
}
