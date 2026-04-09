import { useEffect, useRef, useCallback } from "react";
import { Course } from "@workspace/api-client-react/src/generated/api.schemas";

const DAY_INDEX: Record<string, number> = {
  "الأحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الخميس": 4,
};

function getNowSaudi() {
  const saudi = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  return { dayIndex: saudi.getDay(), minutes: saudi.getHours() * 60 + saudi.getMinutes() };
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function useNotifications(
  courses: Course[],
  mySection: string,
  enabled: boolean,
) {
  const firedRef = useRef<Set<string>>(new Set());

  const checkAndNotify = useCallback(() => {
    if (!enabled || Notification.permission !== "granted") return;

    const now = getNowSaudi();
    const todayCourses = courses.filter(c => {
      const dayMatch = DAY_INDEX[c.day] === now.dayIndex;
      const sectionMatch = !mySection || !c.section || c.section === mySection;
      return dayMatch && sectionMatch;
    });

    for (const course of todayCourses) {
      const start = toMinutes(course.startTime);
      const diff = start - now.minutes;

      // Notify at exactly 5 minutes before
      if (diff === 5 || diff === 0) {
        const key = `${course.id}-${diff}`;
        if (!firedRef.current.has(key)) {
          firedRef.current.add(key);
          const title = diff === 5
            ? `⏰ محاضرة خلال 5 دقائق`
            : `🔔 بدأت المحاضرة الآن`;
          const body = `${course.name} — ${course.instructor}\n📍 ${course.room}${course.section ? ` · ${course.section}` : ""}`;
          new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag: key,
            renotify: false,
          });
        }
      }
    }

    // Clear old fired keys at midnight
    if (now.minutes === 0 && now.dayIndex !== undefined) {
      firedRef.current.clear();
    }
  }, [courses, mySection, enabled]);

  useEffect(() => {
    if (!enabled) return;
    checkAndNotify();
    const id = setInterval(checkAndNotify, 60_000);
    return () => clearInterval(id);
  }, [enabled, checkAndNotify]);
}
