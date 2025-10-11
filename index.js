// // backend/index.js
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors");
const path = require("path");

// Simple file DB for demo (store public keys)
const KEYS_FILE = path.join(__dirname, "keys.json");
if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify({}));

const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

function savePublicKey(address, publicKeyPem) {
  const data = JSON.parse(fs.readFileSync(KEYS_FILE));
  data[address.toLowerCase()] = publicKeyPem;
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
}

function getPublicKey(address) {
  const data = JSON.parse(fs.readFileSync(KEYS_FILE));
  return data[address.toLowerCase()];
}

// register a user's RSA public key (PEM)
app.post("/register-public-key", (req, res) => {
  const { address, publicKeyPem } = req.body;
  if (!address || !publicKeyPem) return res.status(400).send("Missing");
  savePublicKey(address, publicKeyPem);
  res.json({ ok: true });
});

function aesGcmEncrypt(buffer) {
  const iv = crypto.randomBytes(12);
  const key = crypto.randomBytes(32); // AES-256
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes
  return {
    encryptedBuffer: Buffer.concat([iv, tag, encrypted]),
    key
  };
}

async function uploadToPinata(buffer, fileName) {
  const formData = new FormData();
  formData.append("file", buffer, { filename: fileName });

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    maxBodyLength: "Infinity",
    headers: {
      ...formData.getHeaders(),
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
    },
  });

  return res.data.IpfsHash; // CID
}

app.post("/upload-report", upload.single("file"), async (req, res) => {
  try {
    const ownerAddress = req.body.ownerAddress;
    let recipients = [];
    if (req.body.recipients) {
      recipients = typeof req.body.recipients === "string" ? JSON.parse(req.body.recipients) : req.body.recipients;
    }
    if (!req.file) return res.status(400).send("No file");
    if (!ownerAddress) return res.status(400).send("No ownerAddress");

    // Encrypt the file
    const { encryptedBuffer, key } = aesGcmEncrypt(req.file.buffer);

    // Upload encrypted file to Pinata
    const fileName = `report-${Date.now()}.enc`;
    const cid = await uploadToPinata(encryptedBuffer, fileName);

    // Encrypt symmetric key for each recipient
    const encryptedKeys = {};
    for (const addr of recipients) {
      const pem = getPublicKey(addr);
      if (!pem) {
        encryptedKeys[addr] = null;
        continue;
      }
      const cipherKey = crypto.publicEncrypt(
        { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        key
      );
      encryptedKeys[addr] = cipherKey.toString("base64");
    }

    res.json({
      cid,
      fileName,
      encryptedKeys
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(String(err));
  }
});

// Firebase part
require("dotenv").config();

const admin = require("firebase-admin");




// Initialize Firebase Admin
const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Middleware to verify Firebase ID tokens
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ----- ROUTES -----

// 1️⃣ Register user role (after signup)
app.post("/register-role", verifyFirebaseToken, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["hospital", "pharmacy", "patient"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await db.collection("users").doc(req.user.uid).set(
      {
        email: req.user.email,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    res.json({ message: "Role registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/get-token', async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    // Create a custom token
    const token = await admin.auth().createCustomToken(uid, {
      email: email || 'test@example.com'
    });
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2️⃣ Get current user profile
app.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ Get reports visible to the logged-in user (by role)
app.get("/reports", verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const user = userDoc.data();
    if (!user) return res.status(404).json({ error: "User not found" });

    let query;
    if (user.role === "hospital") {
      query = db.collection("reports").where("uploaderRole", "==", "hospital");
    } else if (user.role === "pharmacy") {
      query = db.collection("reports").where("recipientRole", "==", "pharmacy");
    } else {
      query = db.collection("reports").where("recipientRole", "==", "patient");
    }

    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// firebase end

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});

