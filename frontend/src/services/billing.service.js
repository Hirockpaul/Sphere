import api from "../../utils/axios.js";

export async function getBillingPlans() {
  const { data } = await api.get("/billing/plans");
  return data.plans;
}

export async function createBillingOrder(plan) {
  const { data } = await api.post("/billing/create", { plan });
  return data;
}

export async function verifyBillingPayment(payment) {
  const { data } = await api.post("/billing/verify", payment);
  return data;
}

export function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-sphere-razorpay]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.sphereRazorpay = "true";
    script.onload = resolve;
    script.onerror = () => {
      reject(new Error("Unable to load the secure payment window"));
    };
    document.body.appendChild(script);
  });
}
