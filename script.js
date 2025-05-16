const API_URL = "http://localhost:3000/api";

// ---------- Palīg-funkcijas ----------
const qs = (sel, el = document) => el.querySelector(sel);
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

// ---------- Mājaslapas inicializācija ----------
document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body.dataset.page;
    if (page === "auto")  initAutoPage();
    if (page === "laps")  initLapPage();
});

/* ======================================================
 * 1) AUTO LAPA
 * =====================================================*/
async function initAutoPage() {
    const form = qs("#car-form");
    const tbody = qs("#auto-table tbody");
    let data = [];

    // ---- Datu ielāde ----
    async function loadCars() {
        data = await fetch(`${API_URL}/auto`).then((r) => r.json());
        renderTable();
    }

    // ---- Tabulas zīmēšana ----
    function renderTable(sortKey = null, dir = 1) {
        let rows = [...data];

        // filtrēšana
        qsa(".filters input").forEach((inp, idx) => {
            const val = inp.value.trim().toLowerCase();
            if (val) rows = rows.filter((row) =>
                `${row[Object.keys(row)[idx]]}`.toLowerCase().includes(val)
            );
        });

        // kārtošana
        if (sortKey) {
            rows.sort((a, b) =>
                a[sortKey] > b[sortKey] ? dir : a[sortKey] < b[sortKey] ? -dir : 0
            );
        }

        // HTML
        tbody.innerHTML = rows
            .map(
                (r) => `<tr>
                    <td>${r.Firma}</td>
                    <td>${r.Modelis}</td>
                    <td>${r.Modela_gads ?? ""}</td>
                    <td>${r.Piedzina}</td>
                    <td>${r.Svars_kg}</td>
                    <td>${r.Jauda_zs}</td>
                </tr>`
            )
            .join("");
    }

    // header klikšķi = kārtošana
    qsa("#auto-table thead th").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.dataset.key;
            const dir = th.dataset.dir === "1" ? -1 : 1;
            qsa("#auto-table thead th").forEach((h) => (h.dataset.dir = ""));
            th.dataset.dir = dir;
            renderTable(key, dir);
        });
    });

    // filtrēšana input-os
    qsa(".filters input").forEach((inp) =>
        inp.addEventListener("input", () => renderTable())
    );

    // ---- Auto pievienošana ----
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            firma:     qs("#firma").value.trim(),
            modelis:   qs("#modelis").value.trim(),
            modelaGads:qs("#modelaGads").value.trim() || null,
            piedzina:  qs("#piedzina").value.trim(),
            svarsKg:   qs("#svarsKg").value.trim(),
            jaudaZs:   qs("#jaudaZs").value.trim(),
        };
        const ok = Object.values(payload).every((v) => v || v === null);
        if (!ok) return alert("Aizpildi visus obligātos laukus!");
        const res = await fetch(`${API_URL}/auto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            form.reset();
            loadCars();
        } else alert("Kļūda pievienojot auto.");
    });

    await loadCars();
}

/* ======================================================
 * 2) LAIKU LAPA
 * =====================================================*/
async function initLapPage() {
    const lapForm   = qs("#lap-form");
    const tbody     = qs("#lap-table tbody");
    const autoSel   = qs("#auto-select");
    const traseSel  = qs("#trase-select");
    let lapData = [];

    // ---- ComboBox ielāde ----
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

    // ---- Laiku ielāde ----
    async function loadLapTimes() {
        lapData = await fetch(`${API_URL}/laiki`).then((r) => r.json());
        renderLapTable();
    }

    // ---- Tabulas zīmēšana ----
    function renderLapTable(sortKey = null, dir = 1) {
        let rows = [...lapData];

        // filtrēšana
        qsa(".filters input").forEach((inp, idx) => {
            const val = inp.value.trim().toLowerCase();
            if (val) rows = rows.filter((row) =>
                `${[
                    `${row.Firma} ${row.Modelis}`,
                    row.Piedzina,
                    row.Trase,
                    formatMs(row.Laiks_ms),
                    row.Datums,
                    row.Brauceja_vards,
                ][idx]}`.toLowerCase().includes(val)
            );
        });

        // kārtošana
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

        // HTML
        tbody.innerHTML = rows
            .map(
                (r) => `<tr>
                    <td>${r.Firma} ${r.Modelis}</td>
                    <td>${r.Piedzina}</td>
                    <td>${r.Trase}</td>
                    <td>${formatMs(r.Laiks_ms)}</td>
                    <td>${r.Datums}</td>
                    <td>${r.Brauceja_vards}</td>
                </tr>`
            )
            .join("");
    }

    // header klikšķi = kārtošana
    qsa("#lap-table thead th").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.dataset.key;
            const dir = th.dataset.dir === "1" ? -1 : 1;
            qsa("#lap-table thead th").forEach((h) => (h.dataset.dir = ""));
            th.dataset.dir = dir;
            renderLapTable(key, dir);
        });
    });

    // filtrēšana
    qsa(".filters input").forEach((inp) =>
        inp.addEventListener("input", () => renderLapTable())
    );

    // ---- Laika pievienošana ----
    lapForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const autoId  = autoSel.value;
        const traseId = traseSel.value;
        const vards   = qs("#vards").value.trim();
        const laiks   = qs("#laiks").value.trim();
        const laiksMs = parseTimeToMs(laiks);

        if (!autoId || !traseId || !vards || isNaN(laiksMs))
            return alert("Nepareizi vai tukši lauki!");

        const res = await fetch(`${API_URL}/laiki`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ autoId, traseId, laiks, vards }),
        });
        if (res.ok) {
            lapForm.reset();
            await loadLapTimes();
        } else alert("Kļūda pievienojot laiku.");
    });

    await loadCombos();
    await loadLapTimes();
}
