import { useState } from "react";
import { Clock, MapPin, BookOpen, Trash2, Plus, X } from "lucide-react";
import { Course } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface CourseCardProps {
  course: Course;
  isScheduled?: boolean;
  onAdd?: (course: Course) => void;
  onRemove?: (id: number) => void;
}

type DrawerType = "room" | "office" | null;

export function CourseCard({ course, isScheduled, onAdd, onRemove }: CourseCardProps) {
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);

  const closeDrawer = () => setOpenDrawer(null);

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
        data-testid={`card-course-${course.id}`}
      >
        {/* Card body */}
        <div className="p-4 sm:p-5">
          {/* Top row: title + college badge */}
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground leading-snug">{course.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{course.instructor}</p>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 bg-primary/10 text-primary border-0 text-xs font-medium"
            >
              {course.college}
            </Badge>
          </div>

          {/* Time + room row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{course.startTime} - {course.endTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{course.room}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 border-t border-border/40">
          {/* Room button */}
          <button
            data-testid={`button-room-${course.id}`}
            onClick={() => setOpenDrawer("room")}
            className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-l border-border/40"
          >
            <MapPin className="w-4 h-4" />
            <span>القاعة</span>
          </button>

          {/* Office button */}
          <button
            data-testid={`button-office-${course.id}`}
            onClick={() => setOpenDrawer("office")}
            className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-l border-border/40"
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
              onClick={() => onAdd?.(course)}
              className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-up drawer overlay */}
      <AnimatePresence>
        {openDrawer !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeDrawer}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto"
              dir="rtl"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  {openDrawer === "room" ? (
                    <MapPin className="w-5 h-5 text-primary" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-primary" />
                  )}
                  <span className="font-bold text-base text-foreground">
                    {openDrawer === "room" ? "معلومات القاعة" : "معلومات المكتب"}
                  </span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Course name pill */}
              <div className="px-5 pt-4">
                <p className="text-xs text-muted-foreground mb-1">المادة</p>
                <p className="font-semibold text-foreground">{course.name}</p>
              </div>

              {/* Content */}
              <div className="px-5 py-5 space-y-4">
                {openDrawer === "room" ? (
                  <>
                    {course.roomDescription ? (
                      <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-primary/15 rounded-lg p-2 mt-0.5 shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">وصف القاعة</p>
                          <p className="text-foreground leading-relaxed">{course.roomDescription}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground text-sm py-4">لم يُضَف وصف للقاعة بعد</p>
                    )}
                  </>
                ) : (
                  <>
                    {course.officeLocation ? (
                      <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-primary/15 rounded-lg p-2 mt-0.5">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">موقع المكتب</p>
                          <p className="font-bold text-primary">{course.officeLocation}</p>
                        </div>
                      </div>
                    ) : null}

                    {course.officeHours ? (
                      <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-3">
                        <div className="bg-primary/15 rounded-lg p-2 mt-0.5">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">ساعات المكتب</p>
                          <p className="font-bold text-primary">{course.officeHours}</p>
                        </div>
                      </div>
                    ) : null}

                    {!course.officeLocation && !course.officeHours && (
                      <p className="text-center text-muted-foreground text-sm py-4">لا تتوفر معلومات المكتب</p>
                    )}
                  </>
                )}
              </div>

              {/* Bottom safe area */}
              <div className="pb-8" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
