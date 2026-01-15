import redisClient from "../redis/client";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 600; // 10 minutes

export const incrementVerificationAttempts = async (email: string) => {
  const key = `verify_attempts:${email}`;

  const attempts = await redisClient.incr(key);

  if (attempts === 1) {
    // first attempt → set expiry
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  return attempts;
};

export const isVerificationBlocked = async (email: string) => {
  const key = `verify_attempts:${email}`;
  const attempts = Number(await redisClient.get(key));
  return attempts >= MAX_ATTEMPTS;
};

export const resetVerificationAttempts = async (email: string) => {
  await redisClient.del(`verify_attempts:${email}`);
};
