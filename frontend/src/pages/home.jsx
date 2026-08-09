import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { auth, googleProvider } from "../../utils/firebase.js";
import instance from "../../utils/axios.js";
import { setUser } from "../redux/userSlice.js";
import img from "../assets/img.jpg";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.89A6.02 6.02 0 0 1 6.07 12c0-.66.11-1.3.32-1.89v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.6C7.18 7.74 9.39 5.97 12 5.97Z"
      />
    </svg>
  );
}

function Home() {
  const userData = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState("");
  const [error, setError] = useState("");

  console.log("User data from Redux:", userData);

  const googleLogin = async () => {
    setError("");
    setLoading(true);
    setLoginStep("Opening Google...");

    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      setLoginStep("Starting your session...");
      const idToken = await user.getIdToken();
      const { data } = await instance.post("/auth/login", { idToken });
      dispatch(setUser(data.user));
      navigate("/hero", { replace: true });
    } catch (loginError) {
      const serverUnavailable =
        loginError.code === "ECONNABORTED" ||
        loginError.code === "ERR_NETWORK";

      setError(
        (serverUnavailable &&
          "The Sphere server is unavailable. Start the gateway and auth service, then try again.") ||
          loginError.response?.data?.message ||
          loginError.message ||
          "Google login failed",
      );
    } finally {
      setLoading(false);
      setLoginStep("");
    }
  };

  return (
    <main className="min-h-screen bg-[#070909] text-white lg:grid lg:grid-cols-[55%_45%]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src={img}
          alt="A whale swimming beneath the ocean surface"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/55" />

        <div className="absolute left-12 top-11 flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-black/15 backdrop-blur-sm">
            S
          </span>
          Sphere
        </div>

        <div className="absolute bottom-14 left-12 max-w-xl">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-white/60">
            Connect. Share. Explore.
          </p>
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-5xl">
            Discover a world of ideas.
            <br />
            Sphere brings us together.
          </h2>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[500px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/50">
              S
            </span>
            <span className="text-xl font-semibold">Sphere</span>
          </div>

          <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-[#9aa2a9]">
            Sphere&nbsp;&nbsp; Account
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Log in to Sphere
          </h1>
          <p className="mt-5 text-lg text-[#92999f]">
            Sign in to continue to your dashboard
          </p>

          <button
            type="button"
            onClick={googleLogin}
            disabled={loading}
            className="mt-10 flex h-13 w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-transparent text-base font-semibold transition hover:border-white/35 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? loginStep : "Continue with Google"}
          </button>

          <div className="my-7 flex items-center gap-4 text-sm">
            <span className="h-px flex-1 bg-white/12" />
            <span className="text-white/90">or</span>
            <span className="h-px flex-1 bg-white/12" />
          </div>

          <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-base text-[#aab0b5]">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-13 w-full rounded-lg border border-white/15 bg-transparent px-4 text-white outline-none transition placeholder:text-[#7f878e] focus:border-white/45"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between text-base text-[#aab0b5]">
                Password
                <a href="#forgot-password" className="text-sm text-white underline underline-offset-4">
                  Forgot password?
                </a>
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-13 w-full rounded-lg border border-white/15 bg-transparent px-4 text-white outline-none transition placeholder:text-[#7f878e] focus:border-white/45"
              />
            </label>

            <button
              type="submit"
              className="h-13 w-full rounded-lg bg-[#f1f1f1] font-semibold text-black transition hover:bg-white"
            >
              Sign in
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-9 border-t border-white/12 pt-8 text-[#aab0b5]">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-white hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
