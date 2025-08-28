import { Schema, model, Document } from "mongoose";

export type UserRole = "MANAGER" | "MEMBER";

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  gymsManaged?: string[];
}

const UserSchema = new Schema<IUser>({
  email: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["MANAGER", "MEMBER"], default: "MEMBER" },
  gymsManaged: [{ type: Schema.Types.ObjectId, ref: "Gym" }]
}, { timestamps: true });

export default model<IUser>("User", UserSchema);
