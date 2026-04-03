import { useState, useEffect, useRef } from "react";
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

type LocalCourse = Partial<Course & { _tempId: string; roomDescription?: string }>;

function loadDraft(): LocalCourse[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(courses: LocalCourse[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(courses));
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
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const initializedRef = useRef(false);

  // Initialize: draft first, then server data
  useEffect(() => {
    if (initializedRef.current) return;
    const draft = loadDraft();
    if (draft) {
      setLocalCourses(draft);
      setHasDraft(true);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!isLoading && courses.length >= 0) {
      const draft = loadDraft();
      if (!draft) {
        setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
      }
      initializedRef.current = true;
    }
  }, [isLoading, courses]);

  // Auto-save draft on every change
  useEffect(() => {
    if (!initializedRef.current) return;
    saveDraft(localCourses);
    setDraftSavedAt(new Date());
    setHasDraft(true);
  }, [localCourses]);

  const discardDraft = () => {
    clearDraft();
    setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
    setHasDraft(false);
    setDraftSavedAt(null);
    toast({ title: "تم تجاهل التغييرات", description: "تمت استعادة البيانات المحفوظة من الخادم." });
  };

  const addRow = () => {
    setLocalCourses([
      ...localCourses,
      {
        _tempId: Math.random().toString(36).substring(7),
        name: "",
        instructor: "",
        college: "",
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
    const updated = [...localCourses];
    updated[index] = { ...updated[index], [field]: value };
    setLocalCourses(updated);
  };

  const removeRow = (index: number) => {
    setLocalCourses(localCourses.filter((_, i) => i !== index));
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
        setHasDraft(false);
        setDraftSavedAt(null);
        toast({ title: "تم الحفظ بنجاح", description: `تم حفظ ${payload.length} مادة للطالبات.` });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey({}) });
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ البيانات.", variant: "destructive" });
      }
    });
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

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
              {hasDraft && (
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

          {/* Draft indicator banner */}
          {hasDraft && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span>
                لديكِ تغييرات غير محفوظة للطالبات
                {draftSavedAt && (
                  <span className="text-amber-600 mr-1">— آخر حفظ مؤقت {formatTime(draftSavedAt)}</span>
                )}
              </span>
              <span className="mr-auto text-amber-600 text-xs">اضغطي "حفظ الكل" لنشرها</span>
            </div>
          )}

          {!hasDraft && localCourses.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>كل التغييرات منشورة للطالبات</span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
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
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">جاري التحميل...</td>
                    </tr>
                  ) : localCourses.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات. انقري على "إضافة صف جديد" للبدء.</td>
                    </tr>
                  ) : (
                    localCourses.map((course, index) => (
                      <tr key={course._tempId || index} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-2">
                          <Input value={course.name || ""} onChange={(e) => updateRow(index, "name", e.target.value)} className="h-8 min-w-[150px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={course.instructor || ""} onChange={(e) => updateRow(index, "instructor", e.target.value)} className="h-8 min-w-[150px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={course.college || ""}
                            onChange={(e) => updateRow(index, "college", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[130px]"
                          >
                            <option value="" disabled>اختاري الكلية</option>
                            <option value="تطبيقيه">تطبيقيه</option>
                            <option value="حاسبات">حاسبات</option>
                            <option value="عربي">عربي</option>
                            <option value="صيدلة">صيدلة</option>
                            <option value="الساعات الزجاجيه">الساعات الزجاجيه</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={course.day || "الأحد"}
                            onChange={(e) => updateRow(index, "day", e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="الأحد">الأحد</option>
                            <option value="الاثنين">الاثنين</option>
                            <option value="الثلاثاء">الثلاثاء</option>
                            <option value="الأربعاء">الأربعاء</option>
                            <option value="الخميس">الخميس</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input type="time" value={course.startTime || ""} onChange={(e) => updateRow(index, "startTime", e.target.value)} className="h-8 min-w-[100px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input type="time" value={course.endTime || ""} onChange={(e) => updateRow(index, "endTime", e.target.value)} className="h-8 min-w-[100px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={course.room || ""} onChange={(e) => updateRow(index, "room", e.target.value)} className="h-8 min-w-[100px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={course.roomDescription || ""} onChange={(e) => updateRow(index, "roomDescription", e.target.value)} placeholder="وصف موقع القاعة..." className="h-8 min-w-[180px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={course.officeHours || ""} onChange={(e) => updateRow(index, "officeHours", e.target.value)} className="h-8 min-w-[120px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={course.officeLocation || ""} onChange={(e) => updateRow(index, "officeLocation", e.target.value)} className="h-8 min-w-[120px] bg-transparent" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => removeRow(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20">
              <Button variant="outline" onClick={addRow} className="w-full border-dashed">
                <Plus className="w-4 h-4 ml-2" />
                إضافة صف جديد
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
