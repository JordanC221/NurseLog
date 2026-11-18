import { Outlet } from "react-router-dom";
import Sidebar from "@/components/shell/Sidebar";
import TopBar from "@/components/shell/TopBar";
import MobileNav from "@/components/shell/MobileNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="md:pl-[76px] lg:pl-72">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}