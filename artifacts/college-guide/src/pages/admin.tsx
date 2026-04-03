import { useState, useEffect, useRef, Fragment } from "react";
import { useListCourses, useBulkCreateCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Course, BulkCourseItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, CloudOff, CheckCircle2, RotateCcw } from "lucide-react";
import { Link } from "wouter";

const DRAFT_KEY = "admin-courses-draft";
const COLLEGES = ["الكل", "تطبيقيه", "حاسبات", "عربي", "صيدلة", "القاعات الزجاجيه"];
const COLLEGE_OPTIONS = COLLEGES.filter(c => c !== "الكل");

type LocalCourse = Partial<Course & { _tempId: string; roomDescription?: string }>;

function loadDraft(): LocalCourse[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only return draft if it has actual content
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(courses: LocalCourse[]) {
  try {
    if (courses.length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(courses));
    }
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function Admin() {
  const { data: courses = [], isLoading } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });
  const bulkCreate = useBulkCreateCourses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [localCourses, setLocalCourses] = useState<LocalCourse[]>([]);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [activeCollege, setActiveCollege] = useState("الكل");
  const initializedRef = useRef(false);

  // Single reliable initialization: wait for server data, prefer draft if user edited
  useEffect(() => {
    if (initializedRef.current) return;
    if (isLoading) return; // wait until server responds

    const draft = loadDraft();
    if (draft) {
      // User had unsaved work — restore it
      setLocalCourses(draft);
      setUserHasEdited(true);
    } else {
      // Fresh start from server data
      setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
      setUserHasEdited(false);
    }
    initializedRef.current = true;
  }, [isLoading, courses]);

  // Auto-save draft ONLY when the user has actually made edits (not on init from server)
  useEffect(() => {
    if (!initializedRef.current || !userHasEdited) return;
    if (localCourses.length === 0) return; // never overwrite with empty
    saveDraft(localCourses);
    setDraftSavedAt(new Date());
  }, [localCourses, userHasEdited]);

  const discardDraft = () => {
    clearDraft();
    setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
    setUserHasEdited(false);
    setDraftSavedAt(null);
    toast({ title: "تم تجاهل التغييرات", description: "تمت استعادة البيانات المحفوظة من الخادم." });
  };

  const addRow = () => {
    setUserHasEdited(true);
    setLocalCourses(prev => [
      ...prev,
      {
        _tempId: Math.random().toString(36).substring(7),
        name: "",
        instructor: "",
        college: activeCollege !== "الكل" ? activeCollege : "",
        day: "الأحد",
        startTime: "",
        endTime: "",
        room: "",
        roomDescription: "",
        officeHours: "",
        officeLocation: ""
      }
    ]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    setUserHasEdited(true);
    setLocalCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeRow = (index: number) => {
    setUserHasEdited(true);
    setLocalCourses(prev => prev.filter((_, i) => i !== index));
  };

  const saveAll = () => {
    const validCourses = localCourses.filter(c => c.name && c.instructor && c.college && c.day && c.startTime && c.endTime && c.room);

    if (validCourses.length !== localCourses.length) {
      toast({
        title: "بيانات ناقصة",
        description: "تم تجاهل الصفوف التي لا تحتوي على جميع البيانات الأساسية.",
        variant: "destructive"
      });
    }

    if (validCourses.length === 0) {
      toast({ title: "لا توجد بيانات", description: "أضيفي المواد أولاً.", variant: "destructive" });
      return;
    }

    const payload: BulkCourseItem[] = validCourses.map(c => ({
      ...(c.id != null ? { id: c.id } : {}),
      name: c.name!,
      instructor: c.instructor!,
      college: c.college!,
      day: c.day!,
      startTime: c.startTime!,
      endTime: c.endTime!,
      room: c.room!,
      roomDescription: c.roomDescription || undefined,
      officeHours: c.officeHours,
      officeLocation: c.officeLocation
    }));

    bulkCreate.mutate({ data: { courses: payload } }, {
      onSuccess: () => {
        clearDraft();
        setUserHasEdited(false);
        setDraftSavedAt(null);
        toast({ title: "✓ تم الحفظ بنجاح", description: `تم نشر ${payload.length} مادة للطالبات.` });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey({}) });
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ البيانات، جربي مرة أخرى.", variant: "destructive" });
      }
    });
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  const visibleCourses = activeCollege === "الكل"
    ? localCourses
    : localCourses.filter(c => c.college === activeCollege);

  const visibleIndices = activeCollege === "الكل"
    ? localCourses.map((_, i) => i)
    : localCourses.map((c, i) => c.college === activeCollege ? i : -1).filter(i => i !== -1);

  const collegeCount = (col: string) =>
    col === "الكل" ? localCourses.length : localCourses.filter(c => c.college === col).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-4">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">إدارة المواد</h1>
              <p className="text-muted-foreground text-sm">لوحة التحكم الخاصة بإضافة وتعديل المواد.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline">العودة للرئيسية</Button>
              </Link>
              {userHasEdited && (
                <Button variant="ghost" size="sm" onClick={discardDraft} className="text-muted-foreground gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  تجاهل التغييرات
                </Button>
              )}
              <Button onClick={saveAll} className="bg-primary hover:bg-primary/90" disabled={bulkCreate.isPending}>
                <Save className="w-4 h-4 ml-2" />
                {bulkCreate.isPending ? "جاري الحفظ..." : "حفظ الكل"}
              </Button>
            </div>
          </div>

          {/* Status banner */}
          {userHasEdited ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span>
                لديكِ تغييرات غير محفوظة للطالبات
                {draftSavedAt && <span className="text-amber-600 mr-1">— حُفظت مؤقتاً الساعة {formatTime(draftSavedAt)}</span>}
              </span>
              <span className="mr-auto text-amber-600 text-xs font-medium">اضغطي "حفظ الكل" لنشرها</span>
            </div>
          ) : localCourses.length > 0 ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>كل البيانات منشورة للطالبات</span>
            </div>
          ) : null}

          {/* College filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {COLLEGES.map(col => {
              const count = collegeCount(col);
              const isGlass = col === "القاعات الزجاجيه";
              const isActive = activeCollege === col;
              return (
                <button
                  key={col}
                  onClick={() => setActiveCollege(col)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    isActive
                      ? isGlass ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-primary text-white border-primary shadow-sm"
                      : isGlass ? "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100" : "bg-white text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  {col}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
            {activeCollege === "القاعات الزجاجيه" && (
              <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 text-teal-800 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                عرض مواد القاعات الزجاجيه فقط ({visibleCourses.length} مادة)
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[150px]">اسم المادة</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[150px]">الدكتور/ة</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[150px]">الكلية</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">اليوم</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">وقت البداية</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">وقت النهاية</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">القاعة</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[180px]">وصف القاعة</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">ساعات المكتب</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">موقع المكتب</th>
                    <th className="px-4 py-3 font-medium w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && localCourses.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
                  ) : visibleCourses.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                      لا توجد مواد{activeCollege !== "الكل" ? ` في ${activeCollege}` : ""}. اضغطي "إضافة" للبدء.
                    </td></tr>
                  ) : (
                    visibleCourses.map((course, vi) => {
                      const realIndex = visibleIndices[vi];
                      const prevInstructor = vi > 0 ? visibleCourses[vi - 1].instructor : null;
                      const isNewInstructor = course.instructor && course.instructor !== prevInstructor;
                      const instructorCourseCount = course.instructor
                        ? visibleCourses.filter(c => c.instructor === course.instructor).length
                        : 0;
                      return (
                        <Fragment key={course._tempId || realIndex}>
                          {isNewInstructor && (
                            <tr className="bg-primary/5 border-t-2 border-primary/20">
                              <td colSpan={11} className="px-4 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-5 rounded-full bg-primary/50 shrink-0" />
                                  <span className="font-semibold text-primary text-sm">{course.instructor || "—"}</span>
                                  <span className="text-xs text-muted-foreground bg-white border border-border px-2 py-0.5 rounded-full">
                                    {instructorCourseCount} {instructorCourseCount === 1 ? "مادة" : "مواد"}
                                  </span>
                                  <div className="flex-1 h-px bg-primary/10" />
                                </div>
                              </td>
                            </tr>
                          )}
                        <tr className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2"><Input value={course.name || ""} onChange={(e) => updateRow(realIndex, "name", e.target.value)} className="h-8 min-w-[150px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input value={course.instructor || ""} onChange={(e) => updateRow(realIndex, "instructor", e.target.value)} className="h-8 min-w-[150px] bg-transparent" /></td>
                          <td className="px-2 py-2">
                            <select value={course.college || ""} onChange={(e) => updateRow(realIndex, "college", e.target.value)}
                              className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[130px]">
                              <option value="" disabled>اختاري الكلية</option>
                              {COLLEGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select value={course.day || "الأحد"} onChange={(e) => updateRow(realIndex, "day", e.target.value)}
                              className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <option value="الأحد">الأحد</option>
                              <option value="الاثنين">الاثنين</option>
                              <option value="الثلاثاء">الثلاثاء</option>
                              <option value="الأربعاء">الأربعاء</option>
                              <option value="الخميس">الخميس</option>
                            </select>
                          </td>
                          <td className="px-2 py-2"><Input type="time" value={course.startTime || ""} onChange={(e) => updateRow(realIndex, "startTime", e.target.value)} className="h-8 min-w-[100px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input type="time" value={course.endTime || ""} onChange={(e) => updateRow(realIndex, "endTime", e.target.value)} className="h-8 min-w-[100px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input value={course.room || ""} onChange={(e) => updateRow(realIndex, "room", e.target.value)} className="h-8 min-w-[100px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input value={course.roomDescription || ""} onChange={(e) => updateRow(realIndex, "roomDescription", e.target.value)} placeholder="وصف موقع القاعة..." className="h-8 min-w-[180px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input value={course.officeHours || ""} onChange={(e) => updateRow(realIndex, "officeHours", e.target.value)} className="h-8 min-w-[120px] bg-transparent" /></td>
                          <td className="px-2 py-2"><Input value={course.officeLocation || ""} onChange={(e) => updateRow(realIndex, "officeLocation", e.target.value)} className="h-8 min-w-[120px] bg-transparent" /></td>
                          <td className="px-2 py-2 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => removeRow(realIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20">
              <Button variant="outline" onClick={addRow} className="w-full border-dashed">
                <Plus className="w-4 h-4 ml-2" />
                إضافة {activeCollege !== "الكل" ? `مادة في ${activeCollege}` : "صف جديد"}
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
