import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail } from "../services/auth.service.js";

function getErrorMessage(error) {
  const firebaseMessages = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password must contain at least six characters.",
    "auth/account-exists-with-different-credential":
      "This email is already registered with another sign-in method.",
  };

  return (
    error.response?.data?.message ||
    firebaseMessages[error.code] ||
    error.message ||
    "Unable to create your account."
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const finishRegistration = async (register) => {
    setError("");
    setLoading(true);

    try {
      await register();
      navigate("/", { replace: true });
    } catch (registrationError) {
      setError(getErrorMessage(registrationError));
    } finally {
      setLoading(false);
    }
  };

  const submitEmailSignup = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Enter your name.");
      return;
    }

    finishRegistration(() =>
      registerWithEmail({ ...form, name: form.name.trim() }),
    );
  };

  return (
    <div className="w-full max-w-[500px]">
      <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
        Create Account
      </h1>
      <p className="mt-5 text-lg text-[#92999f]">
        Create your account with your email address
      </p>

      <form onSubmit={submitEmailSignup} className="mt-10 space-y-5">
        <label className="block">
          <span className="mb-2 block text-base text-[#aab0b5]">Name</span>
          <input
            required
            name="name"
            value={form.name}
            onChange={updateField}
            autoComplete="name"
            placeholder="Mira Okonkwo"
            className="h-13 w-full rounded-lg border border-white/15 bg-transparent px-4 outline-none transition placeholder:text-[#7f878e] focus:border-white/45"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base text-[#aab0b5]">Email</span>
          <input
            required
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            placeholder="you@example.com"
            className="h-13 w-full rounded-lg border border-white/15 bg-transparent px-4 outline-none transition placeholder:text-[#7f878e] focus:border-white/45"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-base text-[#aab0b5]">Password</span>
          <input
            required
            minLength="6"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-13 w-full rounded-lg border border-white/15 bg-transparent px-4 outline-none transition placeholder:text-[#7f878e] focus:border-white/45"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-13 w-full rounded-lg bg-[#f1f1f1] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default SignupForm;
