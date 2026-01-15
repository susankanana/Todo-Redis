// src/auth/auth.redis.ts
import redisClient from "../redis/client";

export const saveSession = async (userId: number, token: string) => {
  
  await redisClient.set(`session:${userId}`, token, "EX", 3600);  // 1 hour expiry

};

export const verifySession = async (userId: number, token: string) => {
  const stored = await redisClient.get(`session:${userId}`);
  return stored === token;
};

export const deleteSession = async (userId: number) => {
  await redisClient.del(`session:${userId}`);
};
