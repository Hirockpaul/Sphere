import { Crown, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../redux/userSlice.js";
import {
  createBillingOrder,
  getBillingPlans,
  loadRazorpay,
  verifyBillingPayment,
} from "../services/billing.service.js";

function BillingModal({ onClose }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const [plans, setPlans] = useState([]);
  const [busyPlan, setBusyPlan] = useState("");
  const [error, setError] = useState("");
  const credits = user?.credits ?? 0;
  const totalCredits = Math.max(user?.totalCredits ?? 100, credits, 1);
  const creditPercent = Math.min(
    100,
    Math.round((credits / totalCredits) * 100),
  );

  useEffect(() => {
    getBillingPlans()
      .then(setPlans)
      .catch((requestError) => {
        setError(
          requestError.response?.data?.message || "Unable to load plans",
        );
      });
  }, []);

  const purchase = async (plan) => {
    setBusyPlan(plan.id);
    setError("");
    try {
      await loadRazorpay();
      const checkout = await createBillingOrder(plan.id);
      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.order.amount,
        currency: checkout.order.currency,
        name: "Sphere",
        description: `${checkout.plan.name} plan · ${checkout.plan.credits} credits`,
        order_id: checkout.order.id,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#6d5dfb" },
        modal: { ondismiss: () => setBusyPlan("") },
        handler: async (response) => {
          try {
            const result = await verifyBillingPayment({
              ...response,
              checkoutSessionId: checkout.checkoutSessionId,
            });
            dispatch(setUser(result.user));
            onClose();
          } catch (requestError) {
            setError(
              requestError.response?.data?.message ||
                "Payment verification failed. Please contact support.",
            );
          } finally {
            setBusyPlan("");
          }
        },
      });
      razorpay.on("payment.failed", (response) => {
        setError(
          response.error?.description ||
            "Payment failed. No credits were added.",
        );
        setBusyPlan("");
      });
      razorpay.open();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to start checkout",
      );
      setBusyPlan("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ml-auto flex h-full w-full max-w-[390px] flex-col border-l border-white/[0.09] bg-[#0d0f16] shadow-[-24px_0_70px_rgba(0,0,0,0.45)]">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-5">
          <div>
            <h2
              id="billing-title"
              className="text-[17px] font-semibold text-white"
            >
              Billing
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Plans &amp; Credits
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.09] hover:text-white"
            aria-label="Close billing"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] [scrollbar-color:#303442_transparent]">
          <div className="rounded-xl border border-white/[0.08] bg-[#171920] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-slate-400">Current Plan</p>
                <p className="mt-0.5 text-[19px] font-semibold lowercase text-white">
                  {user?.plan || "free"}
                </p>
              </div>
              <Crown size={23} className="text-yellow-400" />
            </div>
            <div className="mt-5 flex items-center justify-between text-[12px] text-slate-400">
              <span>Credits</span>
              <span>{credits}/{totalCredits}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#282b35]">
              <div
                className="h-full rounded-full bg-[#6657ff] transition-[width] duration-300"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-5">
            {plans.map((plan) => {
              const isCurrentPlan = user?.plan === plan.id;
              const isOpening = busyPlan === plan.id;
              const buttonLabel = isCurrentPlan
                ? "Current Plan"
                : isOpening
                  ? "Opening checkout…"
                  : "Upgrade";

              return (
                <article
                  key={plan.id}
                  className="rounded-xl border border-white/[0.08] bg-[#0f1118] p-4"
                >
                  <h3 className="text-[15px] font-semibold text-white">
                    {plan.name} Plan
                  </h3>
                  <p className="mt-3 text-[23px] font-semibold text-[#8b82ff]">
                    ₹{plan.amount}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {plan.credits.toLocaleString()} Credits
                  </p>
                  <button
                    type="button"
                    disabled={Boolean(busyPlan) || isCurrentPlan}
                    onClick={() => purchase(plan)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5138ff] px-4 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#624cff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isOpening && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    {buttonLabel}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="px-3 py-5 text-center text-[11px] leading-relaxed text-slate-600">
            Payments are securely processed by Razorpay. Credits are added after
            server verification.
          </p>
        </div>
      </section>
    </div>
  );
}

export default BillingModal;
