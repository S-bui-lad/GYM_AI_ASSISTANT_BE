import { Router } from "express";
import { auth } from "../../middleware/auth";
import Workout from "../workouts/workout.model";
import Equipment from "../equipment/equipment.model";
import { callAIForWorkoutAdvice } from "../../services/ai.service";

const r = Router();

r.get("/me", auth(), async (req: any, res, next) => {
  try {
    const user = req.user.sub;
    const gym = req.query.gym as string | undefined;

    const userTopCats = await Workout.aggregate([
      { $match: { user } },
      { $unwind: "$items" },
      { $lookup: { from: "equipment", localField: "items.equipment", foreignField: "_id", as: "eq" } },
      { $unwind: "$eq" },
      { $group: { _id: "$eq.category", cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } },
      { $limit: 3 }
    ]).then(rows => rows.map((r:any) => r._id));

    const popularEquipIds = await Workout.aggregate([
      ...(gym ? [{ $match: { gym } }] : []),
      { $unwind: "$items" },
      { $group: { _id: "$items.equipment", uses: { $sum: 1 } } },
      { $sort: { uses: -1 } },
      { $limit: 20 }
    ]).then(rows => rows.map((r:any) => r._id));

    const recs = await Equipment.find({
      _id: { $in: popularEquipIds },
      ...(userTopCats.length ? { category: { $in: userTopCats } } : {}),
      status: "ACTIVE"
    }).limit(10).lean();

    res.json({ categoriesLiked: userTopCats, recommendations: recs });
  } catch (err) { next(err); }
});

// get workouts by user id (for recommendations/analytics views)
r.get("/workouts/:userId", auth(), async (req: any, res, next) => {
  try {
    const { userId } = req.params as any;
    const { page = 1, limit = 20 } = req.query as any;
    const docs = await Workout.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("items.equipment", "name category")
      .lean();
    res.json(docs);
  } catch (err) { next(err); }
});

// AI-generated, science-based recommendations from a user's workout history
r.get("/workouts/:userId/advice", auth(), async (req: any, res, next) => {
  try {
    const { userId } = req.params as any;
    const { limit = 50 } = req.query as any;
    const workouts = await Workout.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("items.equipment", "name category")
      .lean();

    const advice = await callAIForWorkoutAdvice(workouts as any);
    res.json({ userId, countAnalyzed: workouts.length, advice });
  } catch (err) { next(err); }
});

export default r;
