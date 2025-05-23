const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 4001;
const DB = "./racelibrary.db";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve static files (HTML, CSS, JS)

const db = new sqlite3.Database(DB, (err) => {
  if (err) console.error(err.message);
  console.log("✅ SQLite datubāze pieslēgta");
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Auto(
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Firma        TEXT NOT NULL,
      Modelis      TEXT NOT NULL,
      Modela_gads  INTEGER,
      Piedzina     TEXT NOT NULL,
      Svars_kg     INTEGER NOT NULL,
      Jauda_zs     INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Trases(
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Nosaukums TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Laiki(
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Auto_ID  INTEGER NOT NULL,
      Trases_ID INTEGER NOT NULL,
      Laiks_ms INTEGER NOT NULL,
      Datums   TEXT DEFAULT (datetime('now','localtime')),
      Brauceja_vards TEXT NOT NULL,
      FOREIGN KEY(Auto_ID)   REFERENCES Auto(ID),
      FOREIGN KEY(Trases_ID) REFERENCES Trases(ID)
  )`);

  // Demo dati, ja tukšs
  db.get("SELECT COUNT(*) AS cnt FROM Auto", (e, r) => {
    if (r.cnt === 0)
      db.run(`INSERT INTO Auto(Firma,Modelis,Modela_gads,Piedzina,Svars_kg,Jauda_zs)
              VALUES('Nissan','Skyline GT-R R34',2001,'AWD',1560,346)`);
  });
  db.get("SELECT COUNT(*) AS cnt FROM Trases", (e, r) => {
    if (r.cnt === 0)
      db.run(`INSERT INTO Trases(Nosaukums) VALUES('Tsukuba Fruits Line')`);
  });
  db.get("SELECT COUNT(*) AS cnt FROM Laiki", (e, r) => {
    if (r.cnt === 0)
      db.run(`INSERT INTO Laiki(Auto_ID,Trases_ID,Laiks_ms,Brauceja_vards)
              VALUES(1,1,241539,'Mārcis')`);
  });
});

app.get("/api/auto", (_req, res) => {
  db.all("SELECT * FROM Auto ORDER BY Firma, Modelis", (e, rows) =>
    e ? res.status(500).send(e.message) : res.json(rows)
  );
});

app.get("/api/trases", (_req, res) => {
  db.all("SELECT * FROM Trases ORDER BY Nosaukums", (e, rows) =>
    e ? res.status(500).send(e.message) : res.json(rows)
  );
});

app.get("/api/laiki", (_req, res) => {
  const q = `SELECT L.ID,
                    A.Firma, A.Modelis, A.Piedzina,
                    T.Nosaukums AS Trase,
                    L.Laiks_ms, L.Datums, L.Brauceja_vards
             FROM Laiki L
             JOIN Auto   A ON A.ID = L.Auto_ID
             JOIN Trases T ON T.ID = L.Trases_ID
             ORDER BY L.Laiks_ms`;
  db.all(q, (e, rows) =>
    e ? res.status(500).send(e.message) : res.json(rows)
  );
});

app.post("/api/auto", (req, res) => {
  const { firma, modelis, modelaGads, piedzina, svarsKg, jaudaZs } = req.body;
  if (!firma || !modelis || !piedzina || !svarsKg || !jaudaZs)
    return res.status(400).send("Visi auto lauki ir jāaizpilda!");

  const sql = `INSERT INTO Auto
               (Firma,Modelis,Modela_gads,Piedzina,Svars_kg,Jauda_zs)
               VALUES(?,?,?,?,?,?)`;
  db.run(sql, [firma, modelis, modelaGads, piedzina, svarsKg, jaudaZs], (e) =>
    e ? res.status(500).send(e.message) : res.sendStatus(201)
  );
});

app.post("/api/trases", (req, res) => {
  const { nosaukums } = req.body;
  if (!nosaukums)
    return res.status(400).send("Trases nosaukums ir jāaizpilda!");

  db.run("INSERT INTO Trases(Nosaukums) VALUES(?)", [nosaukums], (e) =>
    e ? res.status(500).send(e.message) : res.sendStatus(201)
  );
});

app.post("/api/laiki", (req, res) => {
  const { autoId, traseId, laiks, vards } = req.body;
  if (!autoId || !traseId || !laiks || !vards)
    return res.status(400).send("Visi lauki ir obligāti!");

  const parts = laiks.split(":");
  if (parts.length !== 2)
    return res.status(400).send("Nepareizs laika formāts!");

  const laiksMs = Math.round((+parts[0] * 60 + +parts[1]) * 1000);
  if (isNaN(laiksMs)) return res.status(400).send("Nepareizs laiks!");

  const sql = `INSERT INTO Laiki(Auto_ID,Trases_ID,Laiks_ms,Brauceja_vards)
               VALUES(?,?,?,?)`;
  db.run(sql, [autoId, traseId, laiksMs, vards], (e) =>
    e ? res.status(500).send(e.message) : res.sendStatus(201)
  );
});

app.delete("/api/auto/:id", (req, res) => {
  db.run("DELETE FROM Auto WHERE ID = ?", [req.params.id], function (e) {
    e
      ? res.status(500).send(e.message)
      : res.sendStatus(this.changes ? 204 : 404);
  });
});

app.delete("/api/laiki/:id", (req, res) => {
  db.run("DELETE FROM Laiki WHERE ID = ?", [req.params.id], function (e) {
    e
      ? res.status(500).send(e.message)
      : res.sendStatus(this.changes ? 204 : 404);
  });
});

app.listen(PORT, () =>
  console.log(`Serveris darbojas: http://localhost:${PORT}`)
);
