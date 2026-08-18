import express from "express";
import {
  applyCreditDeduction,
  login,
  logout,
  register,
  updateUserPayment,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/logout", logout);
router.post("/update-plan", updateUserPayment);
router.post("/deduct-credits", applyCreditDeduction);

export default router;
