// server.js
const express = require("express");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Load and parse the service account from env
const serviceAccountBuffer = Buffer.from(
  process.env.SERVICE_ACCOUNT_KEY,
  "base64"
);
const serviceAccount = JSON.parse(serviceAccountBuffer.toString());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// ✅ STEP A: Send OTP
app.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
      {
        phoneNumber,
        recaptchaToken: "unused",
      }
    );
    res.json({ sessionInfo: response.data.sessionInfo });
  } catch (err) {
    res.status(400).json({
      error: err?.response?.data?.error?.message || err.message,
    });
  }
});

// ✅ STEP B: Verify OTP and return Firebase custom token
app.post("/verify-otp", async (req, res) => {
  const { sessionInfo, code } = req.body;

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
      {
        sessionInfo,
        code,
      }
    );

    const { localId, phoneNumber } = response.data;

    const customToken = await admin.auth().createCustomToken(localId, {
      phoneNumber,
    });

    res.json({ token: customToken });
  } catch (err) {
    res.status(400).json({
      error: err?.response?.data?.error?.message || err.message,
    });
  }
});

// ✅ Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
