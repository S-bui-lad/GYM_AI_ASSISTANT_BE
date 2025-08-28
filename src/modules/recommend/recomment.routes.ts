import { Router } from "express";
import { auth } from "../../middleware/auth";
import Workout from "../workouts/workout.model";
import Equipment from "../equipment/equipment.model";

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

export default r;
