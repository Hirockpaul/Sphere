import { getSession } from "../../shared/redis/session-store.js";

const protect = async (req, res, next) => {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await getSession(sessionId);

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Session validation failed:", error);
    return res.status(503).json({ message: "Unable to validate session" });
  }
};

export default protect;
export { protect };
