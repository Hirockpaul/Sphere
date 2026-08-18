import express from "express";
import {
  createOrder,
  deductCredits,
  getPlans,
  verifyPayment,
} from "../controllers/billing.controller.js";

const router = express.Router();

router.get("/plans", getPlans);
router.post("/create", createOrder);
router.post("/verify", verifyPayment);
router.post("/deduct", deductCredits);

export default router;
