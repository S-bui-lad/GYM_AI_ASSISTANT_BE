import { Schema, model, Document } from "mongoose";

export interface IGym extends Document {
  name: string;
  address?: string;
  managers: string[];
}

const GymSchema = new Schema<IGym>({
  name: { type: String, required: true },
  address: String,
  managers: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default model<IGym>("Gym", GymSchema);
