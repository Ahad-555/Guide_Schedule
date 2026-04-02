import { useState, useEffect } from "react";

const STORAGE_KEY = "college-schedule-ids";
const OLD_STORAGE_KEY = "college-schedule";

function loadInitialIds(): number[] {
  try {
    // New format: just IDs
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    // Migrate from old format (full course objects)
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const courses = JSON.parse(old) as { id: number }[];
      const ids = courses.map(c => c.id).filter(id => typeof id === "number");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      localStorage.removeItem(OLD_STORAGE_KEY);
      return ids;
    }
  } catch {
    // ignore
  }
  return [];
}

export function useSchedule() {
  const [scheduledIds, setScheduledIds] = useState<number[]>(loadInitialIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledIds));
  }, [scheduledIds]);

  const addCourse = (courseId: number) => {
    setScheduledIds(prev => prev.includes(courseId) ? prev : [...prev, courseId]);
  };

  const removeCourse = (id: number) => {
    setScheduledIds(prev => prev.filter(i => i !== id));
  };

  return { scheduledIds, addCourse, removeCourse };
}
