import { useState } from "react";
import SideBar from "../components/SideBar.jsx";
import ChatArea from "../components/ChatArea.jsx";
import Artifact from "../components/Artifact.jsx";

function Hero() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-[var(--sphere-bg)] text-[var(--sphere-text)]">
      <SideBar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <ChatArea onOpenSidebar={() => setSidebarOpen(true)} />
      <Artifact />
    </main>
  );
}

export default Hero;
