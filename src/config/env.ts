// src/config/env.ts
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gpt-4.1-mini",
  
  // AWS S3 Configuration
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  awsRegion: process.env.AWS_REGION || "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET || "gymai.documents.dev",
};

export type AppEnv = typeof env;


