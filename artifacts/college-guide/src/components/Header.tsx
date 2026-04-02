import { GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export function Header() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="bg-white/20 p-2 rounded-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg leading-tight">دليل كليتي التفاعلي</h1>
            <span className="text-xs text-primary-foreground/80">MIS | عهد الشمري</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm font-medium bg-black/10 px-3 py-1.5 rounded-full">
            {time}
          </div>
          <Link href="/admin" className="text-xs opacity-50 hover:opacity-100 transition-opacity">
            لوحة التحكم
          </Link>
        </div>
      </div>
    </header>
  );
}
