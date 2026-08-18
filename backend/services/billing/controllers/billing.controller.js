import crypto from "node:crypto";
import axios from "axios";
import Payment from "../models/payment.model.js";
import { PLANS } from "../config/plans.js";
import { CREDIT_COSTS } from "../config/credit-costs.js";
import { getRazorpay } from "../config/razorpay.js";

const paidPlans = Object.values(PLANS).filter((plan) => plan.amount > 0);
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:8001";

function getRequestIdentity(req) {
  return {
    userId: req.headers["x-user-id"],
    sessionId: req.headers["x-session-id"],
  };
}

function getAuthHeaders(sessionId) {
  const secret = process.env.BILLING_INTERNAL_SECRET;

  if (!secret) {
    throw new Error("BILLING_INTERNAL_SECRET is not configured");
  }

  return {
    cookie: `sessionId=${encodeURIComponent(sessionId)}`,
    "x-billing-secret": secret,
  };
}

function signaturesMatch(signature, expectedSignature) {
  const supplied = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  return (
    supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected)
  );
}

export const getPlans = (_req, res) => res.status(200).json({ plans: paidPlans });

export const createOrder = async (req, res) => {
  try {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ message: "Payment gateway is not configured" });
    }
    const userId = req.headers["x-user-id"];
    const selectedPlan = PLANS[req.body.plan];

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!selectedPlan || selectedPlan.amount <= 0) {
      return res.status(400).json({ message: "Select a valid paid plan" });
    }

    const checkoutSessionId = crypto.randomUUID();
    const order = await razorpay.orders.create({
      amount: selectedPlan.amount * 100,
      currency: "INR",
      receipt: `sphere-${checkoutSessionId.slice(0, 24)}`,
      notes: {
        userId: String(userId),
        plan: selectedPlan.id,
        checkoutSessionId,
      },
    });

    await Payment.create({
      checkoutSessionId,
      userId,
      orderId: order.id,
      amount: selectedPlan.amount,
      credits: selectedPlan.credits,
      plan: selectedPlan.id,
      currency: order.currency,
    });

    return res.status(201).json({
      checkoutSessionId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      plan: selectedPlan,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create billing order failed:", error);
    return res.status(500).json({ message: "Unable to create payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { userId, sessionId } = getRequestIdentity(req);
    const {
      checkoutSessionId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!userId || !sessionId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!checkoutSessionId || !orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Incomplete payment details" });
    }

    const payment = await Payment.findOne({ checkoutSessionId, orderId, userId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "paid") {
      return res.status(200).json({
        message: "Payment already verified",
        payment,
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!signaturesMatch(signature, expectedSignature)) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const authResponse = await axios.post(
      `${authServiceUrl}/update-plan`,
      {
        userId: payment.userId,
        plan: payment.plan,
        credits: payment.credits,
        checkoutSessionId,
      },
      { headers: getAuthHeaders(sessionId) },
    );

    payment.status = "paid";
    payment.paymentId = paymentId;
    payment.paidAt = new Date();
    await payment.save();
    return res.status(200).json({
      message: "Payment verified",
      payment: {
        id: payment._id,
        checkoutSessionId,
        status: payment.status,
      },
      user: authResponse.data.user,
    });
  } catch (error) {
    console.error("Verify billing payment failed:", error.response?.data || error);
    return res.status(500).json({ message: "Unable to verify payment" });
  }
};

export const deductCredits = async (req, res) => {
  try {
    const { userId, sessionId } = getRequestIdentity(req);
    const agent =
      typeof req.body.agent === "string"
        ? req.body.agent.toLowerCase().trim()
        : "";
    const cost = CREDIT_COSTS[agent];

    if (!userId || !sessionId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!cost) {
      return res.status(400).json({
        message: "Invalid agent",
        supportedAgents: Object.keys(CREDIT_COSTS),
      });
    }

    const { data } = await axios.post(
      `${authServiceUrl}/deduct-credits`,
      { userId, agent, cost },
      {
        headers: getAuthHeaders(sessionId),
      },
    );
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) {
      return res.status(status).json(error.response.data);
    }
    console.error("Billing credit deduction failed:", error.response?.data || error);
    return res.status(500).json({ message: "Unable to deduct credits" });
  }
};
