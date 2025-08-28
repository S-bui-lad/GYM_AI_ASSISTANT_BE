import { Schema, model, Document, Types } from "mongoose";

export interface IWorkoutItem {
  equipment: Types.ObjectId;
  sets?: number;
  reps?: number;
  durationMin?: number;
  weightKg?: number;
  notes?: string;
}

export interface IWorkout extends Document {
  user: Types.ObjectId;
  gym: Types.ObjectId;
  items: IWorkoutItem[];
  startedAt: Date;
  endedAt?: Date;
}

const WorkoutSchema = new Schema<IWorkout>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  gym: { type: Schema.Types.ObjectId, ref: "Gym", required: true },
  items: [{
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment", required: true },
    sets: Number,
    reps: Number,
    durationMin: Number,
    weightKg: Number,
    notes: String
  }],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date
}, { timestamps: true });

export default model<IWorkout>("Workout", WorkoutSchema);
