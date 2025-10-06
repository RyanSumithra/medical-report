
// backend/index.js
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});

