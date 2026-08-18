import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  checkoutSessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  orderId: { type: String, required: true, unique: true, index: true },
  paymentId: { type: String, sparse: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: "INR" },
  credits: { type: Number, required: true, min: 1 },
  plan: { type: String, required: true },
  status: { type: String, enum: ["created", "paid", "failed"], default: "created", index: true },
  paidAt: Date,
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
