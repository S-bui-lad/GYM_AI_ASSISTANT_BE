import { Router } from "express";
import { auth } from "../../middleware/auth";
import Workout from "./workout.model";
import Gym from "../gyms/gym.model";

const r = Router();

// create/update workout
r.post("/", auth(), async (req: any, res, next) => {
  try {
    const { workoutId, gym, items, startedAt, endedAt } = req.body;
    if (workoutId) {
      const up = await Workout.findOneAndUpdate({ _id: workoutId, user: req.user.sub }, { items, endedAt }, { new: true });
      return res.json(up);
    }
    // Normalize and validate gym id: accept string id or object with _id
    const gymId = typeof gym === "string" ? gym : gym?._id;
    if (!gymId) {
      return res.status(400).json({ message: "Gym id is required" });
    }
    const gymExists = await Gym.exists({ _id: gymId });
    if (!gymExists) {
      return res.status(400).json({ message: "Gym not found" });
    }
    const doc = await Workout.create({ user: req.user.sub, gym: gymId, items, startedAt, endedAt });
    res.json(doc);
  } catch (err) { next(err); }
});

// get my workouts
r.get("/me", auth(), async (req: any, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query as any;
    const docs = await Workout.find({ user: req.user.sub })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("items.equipment", "name category")
      .lean();
    res.json(docs);
  } catch (err) { next(err); }
});

// get workout details by id
r.get("/:id", auth(), async (req: any, res, next) => {
  try {
    const { id } = req.params;
    let doc = await Workout.findOne({ _id: id, user: req.user.sub })
      .populate("items.equipment", "name category brand images")
      .populate("gym", "name address");
    if (!doc) {
      return res.status(404).json({ message: "Workout not found" });
    }
    // Fallback: if gym did not populate, try to fetch by raw id (handles legacy string storage)
    if (!doc.gym) {
      const rawGymId: any = (doc as any)._doc?.gym || undefined;
      if (rawGymId) {
        const g = await Gym.findById(rawGymId).select("name address");
        if (g) {
          (doc as any).gym = g;
        }
      }
    }
    res.json(doc.toObject());
  } catch (err) { next(err); }
});

export default r;
