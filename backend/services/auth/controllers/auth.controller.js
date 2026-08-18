import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import {
  deleteSession,
  getSession,
  saveSession,
} from "../../../shared/redis/session-store.js";

const SESSION_DURATION = 5 * 24 * 60 * 60 * 1000;
const SESSION_DURATION_SECONDS = SESSION_DURATION / 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

async function createUserSession({ idToken, decodedToken, name }) {
  const sessionId = await getAuth(app).createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION,
  });

  const user = await User.findOneAndUpdate(
    { firebaseId: decodedToken.uid },
    {
      name: name || decodedToken.name || "",
      email: decodedToken.email || "",
      avatar: decodedToken.picture || "",
    },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  await saveSession(sessionId, user, SESSION_DURATION_SECONDS);

  return { sessionId, user };
}

function setSessionCookie(res, sessionId) {
  res.cookie("sessionId", sessionId, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_DURATION,
  });
}

export const login = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    const firebaseAuth = getAuth(app);
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { sessionId, user } = await createUserSession({
      idToken,
      decodedToken,
    });
    setSessionCookie(res, sessionId);

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Google login failed:", error);
    return res.status(401).json({ message: "Invalid or expired login token" });
  }
};

export const register = async (req, res) => {
  try {
    const { idToken, name } = req.body;
    const cleanName = typeof name === "string" ? name.trim() : "";

    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required" });
    }

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({ message: "Enter a valid name" });
    }

    const decodedToken = await getAuth(app).verifyIdToken(idToken);

    if (!decodedToken.email) {
      return res.status(400).json({ message: "An email address is required" });
    }

    const { sessionId, user } = await createUserSession({
      idToken,
      decodedToken,
      name: cleanName,
    });
    setSessionCookie(res, sessionId);

    return res.status(201).json({ user });
  } catch (error) {
    console.error("Registration failed:", error);
    return res.status(401).json({ message: "Unable to create account" });
  }
};

export const logout = async (req, res) => {
  const { sessionId } = req.cookies;
  let message = "Logged out successfully";

  try {
    if (sessionId) {
      const firebaseAuth = getAuth(app);
      const decodedSession = await firebaseAuth.verifySessionCookie(
        sessionId,
        true,
      );

      await Promise.all([
        deleteSession(sessionId),
        firebaseAuth.revokeRefreshTokens(decodedSession.uid),
      ]);
    }
  } catch (error) {
    console.error("Logout cleanup failed:", error);
    message = "Logged out locally";
  }

  res.clearCookie("sessionId", COOKIE_OPTIONS);
  return res.status(200).json({ message });
};

export const updateUserPayment = async (req, res) => {
  try {
    const expectedSecret = process.env.BILLING_INTERNAL_SECRET;

    if (!expectedSecret || req.headers["x-billing-secret"] !== expectedSecret) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { plan, credits, userId, checkoutSessionId } = req.body;
    const sessionId = req.cookies?.sessionId;
    const sessionUser = sessionId ? await getSession(sessionId) : null;

    if (
      !sessionUser ||
      String(sessionUser._id || sessionUser.userId) !== String(userId)
    ) {
      return res.status(401).json({ message: "Invalid billing session" });
    }

    const invalidPlanUpdate =
      !checkoutSessionId ||
      !["starter", "pro"].includes(plan) ||
      !Number.isInteger(credits) ||
      credits <= 0;

    if (invalidPlanUpdate) {
      return res.status(400).json({ message: "Invalid plan update" });
    }

    const planDays = plan === "pro" ? 60 : 30;
    const planExpiresAt = new Date(
      Date.now() + planDays * 24 * 60 * 60 * 1000,
    );
    let user = await User.findOneAndUpdate(
      { _id: userId, processedPaymentSessions: { $ne: checkoutSessionId } },
      {
        $set: { plan, planExpiresAt },
        $inc: { credits, totalCredits: credits },
        $addToSet: { processedPaymentSessions: checkoutSessionId },
      },
      { new: true, runValidators: true },
    );
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await saveSession(sessionId, user, SESSION_DURATION_SECONDS);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Update user payment failed:", error);
    return res.status(500).json({ message: "Unable to update user plan" });
  }
};

export const applyCreditDeduction = async (req, res) => {
  try {
    const expectedSecret = process.env.BILLING_INTERNAL_SECRET;

    if (!expectedSecret || req.headers["x-billing-secret"] !== expectedSecret) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const sessionId = req.cookies?.sessionId;
    const { userId, agent, cost } = req.body;

    if (!sessionId || !userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!agent || !Number.isInteger(cost) || cost <= 0) {
      return res.status(400).json({ message: "Invalid deduction" });
    }

    const sessionUser = await getSession(sessionId);

    if (
      !sessionUser ||
      String(sessionUser._id || sessionUser.userId) !== String(userId)
    ) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, credits: { $gte: cost } },
      { $inc: { credits: -cost } },
      { new: true, runValidators: true },
    );

    if (!user) {
      const existingUser = await User.findById(userId).select("credits");

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(402).json({
        message: "Insufficient credits",
        required: cost,
        credits: existingUser.credits,
      });
    }

    await saveSession(sessionId, user, SESSION_DURATION_SECONDS);
    return res.status(200).json({
      success: true,
      agent,
      deducted: cost,
      credits: user.credits,
      user,
    });
  } catch (error) {
    console.error("Credit deduction failed:", error);
    return res.status(500).json({ message: "Unable to deduct credits" });
  }
};
