import { useState, useMemo, useEffect } from "react";
import { useListCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Search, Users, ChevronDown, X, Bell, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { useSchedule } from "@/hooks/use-schedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { useNotifications } from "@/hooks/use-notifications";

const DAYS = ["الكل", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const COLLEGES = ["الكل", "تطبيقيه", "حاسبات", "عربي", "صيدلة", "القاعات الزجاجيه"];
const SECTION_KEY = "my-section";

const DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
};

function getTodaySaudi(): string {
  const saudi = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  return DAY_NAMES[saudi.getDay()] ?? "الكل";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodaySaudi());
  const [selectedCollege, setSelectedCollege] = useState("الكل");
  const [mySection, setMySection] = useState<string>(() => {
    try { return localStorage.getItem(SECTION_KEY) ?? ""; } catch { return ""; }
  });
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("notif-enabled") === "1"; } catch { return false; }
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const { data: courses = [], isLoading } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });
  const { scheduledIds, addCourse, removeCourse } = useSchedule();
  const schedule = useMemo(() => courses.filter(c => scheduledIds.includes(c.id)), [courses, scheduledIds]);

  const availableSections = useMemo(() => {
    const s = [...new Set(courses.map(c => c.section).filter(Boolean))] as string[];
    return s.sort();
  }, [courses]);

  useEffect(() => {
    try { localStorage.setItem(SECTION_KEY, mySection); } catch {}
  }, [mySection]);

  useEffect(() => {
    try { localStorage.setItem("notif-enabled", notifEnabled ? "1" : "0"); } catch {}
  }, [notifEnabled]);

  const toggleNotifications = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
      return;
    }
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotifEnabled(true);
      setNotifPermission("granted");
    } else if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === "granted") setNotifEnabled(true);
    }
  };

  useNotifications(courses, mySection, notifEnabled && notifPermission === "granted");

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.name.includes(search) || course.instructor.includes(search);
      const matchesDay = selectedDay === "الكل" || course.day === selectedDay;
      const matchesCollege = selectedCollege === "الكل" || course.college === selectedCollege;
      const matchesSection = !mySection || !course.section || course.section === mySection;
      return matchesSearch && matchesDay && matchesCollege && matchesSection;
    });
  }, [courses, search, selectedDay, selectedCollege, mySection]);

  const groupedCourses = useMemo(() => {
    const grouped: Record<string, typeof courses> = {};
    DAYS.filter(d => d !== "الكل").forEach(day => { grouped[day] = []; });
    filteredCourses.forEach(course => {
      if (grouped[course.day]) grouped[course.day].push(course);
      else grouped[course.day] = [course];
    });
    return grouped;
  }, [filteredCourses]);

  const groupedSchedule = useMemo(() => {
    const grouped: Record<string, typeof courses> = {};
    DAYS.filter(d => d !== "الكل").forEach(day => { grouped[day] = []; });
    schedule.forEach(course => {
      if (grouped[course.day]) grouped[course.day].push(course);
      else grouped[course.day] = [course];
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
              جدولي ({scheduledIds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6 mt-0 outline-none">
            {/* Section picker banner */}
            {availableSections.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSectionPicker(v => !v)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
                    mySection
                      ? "bg-primary/5 border-primary/30 text-primary"
                      : "bg-white border-border/50 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {mySection ? `شعبتك: ${mySection}` : "اختاري شعبتك لتصفية المواد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {mySection && (
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); setMySection(""); setShowSectionPicker(false); }}
                        className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                      >
                        <X className="w-3 h-3 text-primary" />
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSectionPicker ? "rotate-180" : ""}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {showSectionPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 right-0 left-0 z-20 bg-white border border-border/50 rounded-2xl shadow-lg overflow-hidden"
                    >
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground mb-2 px-1">اختاري شعبتك</p>
                        <div className="flex flex-wrap gap-2">
                          {availableSections.map(sec => (
                            <button
                              key={sec}
                              onClick={() => { setMySection(sec); setShowSectionPicker(false); }}
                              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                                mySection === sec
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-primary/8 text-primary hover:bg-primary/15 border border-primary/20"
                              }`}
                            >
                              {sec}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Filters */}
            <div className="space-y-4">
              {/* Colleges */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {COLLEGES.map(college => (
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

              {/* Notifications toggle */}
              {typeof Notification === "undefined" ? (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
                  <Bell className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                  <div className="space-y-1">
                    <p className="font-medium">لتفعيل الإشعارات على الجوال:</p>
                    <p className="text-blue-700">اضغطي على <strong>مشاركة</strong> ثم <strong>أضف إلى الشاشة الرئيسية</strong> — ثم افتحي التطبيق منها</p>
                  </div>
                </div>
              ) : notifPermission === "denied" ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 text-sm">
                  <BellOff className="w-4 h-4 shrink-0" />
                  <span>الإشعارات محظورة — فعّليها من إعدادات المتصفح ثم أعيدي تحميل الصفحة</span>
                </div>
              ) : (
                <button
                  onClick={toggleNotifications}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
                    notifEnabled
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-white border-border/50 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {notifEnabled
                      ? <Bell className="w-4 h-4 shrink-0 text-amber-600" />
                      : <BellOff className="w-4 h-4 shrink-0" />
                    }
                    <span className="text-sm font-medium">
                      {notifEnabled
                        ? "الإشعارات مفعّلة — سيتم تنبيهك قبل 5 دقائق من المحاضرة"
                        : "فعّلي إشعارات بداية المحاضرات"
                      }
                    </span>
                  </div>
                  <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${notifEnabled ? "bg-amber-400" : "bg-muted"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${notifEnabled ? "left-5" : "left-1"}`} />
                  </div>
                </button>
              )}

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
                                isScheduled={scheduledIds.includes(course.id)}
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
