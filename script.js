const API_URL = "http://localhost:3000/api";

// ---------- Palīg-funkcijas ----------
const qs  = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

const formatMs = (ms) => {
  const totalSeconds = ms / 1000;
  const minutes      = Math.floor(totalSeconds / 60);
  const seconds      = (totalSeconds % 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
};

const parseTimeToMs = (str) => {
  const parts = str.split(":");
  if (parts.length !== 2) return NaN;
  const min = +parts[0];
  const sec = +parts[1];
  return Math.round((min * 60 + sec) * 1000);
};

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page === "auto")  await initAutoPage();
  if (page === "laps")  await initLapPage();
});

async function initAutoPage() {
  const form  = qs("#car-form");
  const tbody = qs("#auto-table tbody");
  let data    = [];

  async function loadCars() {
    data = await fetch(`${API_URL}/auto`).then((r) => r.json());
    renderTable();
  }

  const AUTO_COLS = [
    "Firma",
    "Modelis",
    "Modela_gads",
    "Piedzina",
    "Svars_kg",
    "Jauda_zs",
  ];

  function renderTable(sortKey = null, dir = 1) {
    let rows = [...data];

    qsa(".filters input").forEach((inp, idx) => {
      const val = inp.value.trim().toLowerCase();
      if (!val) return;
      rows = rows.filter((row) =>
        String(row[AUTO_COLS[idx]] ?? "").toLowerCase().includes(val)
      );
    });

    if (sortKey) {
      rows.sort((a, b) => (a[sortKey] > b[sortKey] ? dir : a[sortKey] < b[sortKey] ? -dir : 0));
    }

    tbody.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${r.Firma}</td>
          <td>${r.Modelis}</td>
          <td>${r.Modela_gads ?? ""}</td>
          <td>${r.Piedzina}</td>
          <td>${r.Svars_kg}</td>
          <td>${r.Jauda_zs}</td>
          <td><button class="del-auto" data-id="${r.ID}" title="Dzēst auto">🗑️</button></td>
        </tr>`
      )
      .join("");

    qsa(".del-auto", tbody).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Vai tiešām dzēst šo auto?")) return;
        const res = await fetch(`${API_URL}/auto/${id}`, { method: "DELETE" });
        if (!res.ok) {
          alert("Neizdevās dzēst auto.");
          return;
        }
        await loadCars();
      });
    });
  }

  qsa("#auto-table thead th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      const dir = th.dataset.dir === "1" ? -1 : 1;
      qsa("#auto-table thead th[data-key]").forEach((h) => (h.dataset.dir = ""));
      th.dataset.dir = dir;
      renderTable(key, dir);
    });
  });

  qsa(".filters input").forEach((inp) => inp.addEventListener("input", () => renderTable()));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      firma:      qs("#firma").value.trim(),
      modelis:    qs("#modelis").value.trim(),
      modelaGads: qs("#modelaGads").value.trim() || null,
      piedzina:   qs("#piedzina").value.trim(),
      svarsKg:    qs("#svarsKg").value.trim(),
      jaudaZs:    qs("#jaudaZs").value.trim(),
    };

    if (!Object.values(payload).every((v) => v || v === null)) {
      alert("Aizpildi visus obligātos laukus!");
      return;
    }

    const res = await fetch(`${API_URL}/auto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Kļūda pievienojot auto.");
      return;
    }

    form.reset();
    await loadCars();
  });

  await loadCars();
}

async function initLapPage() {
  const lapForm   = qs("#lap-form");
  const trackForm = qs("#trase-form");
  const tbody     = qs("#lap-table tbody");
  const autoSel   = qs("#auto-select");
  const traseSel  = qs("#trase-select");
  let lapData     = [];

  async function loadCombos() {
    const [autos, trases] = await Promise.all([
      fetch(`${API_URL}/auto`).then((r) => r.json()),
      fetch(`${API_URL}/trases`).then((r) => r.json()),
    ]);

    autoSel.innerHTML  = '<option value="">Izvēlies auto</option>' +
      autos.map((a) => `<option value="${a.ID}">${a.Firma} ${a.Modelis}</option>`).join("");

    traseSel.innerHTML = '<option value="">Izvēlies trasi</option>' +
      trases.map((t) => `<option value="${t.ID}">${t.Nosaukums}</option>`).join("");
  }

  trackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nosaukumsInput = qs('[name="nosaukums"]', trackForm);
    const nosaukums      = nosaukumsInput.value.trim();

    if (!nosaukums) {
      alert("Ievadi trases nosaukumu!");
      return;
    }

    const res = await fetch(`${API_URL}/trases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nosaukums }),
    });

    if (!res.ok) {
      alert("Kļūda pievienojot trasi.");
      return;
    }

    trackForm.reset();
    await loadCombos();
  });

  async function loadLapTimes() {
    lapData = await fetch(`${API_URL}/laiki`).then((r) => r.json());
    renderLapTable();
  }

  function renderLapTable(sortKey = null, dir = 1) {
    let rows = [...lapData];

    qsa(".filters input").forEach((inp, idx) => {
      const val = inp.value.trim().toLowerCase();
      if (val) {
        rows = rows.filter((row) =>
          `${[
            `${row.Firma} ${row.Modelis}`,
            row.Piedzina,
            row.Trase,
            formatMs(row.Laiks_ms),
            row.Datums,
            row.Brauceja_vards,
          ][idx]}`.toLowerCase().includes(val)
        );
      }
    });

    if (sortKey) {
      rows.sort((a, b) => {
        const av = sortKey === "Auto"
          ? `${a.Firma} ${a.Modelis}`
          : sortKey === "Laiks_ms"
          ? a.Laiks_ms
          : a[sortKey];
        const bv = sortKey === "Auto"
          ? `${b.Firma} ${b.Modelis}`
          : sortKey === "Laiks_ms"
          ? b.Laiks_ms
          : b[sortKey];
        return av > bv ? dir : av < bv ? -dir : 0;
      });
    }

    tbody.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${r.Firma} ${r.Modelis}</td>
          <td>${r.Piedzina}</td>
          <td>${r.Trase}</td>
          <td>${formatMs(r.Laiks_ms)}</td>
          <td>${r.Datums}</td>
          <td>${r.Brauceja_vards}</td>
          <td><button class="del-lap" data-id="${r.ID}" title="Dzēst apli">🗑️</button></td>
        </tr>`
      )
      .join("");

    qsa(".del-lap", tbody).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Vai tiešām dzēst šo apli?")) return;
        const res = await fetch(`${API_URL}/laiki/${id}`, { method: "DELETE" });
        if (!res.ok) {
          alert("Neizdevās dzēst apli.");
          return;
        }
        await loadLapTimes();
      });
    });
  }

  qsa("#lap-table thead th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      const dir = th.dataset.dir === "1" ? -1 : 1;
      qsa("#lap-table thead th[data-key]").forEach((h) => (h.dataset.dir = ""));
      th.dataset.dir = dir;
      renderLapTable(key, dir);
    });
  });

  qsa(".filters input").forEach((inp) =>
    inp.addEventListener("input", () => renderLapTable())
  );

  lapForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const autoId  = autoSel.value;
    const traseId = traseSel.value;
    const vards   = qs("#vards").value.trim();
    const laiks   = qs("#laiks").value.trim();
    const laiksMs = parseTimeToMs(laiks);

    if (!autoId || !traseId || !vards || isNaN(laiksMs)) {
      alert("Nepareizi vai tukši lauki!");
      return;
    }

    const res = await fetch(`${API_URL}/laiki`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoId, traseId, laiks, vards }),
    });

    if (!res.ok) {
      alert("Kļūda pievienojot laiku.");
      return;
    }

    lapForm.reset();
    await loadLapTimes();
  });

  await loadCombos();
  await loadLapTimes();
}
