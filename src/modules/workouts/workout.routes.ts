import { Router } from "express";
import { auth } from "../../middleware/auth";
import Workout from "./workout.model";

const r = Router();

// create/update workout
r.post("/", auth(), async (req: any, res, next) => {
  try {
    const { workoutId, gym, items, startedAt, endedAt } = req.body;
    if (workoutId) {
      const up = await Workout.findOneAndUpdate({ _id: workoutId, user: req.user.sub }, { items, endedAt }, { new: true });
      return res.json(up);
    }
    const doc = await Workout.create({ user: req.user.sub, gym, items, startedAt, endedAt });
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

export default r;
