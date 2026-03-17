import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Leagues() {
  // Mock session for styling toggle - change to 'false' to see the logged-out state
  const isDemoLoggedIn = false; 

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-400 selection:text-black font-sans">
      {/* Navigation */}
      <Navbar />
    </div>
  );
}