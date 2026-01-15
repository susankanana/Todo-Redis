import redisClient from "../redis/client";

const COOLDOWN_SECONDS = 60;

export const canResendVerification = async (email: string) => {
  const key = `verify_cooldown:${email}`;
  const exists = await redisClient.exists(key);
  return !exists;
};

export const setResendCooldown = async (email: string) => {
  await redisClient.set(`verify_cooldown:${email}`, "1", "EX", COOLDOWN_SECONDS);
};
