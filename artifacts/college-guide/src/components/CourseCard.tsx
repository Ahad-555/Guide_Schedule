import { useState, useEffect } from "react";
import { Clock, MapPin, BookOpen, Trash2, Plus, X, Users, Radio } from "lucide-react";
import { Course } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface CourseCardProps {
  course: Course;
  isScheduled?: boolean;
  onAdd?: (id: number) => void;
  onRemove?: (id: number) => void;
}

type DrawerType = "room" | "office" | null;

const DAY_INDEX: Record<string, number> = {
  "الأحد": 0,
  "الاثنين": 1,
  "الثلاثاء": 2,
  "الأربعاء": 3,
  "الخميس": 4,
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getNowSaudi(): { dayIndex: number; minutes: number } {
  const now = new Date();
  const saudi = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  return {
    dayIndex: saudi.getDay(),
    minutes: saudi.getHours() * 60 + saudi.getMinutes(),
  };
}

function isLiveNow(course: Course, now: { dayIndex: number; minutes: number }): boolean {
  const courseDayIndex = DAY_INDEX[course.day];
  if (courseDayIndex === undefined) return false;
  if (courseDayIndex !== now.dayIndex) return false;
  const start = toMinutes(course.startTime);
  const end = toMinutes(course.endTime);
  return now.minutes >= start && now.minutes < end;
}

function useNow() {
  const [now, setNow] = useState(getNowSaudi);
  useEffect(() => {
    const id = setInterval(() => setNow(getNowSaudi()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function CourseCard({ course, isScheduled, onAdd, onRemove }: CourseCardProps) {
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
  const now = useNow();
  const live = isLiveNow(course, now);

  const closeDrawer = () => setOpenDrawer(null);

  return (
    <>
      <div
        className={`rounded-2xl border shadow-sm transition-all duration-300 overflow-hidden ${
          live
            ? "bg-white border-green-400 shadow-green-200 shadow-md ring-2 ring-green-300 ring-offset-1"
            : "bg-white border-border/50 hover:shadow-md"
        }`}
        data-testid={`card-course-${course.id}`}
      >
        {/* Live now banner */}
        {live && (
          <div className="flex items-center justify-center gap-2 bg-green-500 px-4 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span className="text-white text-xs font-bold tracking-wide">الآن في القاعة</span>
          </div>
        )}

        {/* Card body */}
        <div className="p-4 sm:p-5">
          {/* Top row: title + college badge */}
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold text-base leading-snug ${live ? "text-green-800" : "text-foreground"}`}>
                {course.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{course.instructor}</p>
            </div>
            <Badge
              variant="secondary"
              className={`shrink-0 border-0 text-xs font-medium ${
                live ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
              }`}
            >
              {course.college}
            </Badge>
          </div>

          {/* Time + room + section row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <div className={`flex items-center gap-1.5 ${live ? "text-green-700 font-medium" : ""}`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>{course.startTime} - {course.endTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{course.room}</span>
            </div>
            {course.section && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>{course.section}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className={`grid grid-cols-3 border-t ${live ? "border-green-200" : "border-border/40"}`}>
          {/* Room button */}
          <button
            data-testid={`button-room-${course.id}`}
            onClick={() => setOpenDrawer("room")}
            className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-l ${
              live
                ? "text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                : "text-primary bg-primary/5 hover:bg-primary/10 border-border/40"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>القاعة</span>
          </button>

          {/* Office button */}
          <button
            data-testid={`button-office-${course.id}`}
            onClick={() => setOpenDrawer("office")}
            className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-l ${
              live
                ? "text-green-700 bg-green-50 hover:bg-green-100 border-green-200"
                : "text-primary bg-primary/5 hover:bg-primary/10 border-border/40"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>المكتب</span>
          </button>

          {/* Add / Remove button */}
          {isScheduled ? (
            <button
              data-testid={`button-remove-${course.id}`}
              onClick={() => onRemove?.(course.id)}
              className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>إزالة</span>
            </button>
          ) : (
            <button
              data-testid={`button-add-${course.id}`}
              onClick={() => onAdd?.(course.id)}
              className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-white transition-colors ${
                live ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-up drawer */}
      <AnimatePresence>
        {openDrawer !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={closeDrawer}
            />

            {/* Sheet — full-width on mobile, capped on wider screens */}
            <motion.div
              key="drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 inset-x-0 z-50 flex justify-center items-end pointer-events-none"
              dir="rtl"
            >
              <div
                className="
                  pointer-events-auto
                  w-full
                  sm:max-w-sm
                  bg-white
                  rounded-t-3xl
                  shadow-2xl
                  flex flex-col
                  max-h-[60vh]
                "
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1.5 rounded-full bg-muted" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0">
                  <div className="flex items-center gap-2">
                    {openDrawer === "room"
                      ? <MapPin className="w-5 h-5 text-primary" />
                      : <BookOpen className="w-5 h-5 text-primary" />
                    }
                    <span className="font-bold text-base">
                      {openDrawer === "room" ? "معلومات القاعة" : "معلومات المكتب"}
                    </span>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                  {/* Course label */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                      {course.name}
                    </span>
                  </div>

                  {openDrawer === "room" ? (
                    course.roomDescription ? (
                      <div className="bg-primary/5 rounded-2xl p-4 flex items-start gap-3">
                        <div className="bg-primary/15 rounded-xl p-2 shrink-0 mt-0.5">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">وصف القاعة</p>
                          <p className="text-foreground leading-relaxed text-sm">{course.roomDescription}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        لم يُضَف وصف للقاعة بعد
                      </div>
                    )
                  ) : (
                    <>
                      {course.officeLocation ? (
                        <div className="bg-primary/5 rounded-2xl p-4 flex items-start gap-3">
                          <div className="bg-primary/15 rounded-xl p-2 shrink-0 mt-0.5">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">موقع المكتب</p>
                            <p className="font-semibold text-primary text-sm">{course.officeLocation}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          لا يتوفر موقع مكتب
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* iOS safe area */}
                <div className="shrink-0 pb-safe pb-6" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
