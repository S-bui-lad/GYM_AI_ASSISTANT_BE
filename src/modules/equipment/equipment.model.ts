import { Schema, model, Document, Types } from "mongoose";

export interface IEquipment extends Document {
  gym: Types.ObjectId;
  name: string;
  category?: string;
  brand?: string;
  status: "ACTIVE"|"MAINTENANCE"|"RETIRED";
  images: string[];
  s3Images?: Array<{
    url: string;
    key: string;
    bucket: string;
  }>;
  meta?: Record<string, any>;
  createdBy?: string;
}

const EquipmentSchema = new Schema<IEquipment>({
  gym: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
  name: { type: String, required: true },
  category: String,
  brand: String,
  status: { type: String, enum: ["ACTIVE","MAINTENANCE","RETIRED"], default: "ACTIVE" },
  images: [String],
  s3Images: [{
    url: { type: String, required: true },
    key: { type: String, required: true },
    bucket: { type: String, required: true }
  }],
  meta: Schema.Types.Mixed,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default model<IEquipment>("Equipment", EquipmentSchema);
