import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import {
  deleteSession,
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

  await saveSession(
    sessionId,
    user,
    SESSION_DURATION_SECONDS,
  );

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
