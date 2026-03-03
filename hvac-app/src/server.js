const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxVcmNlmH14WpeWW1SMW3u0VQBT3TUYHI2w0x2XfbU_UlWPGxSGufsM351ldV4py4-d/exec"; // paste your web app URL

app.post("/sheet", async (req, res) => {
  try {
    const response = await axios.post(GOOGLE_SHEET_URL, req.body);
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to connect to Google Sheet" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
