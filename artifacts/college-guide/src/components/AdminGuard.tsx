import { useState, useEffect } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const ADMIN_PASSWORD = "ahd2026";
const STORAGE_KEY = "admin_auth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setAuthed(true);
    }
    setChecked(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  };

  if (!checked) return null;

  if (authed) return <>{children}</>;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{ fontFamily: "'Tajawal', sans-serif" }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="bg-primary px-6 py-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-bold text-xl">لوحة التحكم</h1>
            <p className="text-white/70 text-sm mt-1">دليل كليتي التفاعلي</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-8 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">كلمة المرور</label>
            <Input
              type="password"
              placeholder="أدخلي كلمة المرور..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
              data-testid="input-admin-password"
              autoFocus
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {error && (
              <p className="text-destructive text-sm">كلمة المرور غير صحيحة</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            data-testid="button-admin-login"
          >
            دخول
          </Button>
          <Link href="/">
            <Button type="button" variant="ghost" className="w-full text-muted-foreground gap-2">
              <ArrowRight className="w-4 h-4" />
              رجوع للرئيسية
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}
