import app from "./app";
import { connectDb } from "./db/mongoose";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3000;

async function start() {
  await connectDb();
  app.listen(port, () => console.log(`API running on :${port}`));
}
start();
