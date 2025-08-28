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

// get gym by id (public)
r.get("/:id", auth(false), async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id).lean();
    if (!gym) return res.status(404).json({ message: "Gym not found" });
    res.json(gym);
  } catch (err) { next(err); }
});

// update gym (must be a manager of this gym)
r.put("/:id", auth(), requireRole("MANAGER"), async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const gym = await Gym.findById(id);
    if (!gym) return res.status(404).json({ message: "Gym not found" });
    if (!gym.managers.map(String).includes(String(req.user.sub))) {
      return res.status(403).json({ message: "Only managers of this gym can update it" });
    }
    if (typeof name === "string") gym.name = name;
    if (typeof address === "string") gym.address = address;
    await gym.save();
    res.json(gym);
  } catch (err) { next(err); }
});

// delete gym (must be a manager of this gym)
r.delete("/:id", auth(), requireRole("MANAGER"), async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const gym = await Gym.findById(id);
    if (!gym) return res.status(404).json({ message: "Gym not found" });
    if (!gym.managers.map(String).includes(String(req.user.sub))) {
      return res.status(403).json({ message: "Only managers of this gym can delete it" });
    }
    // remove gym reference from all manager users
    await User.updateMany({ _id: { $in: gym.managers } }, { $pull: { gymsManaged: gym._id } });
    await gym.deleteOne();
    res.json({ message: "Gym deleted" });
  } catch (err) { next(err); }
});

export default r;
