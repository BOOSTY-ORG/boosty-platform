import app from "./express.js";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// ** start Server **
app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
});
