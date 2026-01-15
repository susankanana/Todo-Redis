import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import "dotenv/config";

import {
  createUserService,
  getUserByEmailService,
  loginUserService,
  getAllUsersService,
  saveVerificationCode,
  verifyEmailCodeService,
  logoutUserService,
} from "./auth.service";

import { sendEmail } from "../../src/mailer/mailer";


/* ------------------------------------------------------------------
   CREATE USER
-------------------------------------------------------------------*/
export const createUserController = async (req: Request, res: Response) => {
  try {
    const user = req.body;

    // Check if user already exists
    const existingUser = await getUserByEmailService(user.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    user.password = hashedPassword;
    user.isVerified = false;

    await createUserService(user);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save verification code in Redis
    await saveVerificationCode(user.email, verificationCode);

    // Send verification email
    try {
      await sendEmail(
        user.email,
        "Verify your account",
        `Hello ${user.lastName}, your verification code is: ${verificationCode}`,
        `
        <div>
          <h2>Hello ${user.lastName},</h2>
          <p>Your verification code is <strong>${verificationCode}</strong></p>
          <p>This code expires in 10 minutes.</p>
        </div>
        `
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return res.status(201).json({
      message: "User created. Verification code sent to email",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------------------------------
   VERIFY USER (REDIS-BASED)
-------------------------------------------------------------------*/
export const verifyUserController = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const user = await getUserByEmailService(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await verifyEmailCodeService(email, code);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Send success email
    try {
      await sendEmail(
        user.email,
        "Account Verified Successfully",
        `Hello ${user.lastName}, your account has been verified.`,
        `
        <div>
          <h2>Hello ${user.lastName},</h2>
          <p>Your account has been <strong>successfully verified</strong>.</p>
          <p>You can now log in.</p>
        </div>
        `
      );
    } catch (error) {
      console.error("Failed to send verification success email:", error);
    }

    return res.status(200).json({ message: "User verified successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller for the "Resend Code" button
export const resendVerificationController = async (req: Request, res: Response) => {
  const { email } = req.body;

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Cooldown is enforced automatically for resends (isFirstSend defaults to false)
  const result = await saveVerificationCode(email, code);

  if (!result.success) {
    return res.status(429).json({ message: result.message });
  }

  await sendEmail(
    email,
    "Verification Code",
    `Your verification code is ${code}`,
    `<p>Your verification code is <strong>${code}</strong></p>`
  );

  return res.json({ message: "Verification code resent" });
};

/* ------------------------------------------------------------------
   LOGIN USER (JWT + REDIS SESSION)
-------------------------------------------------------------------*/
export const loginUserController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await loginUserService(email, password);
    if (!result) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};


/* ------------------------------------------------------------------
   LOGOUT USER
-------------------------------------------------------------------*/
export const logoutUserController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user session" });
    }

    await logoutUserService(userId);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------------------------------
   GET ALL USERS (ADMIN)
-------------------------------------------------------------------*/
export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
