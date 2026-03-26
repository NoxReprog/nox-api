import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/send-email", async (req, res) => {
  const { name, email, car, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "contact@noxreprog.com",
        pass: "itki suxi kmgt ybgq",
      },
    });

    await transporter.sendMail({
      from: `"NoxReprog" <contact@noxreprog.com>`,
      to: "contact@noxreprog.com",
      replyTo: email,
      subject: "Nouvelle demande - NoxReprog",
      html: `
        <h2>Nouvelle demande - NoxReprog</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Véhicule :</strong> ${car}</p>
        <hr />
        <p><strong>Message :</strong></p>
        <p>${message}</p>
      `,
    });

    res.status(200).send("OK");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur");
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});