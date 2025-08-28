import { Router } from "express";
import Gym from "./gym.model";
import { auth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";
import User from "../users/user.model";

const r = Router();

// create gym (manager)
r.post("/", auth(), requireRole("MANAGER"), async (req: any, res, next) => {
  try {
    const { name, address } = req.body;
    const creatorId = req.user!.sub;
    const gym = await Gym.create({ name, address, managers: [creatorId] });
    // add gym to user's gymsManaged
    await User.findByIdAndUpdate(creatorId, { $addToSet: { gymsManaged: gym._id } });
    res.json(gym);
  } catch (err) { next(err); }
});

// list gyms
r.get("/", auth(false), async (req, res, next) => {
  try {
    const gyms = await Gym.find().lean();
    res.json(gyms);
  } catch (err) { next(err); }
});

// add manager to gym
r.post("/:id/managers/:userId", auth(), requireRole("MANAGER"), async (req: any, res, next) => {
  try {
    const { id, userId } = req.params;
    const gym = await Gym.findById(id);
    if (!gym) return res.status(404).json({ message: "Gym not found" });
    // optional: verify req.user is already a manager of this gym
    if (!gym.managers.map(String).includes(String(req.user.sub))) {
      return res.status(403).json({ message: "Only existing manager can add another manager" });
    }
    gym.managers.push(userId);
    await gym.save();
    await User.findByIdAndUpdate(userId, { $addToSet: { gymsManaged: gym._id }});
    res.json(gym);
  } catch (err) { next(err); }
});

export default r;
