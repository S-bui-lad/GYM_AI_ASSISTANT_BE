import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";

dotenv.config();


import userRoutes from "./modules/users/user.routes";
import gymRoutes from "./modules/gyms/gym.routes";
import equipmentRoutes from "./modules/equipment/equipment.routes";
import workoutRoutes from "./modules/workouts/workout.routes";
import recommendRoutes from "./modules/recommend/recomment.routes";
import { errorHandler } from "./middleware/error";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// routes
app.use("/auth", userRoutes);
app.use("/gyms", gymRoutes);
app.use("/equipment", equipmentRoutes);
app.use("/workouts", workoutRoutes);
app.use("/recommend", recommendRoutes);

// error handler (cuối cùng)
app.use(errorHandler);

export default app;
