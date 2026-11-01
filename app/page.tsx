'use client';
import { useEffect, useMemo, useState } from 'react';

type Ex = { id: string; name: string; sets: number; reps: string };
type Day = { id: string; name: string; ex: Ex[] };
type St = { id: string; w: string; r: string };
type LEx = { id: string; name: string; t: string; sets: St[] };
type Log = { id: string; date: string; name: string; ex: LEx[] };
type Store = { plan: Day[]; logs: Log[] };
type Agg = { vol: number; ex: number; sets: number };

const DN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const p2 = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parseD = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const wd = (s: string) => (parseD(s).getDay() + 6) % 7;
const SEED: [string, [string, number, string][]][] = [["Push", [["Incline Smith Press", 2, "8-10"], ["Pec-Dec Flys", 2, "10-12"], ["DB Incline Lateral Raises", 3, "12-15"], ["Shoulder Press", 2, "8-10"], ["Single Tricep Pushdown", 2, "12-15"], ["Single Overhead Extensions", 2, "12-15"]]], ["Pull", [["Lats Machine Pulldowns", 2, "10-12"], ["Single Machine Rows", 2, "10-12"], ["T-Bar Rows", 2, "8-10"], ["Reverse Pec-Dec Flys", 2, "12-15"], ["DB Incline Curls", 3, "10-12"], ["Hammer Curls", 3, "10-12"]]], ["Arms/Shoulder/Chest", [["Supinations", 2, "12-15"], ["Recline Curls", 2, "8-10"], ["Single Tricep Pushdown", 2, "12-15"], ["Hammer Curls", 2, "10-12"], ["Single Overhead Extensions", 2, "12-15"], ["DB Incline Lateral Raises", 3, "12-15"], ["Shoulder Press", 2, "8-10"], ["Flat Smith Press", 2, "8-10"], ["Incline Machine Press", 2, "8-10"]]], ["Lower", [["Smith Squats", 2, "10-12"], ["Pendulum Press", 2, "8-10"], ["SLDL", 2, "10-12"], ["Single Leg Extensions", 2, "10-12"], ["Hip Thrust", 2, "8-10"], ["Single Hamstring Curls", 2, "10-12"], ["Calf Raises", 2, "15"], ["Tibialis Anterior Curls", 2, "15"]]], ["Upper", [["Incline Smith Press", 2, "8-10"], ["Pec-Dec Flys", 2, "10-12"], ["Lats Pulldown", 2, "10-12"], ["T-bar Rows Type-2", 2, "8-10"], ["Single Cable Rows", 2, "10-12"], ["Kelso Shrugs", 2, "10-12"], ["Archer Pulls", 2, "12-15"], ["Recline Curls", 2, "8-10"], ["Single Tricep Pushdown", 2, "12-15"]]], ["Hyrox", []]];
const blank = (): Day[] => DN.map((_, i) => ({ id: `plan-${i}`, name: SEED[i] ? SEED[i][0] : '', ex: (SEED[i] ? SEED[i][1] : []).map(([name, sets, reps], j) => ({ id: `ex-${i}-${j}`, name, sets, reps })) }));
const nf = (n: number) => Math.round(n).toLocaleString('en');
const fl = (x: St) => x.w.trim() !== '' || x.r.trim() !== '';

const agg = (ls: Log[]): Agg => {
  let vol = 0, ex = 0, sets = 0;
  ls.forEach(l => l.ex.forEach(e => {
    const f = e.sets.filter(fl);
    if (f.length) ex++;
    sets += f.length;
    f.forEach(x => { vol += (+x.w || 0) * (+x.r || 0); });
  }));
  return { vol, ex, sets };
};

const prs = (ls: Log[], skip?: string) => {
  const m: Record<string, { n: string; w: number; d: string }> = {};
  ls.forEach(l => { if (l.id !== skip) l.ex.forEach(e => e.sets.forEach(x => {
    const w = +x.w || 0, k = e.name.trim().toLowerCase();
    if (k && w > 0 && (!m[k] || w > m[k].w)) m[k] = { n: e.name.trim(), w, d: l.date };
  })); });
  return m;
};

const H = ['type', 'workout_id', 'day_or_date', 'workout_name', 'exercise_id', 'exercise_name', 'set_id', 'set_no', 'weight', 'reps', 'target_sets', 'target_reps'];
const esc = (s: string | number) => { const t = String(s); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };

function toCsv(s: Store) {
  const R: (string | number)[][] = [H];
  s.plan.forEach((d, i) => {
    if (!d.ex.length) R.push(['plan', d.id, DN[i], d.name, '', '', '', '', '', '', '', '']);
    d.ex.forEach(e => R.push(['plan', d.id, DN[i], d.name, e.id, e.name, '', '', '', '', e.sets, e.reps]));
  });
  s.logs.forEach(l => {
    if (!l.ex.length) R.push(['log', l.id, l.date, l.name, '', '', '', '', '', '', '', '']);
    l.ex.forEach(e => {
      if (!e.sets.length) R.push(['log', l.id, l.date, l.name, e.id, e.name, '', '', '', '', '', e.t]);
      e.sets.forEach((x, i) => R.push(['log', l.id, l.date, l.name, e.id, e.name, x.id, i + 1, x.w, x.r, '', e.t]));
    });
  });
  return R.map(r => r.map(esc).join(',')).join('\n');
}

function parse(t: string) {
  const rows: string[][] = [];
  let r: string[] = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  return rows.filter(x => x.some(y => y.trim()));
}

function fromCsv(t: string, s: Store): Store {
  const rows = parse(t.replace(/^\uFEFF/, ''));
  const h = (rows.shift() || []).map(x => x.trim().toLowerCase());
  const ix = (k: string) => h.indexOf(k);
  if (ix('type') < 0 || ix('workout_id') < 0) throw new Error('Unknown CSV structure');
  const g = (r: string[], k: string) => (r[ix(k)] || '').trim();
  const plan = s.plan.map(d => ({ ...d }));
  const logs = new Map(s.logs.map(l => [l.id, l] as [string, Log]));
  const seen = new Map<string, Log>(), pd = new Map<string, Day>();
  rows.forEach(r => {
    const ty = g(r, 'type'), wid = g(r, 'workout_id');
    if (!wid) return;
    if (ty === 'plan') {
      const i = DN.indexOf(g(r, 'day_or_date'));
      if (i < 0) return;
      let d = pd.get(wid);
      if (!d) { d = { id: wid, name: g(r, 'workout_name'), ex: [] }; pd.set(wid, d); plan[i] = d; }
      const eid = g(r, 'exercise_id');
      if (eid) d.ex.push({ id: eid, name: g(r, 'exercise_name'), sets: +g(r, 'target_sets') || 0, reps: g(r, 'target_reps') });
    } else if (ty === 'log') {
      let l = seen.get(wid);
      if (!l) {
        const date = g(r, 'day_or_date');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        l = { id: wid, date, name: g(r, 'workout_name'), ex: [] };
        seen.set(wid, l);
      }
      const eid = g(r, 'exercise_id');
      if (!eid) return;
      let e = l.ex.find(x => x.id === eid);
      if (!e) { e = { id: eid, name: g(r, 'exercise_name'), t: g(r, 'target_reps'), sets: [] }; l.ex.push(e); }
      const sid = g(r, 'set_id');
      if (sid) e.sets.push({ id: sid, w: g(r, 'weight'), r: g(r, 'reps') });
    }
  });
  seen.forEach((l, k) => logs.set(k, l));
  return { plan, logs: Array.from(logs.values()) };
}

const Stat = ({ t, a }: { t: string; a: Agg }) => (
  <div className="box">
    <h3>{t}</h3>
    <div className="g3">
      <div><b>{nf(a.vol)}</b><span>Volume</span></div>
      <div><b>{a.ex}</b><span>Exercises</span></div>
      <div><b>{a.sets}</b><span>Sets</span></div>
    </div>
  </div>
);

function Editor({ log, all, isNew, onSave, onDel }: { log: Log; all: Log[]; isNew: boolean; onSave: (l: Log) => void; onDel: (id: string) => void }) {
  const [d, setD] = useState<Log>(log);
  const [editing, setEditing] = useState(isNew);
  const pr = useMemo(() => prs(all, log.id), [all, log.id]);
  const exUp = (id: string, f: (e: LEx) => LEx) => setD(x => ({ ...x, ex: x.ex.map(e => (e.id === id ? f(e) : e)) }));
  const dirty = JSON.stringify(d) !== JSON.stringify(log);
  const saved = all.some(x => x.id === log.id);
  const a = agg([editing ? d : log]);
  const total = <p className="mut">Volume {nf(a.vol)} | Exercises {a.ex} | Sets {a.sets}</p>;

  if (!editing) {
    return (
      <section className="box">
        <h3>{log.name || 'Workout'}</h3>
        {log.ex.map(e => {
          const b = pr[e.name.trim().toLowerCase()];
          return (
            <div className="ex" key={e.id}>
              <b>{e.name || 'Exercise'}</b>
              <p className="mut">{[e.t && `Target ${e.t}`, b && `Best ${b.w}`].filter(Boolean).join(' | ')}</p>
              {e.sets.map((x, i) => (
                <div className="pl" key={x.id}>
                  <span>Set {i + 1}</span>
                  <b>{x.w || '-'} x {x.r || '-'}{b && (+x.w || 0) > b.w ? ' PR' : ''}</b>
                </div>
              ))}
            </div>
          );
        })}
        {!log.ex.length && <p className="mut">No exercises logged.</p>}
        {total}
        <div className="row">
          <button className="btn k f" onClick={() => { setD(log); setEditing(true); }}>Edit</button>
          <button className="btn" onClick={() => { if (window.confirm('Delete this whole workout?')) onDel(log.id); }}>Delete</button>
        </div>
      </section>
    );
  }

  return (
    <section className="box">
      <input className="in big" value={d.name} placeholder="Workout name" onChange={e => setD(x => ({ ...x, name: e.target.value }))} />
      {d.ex.map(e => {
        const b = pr[e.name.trim().toLowerCase()];
        return (
          <div className="ex" key={e.id}>
            <div className="row">
              <input className="in" value={e.name} placeholder="Exercise" onChange={v => exUp(e.id, y => ({ ...y, name: v.target.value }))} />
              <button className="btn sm" onClick={() => { if (window.confirm(`Delete "${e.name || 'this exercise'}" and all its sets?`)) setD(x => ({ ...x, ex: x.ex.filter(y => y.id !== e.id) })); }}>Del</button>
            </div>
            <p className="mut">{[e.t && `Target ${e.t}`, b && `Best ${b.w}`].filter(Boolean).join(' | ')}</p>
            {e.sets.map((x, i) => {
              const isPr = !!b && (+x.w || 0) > b.w;
              const su = (q: Partial<St>) => exUp(e.id, y => ({ ...y, sets: y.sets.map(z => (z.id === x.id ? { ...z, ...q } : z)) }));
              return (
                <div className="row set" key={x.id}>
                  <span className="n">{i + 1}</span>
                  <input className="in" inputMode="decimal" placeholder="Weight" value={x.w} onChange={v => su({ w: v.target.value })} />
                  <input className="in" inputMode="numeric" placeholder="Reps" value={x.r} onChange={v => su({ r: v.target.value })} />
                  {isPr && <b className="pr">PR</b>}
                  <button className="btn sm" onClick={() => { if (window.confirm(`Delete set ${i + 1}?`)) exUp(e.id, y => ({ ...y, sets: y.sets.filter(z => z.id !== x.id) })); }}>Del</button>
                </div>
              );
            })}
            <button className="btn f" style={{ width: '100%' }} onClick={() => exUp(e.id, y => ({ ...y, sets: [...y.sets, { id: uid(), w: y.sets.length ? y.sets[y.sets.length - 1].w : '', r: '' }] }))}>Add set</button>
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn f" onClick={() => setD(x => ({ ...x, ex: [...x.ex, { id: uid(), name: '', t: '', sets: [{ id: uid(), w: '', r: '' }] }] }))}>Add exercise</button>
      </div>
      {total}
      <div className="row">
        <button className="btn k f" onClick={() => { onSave(d); setEditing(false); }}>Save</button>
        <button className="btn f" onClick={() => {
          if (dirty && !window.confirm('Discard unsaved changes?')) return;
          if (!saved) { onDel(log.id); return; }
          setD(log); setEditing(false);
        }}>Cancel</button>
      </div>
    </section>
  );
}

function DayScreen({ date, s, back, save, del }: { date: string; s: Store; back: () => void; save: (l: Log) => void; del: (id: string) => void }) {
  const day = s.logs.filter(l => l.date === date);
  const [extra, setExtra] = useState<Log[]>([]);
  const list = [...day, ...extra.filter(e => !day.some(x => x.id === e.id))];
  const pd = s.plan[wd(date)];
  const fromPlan = (): Log => ({
    id: uid(), date, name: pd.name,
    ex: pd.ex.map(e => ({ id: uid(), name: e.name, t: `${e.sets} x ${e.reps}`, sets: Array.from({ length: e.sets }, () => ({ id: uid(), w: '', r: '' })) })),
  });
  return (
    <>
      <div className="row">
        <button className="btn" onClick={back}>Back</button>
        <h2>{parseD(date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</h2>
      </div>
      {day.length > 0 && <Stat t="Day total" a={agg(day)} />}
      {list.map(l => (
        <Editor key={l.id} log={l} all={s.logs} isNew={!day.some(x => x.id === l.id)} onSave={save} onDel={id => { del(id); setExtra(x => x.filter(y => y.id !== id)); }} />
      ))}
      <div className="row">
        <button className="btn k f" onClick={() => setExtra(x => [...x, fromPlan()])}>{pd.name ? `Add ${pd.name} from plan` : 'Add from plan'}</button>
        <button className="btn f" onClick={() => setExtra(x => [...x, { id: uid(), date, name: '', ex: [] }])}>Add blank</button>
      </div>
    </>
  );
}

function PlanDay({ day, label, onSave }: { day: Day; label: string; onSave: (d: Day) => void }) {
  const [d, setD] = useState<Day>(day);
  const [editing, setEditing] = useState(false);
  const dirty = JSON.stringify(d) !== JSON.stringify(day);
  const eu = (id: string, q: Partial<Ex>) => setD(x => ({ ...x, ex: x.ex.map(y => (y.id === id ? { ...y, ...q } : y)) }));

  if (!editing) {
    return (
      <section className="box">
        <h3>{label}</h3>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{day.name || 'No workout set'}</p>
        {day.ex.map(e => (
          <div className="pl" key={e.id}><span>{e.name}</span><b>{e.sets} x {e.reps}</b></div>
        ))}
        {!day.ex.length && <p className="mut">No exercises.</p>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn k f" onClick={() => { setD(day); setEditing(true); }}>Edit</button>
        </div>
      </section>
    );
  }

  return (
    <section className="box">
      <h3>{label}</h3>
      <input className="in big" value={d.name} placeholder="Workout name (Pull, Push, Rest)" onChange={e => setD(x => ({ ...x, name: e.target.value }))} />
      {d.ex.map(e => (
        <div className="row" key={e.id}>
          <input className="in" value={e.name} placeholder="Exercise" onChange={v => eu(e.id, { name: v.target.value })} />
          <input className="in s" inputMode="numeric" value={e.sets || ''} placeholder="Sets" onChange={v => eu(e.id, { sets: +v.target.value.replace(/\D/g, '') || 0 })} />
          <input className="in s" value={e.reps} placeholder="Reps" onChange={v => eu(e.id, { reps: v.target.value })} />
          <button className="btn sm" onClick={() => { if (window.confirm(`Delete "${e.name || 'this exercise'}" from ${label}?`)) setD(x => ({ ...x, ex: x.ex.filter(y => y.id !== e.id) })); }}>Del</button>
        </div>
      ))}
      <div className="row">
        <button className="btn f" onClick={() => setD(x => ({ ...x, ex: [...x.ex, { id: uid(), name: '', sets: 3, reps: '8-12' }] }))}>Add exercise</button>
      </div>
      <div className="row">
        <button className="btn k f" onClick={() => { onSave(d); setEditing(false); }}>Save</button>
        <button className="btn f" onClick={() => { if (dirty && !window.confirm('Discard unsaved changes?')) return; setD(day); setEditing(false); }}>Cancel</button>
      </div>
    </section>
  );
}

export default function Page() {
  const [s, setS] = useState<Store>({ plan: blank(), logs: [] });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'plan' | 'cal' | 'stats' | 'data'>('cal');
  const [sel, setSel] = useState<string | null>(null);
  const [mo, setMo] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try {
      const v = localStorage.getItem('wk1');
      if (v) { const p = JSON.parse(v); if (Array.isArray(p.plan) && p.plan.length === 7 && Array.isArray(p.logs)) setS(p); }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem('wk1', JSON.stringify(s)); } catch {} }, [s, ready]);

  if (!ready) return <main className="app" />;

  const save = (l: Log) => setS(p => ({ ...p, logs: p.logs.some(x => x.id === l.id) ? p.logs.map(x => (x.id === l.id ? l : x)) : [...p.logs, l] }));
  const del = (id: string) => setS(p => ({ ...p, logs: p.logs.filter(x => x.id !== id) }));
  const setDay = (i: number, f: (d: Day) => Day) => setS(p => ({ ...p, plan: p.plan.map((d, j) => (j === i ? f(d) : d)) }));

  const today = fmt(new Date());
  const td = parseD(today), ws = new Date(td);
  ws.setDate(td.getDate() - wd(today));
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const a1 = fmt(ws), a2 = fmt(we), mk = `${mo.y}-${p2(mo.m + 1)}`;
  const lead = (new Date(mo.y, mo.m, 1).getDay() + 6) % 7;
  const dim = new Date(mo.y, mo.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const moveMo = (n: number) => setMo(x => { const d = new Date(x.y, x.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(s)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `workout-data-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const upload = async (f?: File) => {
    if (!f) return;
    if (!window.confirm('Import will overwrite matching plan days and workouts with the file contents. Continue?')) return;
    try { setS(fromCsv(await f.text(), s)); setMsg('Import complete'); } catch (e) { setMsg('Import failed: ' + (e as Error).message); }
  };

  const titles = { cal: 'Calendar', plan: 'Plan', stats: 'Stats', data: 'Data' };
  return (
    <main className="app">
      <h1>{titles[tab]}</h1>

      {tab === 'cal' && (sel ? (
        <DayScreen key={sel} date={sel} s={s} back={() => setSel(null)} save={save} del={del} />
      ) : (
        <>
          <div className="row">
            <button className="btn" onClick={() => moveMo(-1)}>Prev</button>
            <h2 style={{ textAlign: 'center' }}>{new Date(mo.y, mo.m, 1).toLocaleString('en', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn" onClick={() => moveMo(1)}>Next</button>
          </div>
          <div className="cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div className="h" key={i}>{x}</div>)}
            {cells.map((n, i) => {
              if (n === null) return <i key={i} />;
              const ds = `${mk}-${p2(n)}`;
              const has = s.logs.some(l => l.date === ds);
              return <button key={i} className={(has ? 'l ' : '') + (ds === today ? 't' : '')} onClick={() => setSel(ds)}>{n}</button>;
            })}
          </div>
          <Stat t="This month" a={agg(s.logs.filter(l => l.date.startsWith(mk)))} />
        </>
      ))}

      {tab === 'plan' && s.plan.map((d, i) => <PlanDay key={d.id} day={d} label={DN[i]} onSave={nd => setDay(i, () => nd)} />)}

      {tab === 'stats' && (
        <>
          <Stat t="Today" a={agg(s.logs.filter(l => l.date === today))} />
          <Stat t="This week" a={agg(s.logs.filter(l => l.date >= a1 && l.date <= a2))} />
          <Stat t="This month" a={agg(s.logs.filter(l => l.date.startsWith(today.slice(0, 7))))} />
          <section className="box">
            <h3>Best records</h3>
            {Object.values(prs(s.logs)).sort((x, y) => x.n.localeCompare(y.n)).map(p => (
              <div className="pl" key={p.n}><span>{p.n}</span><b>{p.w} on {p.d}</b></div>
            ))}
            {!Object.keys(prs(s.logs)).length && <p className="mut">No weights logged yet.</p>}
          </section>
        </>
      )}

      {tab === 'data' && (
        <section className="box">
          <h3>CSV backup</h3>
          <p className="mut">One file holds the plan and every logged workout. Rows are matched by unique IDs on import, so nothing is duplicated.</p>
          <div className="row"><button className="btn k f" onClick={download}>Export CSV</button></div>
          <label className="btn f" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Import CSV
            <input type="file" accept=".csv,text/csv" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {msg && <p className="mut" style={{ marginTop: 10 }}>{msg}</p>}
        </section>
      )}

      <nav>
        {(['cal', 'plan', 'stats', 'data'] as const).map(t => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setSel(null); setMsg(''); }}>{titles[t]}</button>
        ))}
      </nav>
    </main>
  );
}
