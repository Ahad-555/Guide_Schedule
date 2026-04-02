import { Clock, MapPin, BookOpen, Trash2, Plus } from "lucide-react";
import { Course } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  course: Course;
  isScheduled?: boolean;
  onAdd?: (course: Course) => void;
  onRemove?: (id: number) => void;
}

export function CourseCard({ course, isScheduled, onAdd, onRemove }: CourseCardProps) {
  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-4 sm:p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-primary mb-1">{course.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px]">د</span>
              {course.instructor}
            </p>
          </div>
          <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20 whitespace-nowrap">
            {course.college}
          </Badge>
        </div>

        <div className="space-y-2 mb-6 text-sm">
          <div className="flex items-center gap-2 text-foreground/80">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{course.startTime} - {course.endTime}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-foreground/80">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>القاعة: {course.room}</span>
            </div>
            {(course.officeHours || course.officeLocation) && (
              <div className="flex items-center gap-2 border-r border-border/50 pr-4 sm:border-r-0 sm:pr-0 sm:border-l sm:pl-4">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="truncate max-w-[150px]" title={`${course.officeLocation} - ${course.officeHours}`}>
                  المكتب: {course.officeLocation}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border/40">
          {isScheduled ? (
            <Button
              variant="destructive"
              className="w-full font-medium"
              onClick={() => onRemove?.(course.id)}
            >
              <Trash2 className="w-4 h-4 mr-2 ml-2" />
              إزالة من جدولي
            </Button>
          ) : (
            <Button
              variant="default"
              className="w-full font-medium bg-primary hover:bg-primary/90"
              onClick={() => onAdd?.(course)}
            >
              <Plus className="w-4 h-4 mr-2 ml-2" />
              إضافة للجدول
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
