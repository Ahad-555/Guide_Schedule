import { useState, useEffect } from "react";
import { Course } from "@workspace/api-client-react/src/generated/api.schemas";

export function useSchedule() {
  const [schedule, setSchedule] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem("college-schedule");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("college-schedule", JSON.stringify(schedule));
  }, [schedule]);

  const addCourse = (course: Course) => {
    if (!schedule.find((c) => c.id === course.id)) {
      setSchedule([...schedule, course]);
    }
  };

  const removeCourse = (id: number) => {
    setSchedule(schedule.filter((c) => c.id !== id));
  };

  return { schedule, addCourse, removeCourse };
}
