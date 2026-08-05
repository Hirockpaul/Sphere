import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useDispatch } from "react-redux";
import Home from "./pages/home.jsx";
import Signup from "./pages/signup.jsx";
import Hero from "./pages/hero.jsx";
import getCurrentUser from "./features/getCurrentUser.js";
import { setUser } from "./redux/userSlice.js";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        console.log("Current user from /me:", currentUser);
        dispatch(setUser(currentUser));
      } catch {
        dispatch(setUser(null));
      }
    };

    loadUser();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/hero" element={<Hero />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
