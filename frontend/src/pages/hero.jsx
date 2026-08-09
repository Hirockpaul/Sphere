import SideBar from "../components/SideBar.jsx";
import ChatArea from "../components/ChatArea.jsx";
import Artifact from "../components/Artifact.jsx";

function Hero() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-[var(--sphere-bg)] text-[var(--sphere-text)]">
      <SideBar />
      <ChatArea />
      <Artifact />
    </main>
  );
}

export default Hero;
