import bcrypt from "bcryptjs";

export const hashPassword = async (raw: string) => {
  return bcrypt.hash(raw, 10);
};

export const comparePassword = async (raw: string, hash: string) => {
  return bcrypt.compare(raw, hash);
};
