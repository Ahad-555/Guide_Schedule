import { useState, useMemo } from "react";
import { useListCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { useSchedule } from "@/hooks/use-schedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";

const DAYS = ["الكل", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("الكل");
  const [selectedCollege, setSelectedCollege] = useState("الكل");

  const { data: courses = [], isLoading } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });
  const { schedule, addCourse, removeCourse } = useSchedule();

  const colleges = useMemo(() => {
    const unique = new Set(courses.map(c => c.college).filter(Boolean));
    return ["الكل", ...Array.from(unique)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.name.includes(search) || course.instructor.includes(search);
      const matchesDay = selectedDay === "الكل" || course.day === selectedDay;
      const matchesCollege = selectedCollege === "الكل" || course.college === selectedCollege;
      return matchesSearch && matchesDay && matchesCollege;
    });
  }, [courses, search, selectedDay, selectedCollege]);

  const groupedCourses = useMemo(() => {
    const grouped: Record<string, typeof courses> = {};
    DAYS.filter(d => d !== "الكل").forEach(day => {
      grouped[day] = [];
    });
    
    filteredCourses.forEach(course => {
      if (grouped[course.day]) {
        grouped[course.day].push(course);
      } else {
        grouped[course.day] = [course];
      }
    });
    
    return grouped;
  }, [filteredCourses]);

  const groupedSchedule = useMemo(() => {
    const grouped: Record<string, typeof courses> = {};
    DAYS.filter(d => d !== "الكل").forEach(day => {
      grouped[day] = [];
    });
    
    schedule.forEach(course => {
      if (grouped[course.day]) {
        grouped[course.day].push(course);
      } else {
        grouped[course.day] = [course];
      }
    });
    
    return grouped;
  }, [schedule]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1">
            <TabsTrigger value="discover" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
              استكشاف
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
              جدولي ({schedule.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6 mt-0 outline-none">
            {/* Filters */}
            <div className="space-y-4">
              {/* Colleges */}
              {colleges.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {colleges.map(college => (
                    <Button
                      key={college}
                      variant={selectedCollege === college ? "default" : "outline"}
                      size="sm"
                      className="rounded-full snap-start whitespace-nowrap"
                      onClick={() => setSelectedCollege(college)}
                    >
                      {college}
                    </Button>
                  ))}
                </div>
              )}

              {/* Days */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {DAYS.map(day => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
                    size="sm"
                    className="rounded-full snap-start whitespace-nowrap"
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="search"
                  placeholder="ابحثي عن دكتور/ة أو المادة..."
                  className="pl-10 pr-10 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد مواد مطابقة للبحث</div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedCourses).map(([day, dayCourses]) => {
                  if (dayCourses.length === 0) return null;
                  
                  return (
                    <div key={day} className="space-y-4">
                      <h2 className="font-bold text-xl flex items-center gap-2 text-primary border-b border-border/50 pb-2">
                        <span className="text-primary text-xs">●</span> 
                        {day} <span className="text-muted-foreground text-sm font-normal">({dayCourses.length})</span>
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                          {dayCourses.map(course => (
                            <motion.div
                              key={course.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CourseCard 
                                course={course} 
                                isScheduled={schedule.some(c => c.id === course.id)}
                                onAdd={addCourse}
                                onRemove={removeCourse}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6 mt-0 outline-none">
            {schedule.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center">
                <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">جدولك فارغ</h3>
                <p className="text-muted-foreground max-w-sm text-center">
                  تصفحي المواد من علامة التبويب "استكشاف" وأضيفيها هنا لبناء جدولك الخاص.
                </p>
                <Button 
                  className="mt-6 bg-primary hover:bg-primary/90" 
                  onClick={() => setActiveTab("discover")}
                >
                  تصفح المواد
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedSchedule).map(([day, dayCourses]) => {
                  if (dayCourses.length === 0) return null;
                  
                  return (
                    <div key={day} className="space-y-4">
                      <h2 className="font-bold text-xl flex items-center gap-2 text-primary border-b border-border/50 pb-2">
                        <span className="text-primary text-xs">●</span> 
                        {day} <span className="text-muted-foreground text-sm font-normal">({dayCourses.length})</span>
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                          {dayCourses.map(course => (
                            <motion.div
                              key={course.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CourseCard 
                                course={course} 
                                isScheduled={true}
                                onAdd={addCourse}
                                onRemove={removeCourse}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/50 mt-auto bg-white/50">
        دليل كليتي التفاعلي — عهد الشمري © 2026
      </footer>
    </div>
  );
}
