import { Link } from "react-router-dom";
import SignupForm from "../components/SignupForm.jsx";
import img from "../assets/img.jpg";

function Signup() {
  return (
    <main className="min-h-screen bg-[#070909] text-white lg:grid lg:grid-cols-[55%_45%]">
      <aside className="relative hidden min-h-screen overflow-hidden lg:block">
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
            Find your people.
            <br />
            Share your world.
          </h2>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[500px]">
          <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/50">
              S
            </span>
            <span className="text-xl font-semibold">Sphere</span>
          </Link>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-[#9aa2a9]">
            Sphere&nbsp;&nbsp; Account
          </p>
          <SignupForm />
          <div className="mt-9 border-t border-white/12 pt-8 text-[#aab0b5]">
            Already have an account?{" "}
            <Link to="/" className="font-semibold text-white hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;
