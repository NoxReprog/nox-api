import process from "node:process";
import express from "express";
import axios from "axios";
import cors from "cors";
import nodemailer from "nodemailer";

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

const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || "contact@noxreprog.com").trim();
const SMTP_HOST = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
const EMAIL_FROM = (process.env.EMAIL_FROM || SMTP_USER || CONTACT_EMAIL).trim();
const hasEmailConfig = Boolean(SMTP_USER && SMTP_PASS);

function getSmtpConfigs() {
  if (!hasEmailConfig) return [];

  const configs = [
    {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      label: `${SMTP_HOST}:${SMTP_PORT} secure=${SMTP_SECURE}`,
    },
  ];

  if (/smtp\.gmail\.com$/i.test(SMTP_HOST)) {
    configs.push(
      {
        host: SMTP_HOST,
        port: 465,
        secure: true,
        label: `${SMTP_HOST}:465 secure=true`,
      },
      {
        host: SMTP_HOST,
        port: 587,
        secure: false,
        label: `${SMTP_HOST}:587 secure=false`,
      }
    );
  }

  return configs.filter(
    (config, index, allConfigs) =>
      index ===
      allConfigs.findIndex(
        (candidate) =>
          candidate.host === config.host &&
          candidate.port === config.port &&
          candidate.secure === config.secure
      )
  );
}

const smtpConfigs = getSmtpConfigs();

function createTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      servername: config.host,
      minVersion: "TLSv1.2",
    },
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEmailErrorMessage(error) {
  const combinedMessage = `${error?.message || ""} ${error?.response || ""}`.trim();

  if (!hasEmailConfig) {
    return "Configuration email incomplete cote serveur. Renseigne SMTP_USER et SMTP_PASS sur Render.";
  }

  if (error?.code === "EAUTH" || error?.responseCode === 535) {
    return "Authentification SMTP refusee. Verifie SMTP_USER et SMTP_PASS.";
  }

  if (
    [
      "ESOCKET",
      "ECONNECTION",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ENOTFOUND",
    ].includes(error?.code)
  ) {
    return "Connexion SMTP impossible. Verifie SMTP_HOST, SMTP_PORT et SMTP_SECURE.";
  }

  if (
    error?.code === "EENVELOPE" ||
    [550, 553].includes(error?.responseCode) ||
    /sender|from|envelope/i.test(combinedMessage)
  ) {
    return "Adresse d'envoi refusee. Verifie EMAIL_FROM et SMTP_USER.";
  }

  return combinedMessage || "Erreur lors de l'envoi du mail.";
}

function getTransportDebug(config, error) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    code: error?.code,
    responseCode: error?.responseCode,
    command: error?.command,
    message: error?.message,
    response: error?.response,
  };
}

async function verifySmtpConnection() {
  let lastError = null;

  for (const config of smtpConfigs) {
    const transport = createTransport(config);

    try {
      await transport.verify();
      console.log("SMTP READY:", config.label);
      return true;
    } catch (error) {
      lastError = error;
      console.error("SMTP VERIFY ERROR:", getTransportDebug(config, error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Aucune configuration SMTP testee.");
}

async function sendMailWithFallback(mailOptions) {
  let lastError = null;

  for (const config of smtpConfigs) {
    const transport = createTransport(config);

    try {
      const result = await transport.sendMail(mailOptions);
      console.log("SMTP SEND OK:", config.label);
      return result;
    } catch (error) {
      lastError = error;
      console.error("SMTP SEND ERROR:", getTransportDebug(config, error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Aucune configuration SMTP testee.");
}

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
// AJOUTE ÇA DANS server.js
app.get("/api/logo/:file", async (req, res) => {
  const file = req.params.file;

  const urls = [
    `https://api.chiptunepro.com/uploads/logos/${file}`,
    `https://chiptunepro.com/uploads/logos/${file}`,
  ];

  for (let url of urls) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://chiptunepro.com/",
        },
      });

      res.set("Content-Type", response.headers["content-type"]);
      return res.send(response.data);
    } catch (err) {
      console.log("fail:", url);
    }
  }

  res.status(404).send("Image not found");
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
app.get("/api/send-email", (req, res) => {
  res.status(405).json({
    ok: false,
    message: "Utilise POST pour envoyer un email.",
    emailConfigured: hasEmailConfig,
    hasSmtpUser: Boolean(SMTP_USER),
    hasSmtpPass: Boolean(SMTP_PASS),
    emailFrom: EMAIL_FROM,
    contactEmail: CONTACT_EMAIL,
    smtpConfigs: smtpConfigs.map(({ host, port, secure, label }) => ({
      host,
      port,
      secure,
      label,
    })),
  });
});

app.post("/api/send-email", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    message,
    brand,
    model,
    year,
    engine,
    vehicle,
    stage,
    originalPower,
    originalTorque,
    tunedPower,
    tunedTorque,
    price,
  } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      error: "Prénom, nom et email sont obligatoires.",
    });
  }

  if (!hasEmailConfig || smtpConfigs.length === 0) {
    return res.status(500).json({
      error: "Configuration email incomplete cote serveur. Renseigne SMTP_USER et SMTP_PASS sur Render.",
    });
  }

  try {
    await sendMailWithFallback({
      from: `"NoxReprog Site" <${EMAIL_FROM}>`,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `Nouvelle demande - ${brand || ""} ${model || ""}`.trim(),
      text: [
        "Nouvelle demande NoxReprog",
        "",
        `Nom: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Téléphone: ${phone || "Non renseigné"}`,
        `Véhicule: ${vehicle || [brand, model, year].filter(Boolean).join(" - ")}`,
        `Motorisation: ${engine || "Non renseignée"}`,
        `Stage: ${stage || "Non renseigné"}`,
        `Puissance: ${originalPower || 0} -> ${tunedPower || 0} cv`,
        `Couple: ${originalTorque || 0} -> ${tunedTorque || 0} Nm`,
        `Prix: ${price || 0} EUR`,
        "",
        "Message:",
        message || "Aucun message",
      ].join("\n"),
      html: `
        <h2>Nouvelle demande NoxReprog</h2>
        <p><strong>Nom :</strong> ${escapeHtml(`${firstName} ${lastName}`)}</p>
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>Téléphone :</strong> ${escapeHtml(phone || "Non renseigné")}</p>
        <p><strong>Véhicule :</strong> ${escapeHtml(vehicle || [brand, model, year].filter(Boolean).join(" - "))}</p>
        <p><strong>Motorisation :</strong> ${escapeHtml(engine || "Non renseignée")}</p>
        <p><strong>Stage :</strong> ${escapeHtml(stage || "Non renseigné")}</p>
        <p><strong>Puissance :</strong> ${escapeHtml(`${originalPower || 0} -> ${tunedPower || 0} cv`)}</p>
        <p><strong>Couple :</strong> ${escapeHtml(`${originalTorque || 0} -> ${tunedTorque || 0} Nm`)}</p>
        <p><strong>Prix :</strong> ${escapeHtml(`${price || 0} EUR`)}</p>
        <hr />
        <p><strong>Message :</strong></p>
        <p>${escapeHtml(message || "Aucun message").replace(/\n/g, "<br />")}</p>
      `,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return res.status(500).json({
      error: getEmailErrorMessage(error),
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log("EMAIL CONFIG:", {
    hasUser: Boolean(SMTP_USER),
    hasPass: Boolean(SMTP_PASS),
    from: EMAIL_FROM,
    to: CONTACT_EMAIL,
    smtpConfigs: smtpConfigs.map(({ label }) => label),
  });

  if (!hasEmailConfig || smtpConfigs.length === 0) {
    console.warn("EMAIL CONFIG: SMTP_USER or SMTP_PASS missing.");
    return;
  }

  try {
    await verifySmtpConnection();
  } catch (error) {
    console.error("SMTP VERIFY FINAL ERROR:", {
      code: error?.code,
      responseCode: error?.responseCode,
      command: error?.command,
      message: error?.message,
      response: error?.response,
    });
  }
});
