import {
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, githubProvider } from "../../utils/firebase.js";
import instance from "../../utils/axios.js";

async function createBackendSession(user, name) {
  const idToken = await user.getIdToken(true);
  const { data } = await instance.post("/auth/register", { idToken, name });
  return data.user;
}

export async function registerWithEmail({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  return createBackendSession(credential.user, name);
}

export async function registerWithGithub() {
  const credential = await signInWithPopup(auth, githubProvider);
  return createBackendSession(
    credential.user,
    credential.user.displayName || "GitHub user",
  );
}

export async function logoutUser() {
  try {
    await instance.get("/auth/logout");
  } finally {
    await signOut(auth);
  }
}
