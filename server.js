import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG API
const API_BASE = "https://api.chiptunepro.com/api/v1";
const API_KEY = "b1748861-3aec-466c-a042-ccf57a8b748b"; // 🔴 remplace

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
// 🚗 ROUTES API
// ======================

// BRANDS
app.get("/api/brands", async (req, res) => {
  try {
    const data = await callAPI("/brands");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération marques" });
  }
});

// MODELS
app.get("/api/models/:brand", async (req, res) => {
  try {
    const brand = req.params.brand;
    const data = await callAPI(`/models/${brand}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération modèles" });
  }
});

// YEARS
app.get("/api/years/:brand/:model", async (req, res) => {
  try {
    const { brand, model } = req.params;

    const encodedModel = encodeURIComponent(model);

    const data = await callAPI(`/years/${brand}/${encodedModel}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération années" });
  }
});

// ENGINES
app.get("/api/engines/:model/:year", async (req, res) => {
  try {
    const { model, year } = req.params;

    const encodedModel = encodeURIComponent(model);

    const data = await callAPI(`/engines/${encodedModel}/${year}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération moteurs" });
  }
});

// POWERS
app.get("/api/powers/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const data = await callAPI(`/powers/${id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération puissance" });
  }
});

// ======================
// 🚀 START SERVER
// ======================
app.listen(5000, () => {
  console.log("✅ API running on http://localhost:5000");
});