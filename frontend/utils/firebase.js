// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "sphere-fb15b.firebaseapp.com",
  projectId: "sphere-fb15b",
  storageBucket: "sphere-fb15b.firebasestorage.app",
  messagingSenderId: "121111921773",
  appId: "1:121111921773:web:a1089ed6a04184b370ab64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { auth, githubProvider, googleProvider };
