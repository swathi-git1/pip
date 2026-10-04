import { useState, useMemo } from "react";
import "./App.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let nextId = 100;

/* ---------- Scheduling engine (plain JS) ---------- */
function generate(subjects, nDays, nPer) {
  const grid = Array.from({ length: nDays }, () => []);
  const unplaced = new Set();

  // Max periods of one subject per day
  const cap = (s) => (s.periods > nDays * 2 ? 3 : 2);

  // 1. Place subjects with the most periods first
  [...subjects]
    .sort((a, b) => b.periods - a.periods || Math.random() - 0.5)
    .forEach((s) => {
      for (let k = 0; k < s.periods; k++) {
        const options = grid
          .map((day, i) => ({
            i,
            load: day.length,
            same: day.filter((x) => x.id === s.id).length,
          }))
          .filter((o) => o.load < nPer && o.same < cap(s))
          .sort((a, b) => a.same - b.same || a.load - b.load || Math.random() - 0.5);

        if (options.length) grid[options[0].i].push(s);
        else unplaced.add(s.name);
      }
    });

  // 2. Order each day: heavy subjects first, then fix back-to-back repeats
  grid.forEach((day) => {
    day.sort((a, b) => Number(b.heavy) - Number(a.heavy) || Math.random() - 0.5);
    for (let i = 1; i < day.length; i++) {
      if (day[i].id !== day[i - 1].id) continue;
      for (let j = i + 1; j < day.length; j++) {
        const clash = day[j].id === day[i].id || day[j + 1]?.id === day[i].id;
        if (!clash) {
          [day[i], day[j]] = [day[j], day[i]];
          break;
        }
      }
    }
    while (day.length < nPer) day.push(null); // free periods
  });

  return { grid, unplaced: [...unplaced] };
}

const colorOf = (id, list) => (list.findIndex((s) => s.id === id) * 47 + 220) % 360;

/* ---------- Components ---------- */
function SubjectRow({ subject, onChange, onRemove }) {
  return (
    <div className="row">
      <input
        className="grow"
        value={subject.name}
        onChange={(e) => onChange({ name: e.target.value })}
        aria-label="Subject name"
      />
      <input
        type="number"
        min="1"
        max="12"
        value={subject.periods}
        onChange={(e) => onChange({ periods: Math.max(1, Number(e.target.value) || 1) })}
        aria-label="Periods per week"
      />
      <label>
        <input
          type="checkbox"
          checked={subject.heavy}
          onChange={(e) => onChange({ heavy: e.target.checked })}
        />
        Heavy
      </label>
      <button className="danger" onClick={onRemove} aria-label={`Remove ${subject.name}`}>
        ✕
      </button>
    </div>
  );
}

function Timetable({ grid, subjects, lunchAfter, nPer }) {
  const showLunch = (p) => lunchAfter === p + 1 && p + 1 < nPer;
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th />
            {Array.from({ length: nPer }, (_, p) => (
              <FragmentCell key={p} extra={showLunch(p)}>
                <th>P{p + 1}</th>
              </FragmentCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((day, d) => (
            <tr key={d}>
              <th>{DAYS[d]}</th>
              {day.map((s, p) => (
                <FragmentCell key={p} extra={showLunch(p)} lunch>
                  <td
                    className={s ? "slot" : "slot free"}
                    style={s ? { "--h": colorOf(s.id, subjects) } : undefined}
                  >
                    {s ? s.name : "Free"}
                  </td>
                </FragmentCell>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Renders a cell plus an optional lunch-break cell after it
function FragmentCell({ children, extra, lunch }) {
  return (
    <>
      {children}
      {extra && (lunch ? <td className="brk">🍴</td> : <th />)}
    </>
  );
}

export default function App() {
  const [subjects, setSubjects] = useState([
    { id: 1, name: "Maths", periods: 5, heavy: true },
    { id: 2, name: "Physics", periods: 4, heavy: true },
    { id: 3, name: "Chemistry", periods: 4, heavy: true },
    { id: 4, name: "English", periods: 4, heavy: false },
    { id: 5, name: "Computer Sci", periods: 4, heavy: false },
    { id: 6, name: "History", periods: 3, heavy: false },
    { id: 7, name: "Biology", periods: 3, heavy: false },
    { id: 8, name: "PE", periods: 2, heavy: false },
  ]);
  const [nDays, setNDays] = useState(5);
  const [nPer, setNPer] = useState(7);
  const [lunchAfter, setLunchAfter] = useState(4);
  const [seed, setSeed] = useState(0); // bump to regenerate

  const total = subjects.reduce((sum, s) => sum + s.periods, 0);
  const slots = nDays * nPer;

  const { grid, unplaced } = useMemo(
    () => generate(subjects, nDays, nPer),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects, nDays, nPer, seed]
  );

  const update = (id, patch) =>
    setSubjects((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id) => setSubjects((list) => list.filter((s) => s.id !== id));
  const add = () =>
    setSubjects((list) => [...list, { id: ++nextId, name: "New subject", periods: 3, heavy: false }]);

  return (
    <div className="wrap">
      <h1>Smart Timetable Generator</h1>
      <p className="sub">
        Add subjects and weekly periods. Heavy subjects go in the morning and subjects are spread
        across the week.
      </p>

      <section className="card noprint">
        <h2>Settings</h2>
        <div className="row">
          <label>
            Days
            <select value={nDays} onChange={(e) => setNDays(Number(e.target.value))}>
              <option value={5}>5 (Mon–Fri)</option>
              <option value={6}>6 (Mon–Sat)</option>
            </select>
          </label>
          <label>
            Periods per day
            <input
              type="number"
              min="3"
              max="10"
              value={nPer}
              onChange={(e) => setNPer(Math.min(10, Math.max(3, Number(e.target.value) || 3)))}
            />
          </label>
          <label>
            Lunch after period
            <input
              type="number"
              min="0"
              max={nPer}
              value={lunchAfter}
              onChange={(e) => setLunchAfter(Math.min(nPer, Math.max(0, Number(e.target.value) || 0)))}
            />
          </label>
        </div>

        <h2>Subjects</h2>
        {subjects.map((s) => (
          <SubjectRow
            key={s.id}
            subject={s}
            onChange={(patch) => update(s.id, patch)}
            onRemove={() => remove(s.id)}
          />
        ))}
        <div className="row">
          <button onClick={add}>Add subject</button>
          <button className="primary" onClick={() => setSeed((n) => n + 1)}>
            Generate new timetable
          </button>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </section>

      {total > slots && (
        <div className="warn">
          {total} periods requested but only {slots} slots exist. Reduce periods or add days.
        </div>
      )}
      {unplaced.length > 0 && <div className="warn">Could not fit: {unplaced.join(", ")}.</div>}

      <section className="card">
        <h2>Weekly timetable</h2>
        <Timetable grid={grid} subjects={subjects} lunchAfter={lunchAfter} nPer={nPer} />
        <div className="stats">
          <span className="chip">Slots used: {Math.min(total, slots)}/{slots}</span>
          <span className="chip">Free periods: {grid.flat().filter((x) => !x).length}</span>
        </div>
      </section>
    </div>
  );
}
