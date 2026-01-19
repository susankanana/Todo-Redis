import db from "../drizzle/db";
import { UsersTable, TIUser } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redisClient from "../redis/client";
import {
  saveSession,
  verifySession,
  deleteSession,
} from "./auth.redis";

import {
  incrementVerificationAttempts,
  isVerificationBlocked,
  resetVerificationAttempts,
} from "./verification.rate";

import {
  canResendVerification,
  setResendCooldown,
} from "./verification.cooldown";

/* ------------------------------------------------------------------
   Cache helpers
-------------------------------------------------------------------*/
const USERS_CACHE_KEY = "users:all";

export const getUserCache = async () => {
  const cached = await redisClient.get(USERS_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  return null;
};

export const setUserCache = async (users: any) => {
  await redisClient.set(USERS_CACHE_KEY, JSON.stringify(users), "EX", 300); // 5 mins
};

export const invalidateUserCache = async () => {
  await redisClient.del(USERS_CACHE_KEY);
};

/* ------------------------------------------------------------------
   CREATE USER
-------------------------------------------------------------------*/
export const createUserService = async (user: TIUser) => {
  await db.insert(UsersTable).values(user);
  await invalidateUserCache();
  return "User created successfully";
};

/* ------------------------------------------------------------------
   GET USER BY EMAIL
-------------------------------------------------------------------*/
export const getUserByEmailService = async (email: string) => {
  return await db.query.UsersTable.findFirst({
    where: sql`${UsersTable.email} = ${email}`,
  });
};

/* ------------------------------------------------------------------
   LOGIN USER
   - Validates credentials
   - Generates JWT
   - Saves session in Redis
-------------------------------------------------------------------*/
export const loginUserService = async (email: string, password: string) => {
  const user = await db.query.UsersTable.findFirst({
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      role: true,
      isVerified: true,
    },
    where: sql`${UsersTable.email} = ${email}`,
  });


  if (!user) return null;
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return null;
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  await saveSession(user.id, token);

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

/* ------------------------------------------------------------------
   VERIFY SESSION (JWT + REDIS)
-------------------------------------------------------------------*/
export const verifyUserSessionService = async (
  userId: number,
  token: string
) => {
  return await verifySession(userId, token);
};

/* ------------------------------------------------------------------
   LOGOUT USER
-------------------------------------------------------------------*/
export const logoutUserService = async (userId: number) => {
  await deleteSession(userId);
  return "Logged out successfully";
};

/* ------------------------------------------------------------------
   EMAIL VERIFICATION (REDIS-ONLY)
-------------------------------------------------------------------*/
export const saveVerificationCode = async (
  email: string,
  code: string,
  isFirstSend: boolean = false
) => {
  // Only enforce cooldown for resends
  if (!isFirstSend && !(await canResendVerification(email))) {
    return {
      success: false,
      message: "Please wait before requesting another code",
    };
  }
   // Delete any previous code (optional safety)
  await redisClient.del(`verify:${email}`);

  // Save the verification code in Redis for 10 minutes
  await redisClient.set(`verify:${email}`, code, "EX", 600); // 10 mins

  // Set cooldown (e.g., 60 seconds) if this is a resend
  if (!isFirstSend) {
    await setResendCooldown(email);
  }

  return { success: true };
};

export const verifyEmailCodeService = async (
  email: string,
  code: string
) => {
  if (await isVerificationBlocked(email)) {
    return { success: false, message: "Too many attempts. Try again later." };
  }

  const storedCode = await redisClient.get(`verify:${email}`);
  console.log("storedCode from Redis:", storedCode, "code provided:", code); // DEBUG


  await incrementVerificationAttempts(email);

  if (!storedCode || storedCode !== code) {
    return { success: false, message: "Invalid verification code" };
  }

  // success
  await db
    .update(UsersTable)
    .set({ isVerified: true })
    .where(sql`${UsersTable.email} = ${email}`);

  // Delete the code immediately to prevent reuse
  await redisClient.del(`verify:${email}`);
  await resetVerificationAttempts(email);

  return { success: true };
};

/* ------------------------------------------------------------------
   GET ALL USERS (ADMIN)
-------------------------------------------------------------------*/
export const getAllUsersService = async () => {
  const cachedUsers = await getUserCache();
  if (cachedUsers) {
    console.log("CACHE HIT: returning users from Redis");
    return cachedUsers;
  }

  const users = await db.query.UsersTable.findMany({
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isVerified: true,
    },
  });
  await setUserCache(users);
  return users;
};

// Delete a user
export const deleteUserService = async (id: number) => {
  await db.delete(UsersTable).where(sql`${UsersTable.id} = ${id}`);
  await invalidateUserCache();
  return "User removed successfully";
};
