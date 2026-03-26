import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ======================
// 🔧 CONFIG API
// ======================
const API_BASE = "https://api.chiptunepro.com/api/v1";
const API_KEY = process.env.API_KEY; // ✅ IMPORTANT (Render)

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ======================
// 🔧 HELPER API
// ======================
async function callAPI(endpoint) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
    return response.data;
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
}

// ======================
// 🖼️ PROXY LOGOS (FIX IMAGES)
// ======================
app.get("/api/logo/:file", async (req, res) => {
  try {
    const file = req.params.file;

    const response = await axios.get(
      `https://chiptunepro.com/uploads/logos/${file}`,
      {
        responseType: "arraybuffer",
      }
    );

    res.set("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (err) {
    console.error("LOGO ERROR:", err.message);
    res.status(404).send("Image not found");
  }
});

// ======================
// 🚗 ROUTES API
// ======================

// BRANDS
app.get("/api/brands", async (req, res) => {
  try {
    const data = await callAPI("/brands");
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération marques" });
  }
});

// MODELS
app.get("/api/models/:brand", async (req, res) => {
  try {
    const brand = encodeURIComponent(req.params.brand);
    const data = await callAPI(`/models/${brand}`);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération modèles" });
  }
});

// YEARS
app.get("/api/years/:brand/:model", async (req, res) => {
  try {
    const brand = encodeURIComponent(req.params.brand);
    const model = encodeURIComponent(req.params.model);

    const data = await callAPI(`/years/${brand}/${model}`);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération années" });
  }
});

// ENGINES
app.get("/api/engines/:model/:year", async (req, res) => {
  try {
    const model = encodeURIComponent(req.params.model);
    const year = req.params.year;

    const data = await callAPI(`/engines/${model}/${year}`);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération moteurs" });
  }
});

// POWERS
app.get("/api/powers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await callAPI(`/powers/${id}`);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération puissance" });
  }
});

// ======================
// 🚀 START SERVER
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});