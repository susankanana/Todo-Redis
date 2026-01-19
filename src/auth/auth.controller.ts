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
  deleteUserService
} from "./auth.service";

// Import the RabbitMQ producer
import { enqueueEmail } from "../../src/mailer/emailProducer";

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
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    user.isVerified = false;

    await createUserService(user);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save verification code in Redis
    await saveVerificationCode(user.email, verificationCode);

    // Enqueue verification email
    enqueueEmail({
      to: user.email,
      subject: "Verify your account",
      text: `Hello ${user.lastName}, your verification code is: ${verificationCode}`,
      html: `
        <div>
          <h2>Hello ${user.lastName},</h2>
          <p>Your verification code is <strong>${verificationCode}</strong></p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

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

    const result = await verifyEmailCodeService(email, code);

    if (!result.success) {
      return res.status(400).json({ message: result.message || "Invalid or expired verification code" });
    }

    // Enqueue success email
    enqueueEmail({
      to: user.email,
      subject: "Account Verified Successfully",
      text: `Hello ${user.lastName}, your account has been verified.`,
      html: `
        <div>
          <h2>Hello ${user.lastName},</h2>
          <p>Your account has been <strong>successfully verified</strong>.</p>
          <p>You can now log in.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "User verified successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------------------------------
   RESEND VERIFICATION CODE
-------------------------------------------------------------------*/
export const resendVerificationController = async (req: Request, res: Response) => {
  const { email } = req.body;

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await saveVerificationCode(email, code);

  if (!result.success) {
    return res.status(429).json({ message: result.message });
  }

  // Enqueue resend verification email
  enqueueEmail({
    to: email,
    subject: "Verification Code",
    text: `Your verification code is ${code}`,
    html: `<p>Your verification code is <strong>${code}</strong></p>`,
  });

  return res.json({ message: "Verification code resent" });
};

/* ------------------------------------------------------------------
   LOGIN, LOGOUT, GET USERS, DELETE USER remain unchanged
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

export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteUserController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    await deleteUserService(id);
    return res.status(204).json({ message: "User removed successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
