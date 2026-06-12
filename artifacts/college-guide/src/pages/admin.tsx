import { useState, useEffect, useRef, Fragment } from "react";
import { useListCourses, useBulkCreateCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Course, BulkCourseItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, CloudOff, CheckCircle2, RotateCcw, ShieldCheck, AlertTriangle, Download, Upload, FileSpreadsheet, Bot, Pencil } from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";

const COLLEGE_MAP: Record<string, string> = {
  "التطبيقية": "تطبيقيه", "تطبيقية": "تطبيقيه",
  "الحاسبات": "حاسبات", "حاسبات": "حاسبات",
  "العربي": "عربي", "عربي": "عربي",
  "الصيدلة": "صيدلة", "صيدلة": "صيدلة",
  "القاعات الزجاجية": "القاعات الزجاجيه", "القاعات الزجاجيه": "القاعات الزجاجيه",
};

const DAY_MAP: Record<string, string> = {
  "الأحد": "الأحد", "الاحد": "الأحد",
  "الاثنين": "الاثنين", "الأثنين": "الاثنين", "الإثنين": "الاثنين",
  "الثلاثاء": "الثلاثاء",
  "الأربعاء": "الأربعاء", "الاربعاء": "الأربعاء",
  "الخميس": "الخميس",
};

function normalizeCollege(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, "").replace(/ـ/g, "");
  for (const [key, val] of Object.entries(COLLEGE_MAP)) {
    if (clean.includes(key.replace(/\s/g, ""))) return val;
  }
  return raw.trim();
}

function normalizeDay(raw: string): string {
  const clean = raw.trim().replace(/\s+/g, "").replace(/ـ/g, "");
  for (const [key, val] of Object.entries(DAY_MAP)) {
    if (clean.includes(key.replace(/\s/g, ""))) return val;
  }
  return raw.trim();
}

function convertExcelTime(timeStr: string): { startTime: string; endTime: string } {
  const parts = timeStr.split("-").map(s => s.trim());
  if (parts.length !== 2) return { startTime: "", endTime: "" };
  const toH24 = (t: string) => {
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h >= 1 && h <= 6) h += 12;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };
  return { startTime: toH24(parts[1]), endTime: toH24(parts[0]) };
}

const DRAFT_KEY = "admin-courses-draft";
const BACKUP_KEY = "admin-courses-backup";
const COLLEGES = ["الكل", "تطبيقيه", "حاسبات", "عربي", "صيدلة", "القاعات الزجاجيه"];
const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

interface KnowledgeItem { id: number; title: string; content: string; }
const COLLEGE_OPTIONS = COLLEGES.filter(c => c !== "الكل");

type LocalCourse = Partial<Course & { _tempId: string; roomDescription?: string }>;
type Backup = { courses: LocalCourse[]; savedAt: string; count: number };

function loadDraft(): LocalCourse[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
}

function saveDraft(courses: LocalCourse[]) {
  try {
    if (courses.length > 0) localStorage.setItem(DRAFT_KEY, JSON.stringify(courses));
  } catch {}
}

function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

function saveBackup(courses: LocalCourse[]) {
  try {
    const backup: Backup = { courses, savedAt: new Date().toISOString(), count: courses.length };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch {}
}

function loadBackup(): Backup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
  const [activeInstructor, setActiveInstructor] = useState("الكل");
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  const [newInstructorName, setNewInstructorName] = useState("");
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [backupWarning, setBackupWarning] = useState<Backup | null>(null);
  const [adminTab, setAdminTab] = useState<"courses" | "assistant">("courses");
  const initializedRef = useRef(false);
  const instructorInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [newKnTitle, setNewKnTitle] = useState("");
  const [newKnContent, setNewKnContent] = useState("");
  const [editingKn, setEditingKn] = useState<KnowledgeItem | null>(null);
  const [knSaving, setKnSaving] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (isLoading) return;

    const draft = loadDraft();
    if (draft) {
      setLocalCourses(draft);
      setUserHasEdited(true);
    } else {
      const serverCourses = courses.map(c => ({ ...c, _tempId: String(c.id) }));
      setLocalCourses(serverCourses);
      setUserHasEdited(false);

      // Check if backup has more data than server — might indicate data loss
      const backup = loadBackup();
      if (backup && backup.count > courses.length + 2) {
        setBackupWarning(backup);
      }
    }
    initializedRef.current = true;
  }, [isLoading, courses]);

  useEffect(() => {
    if (!initializedRef.current || !userHasEdited) return;
    if (localCourses.length === 0) return;
    saveDraft(localCourses);
    setDraftSavedAt(new Date());
  }, [localCourses, userHasEdited]);

  const discardDraft = () => {
    clearDraft();
    setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
    setUserHasEdited(false);
    setDraftSavedAt(null);
    setSaveConfirm(false);
    toast({ title: "تم تجاهل التغييرات", description: "تمت استعادة البيانات المحفوظة من الخادم." });
  };

  const restoreFromBackup = (backup: Backup) => {
    setLocalCourses(backup.courses);
    setUserHasEdited(true);
    setBackupWarning(null);
    toast({ title: "تمت الاستعادة", description: `تم استعادة ${backup.count} مادة من النسخة الاحتياطية.` });
  };

  const exportData = () => {
    const exportCourses = localCourses.map(({ _tempId, ...rest }) => rest);
    const exportObj = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: exportCourses.length,
      courses: exportCourses
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `جدول-المواد-${new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: `تم تحميل ملف يحتوي على ${exportCourses.length} مادة.` });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const imported: LocalCourse[] = (json.courses ?? json).map((c: LocalCourse) => ({
          ...c,
          id: undefined,
          _tempId: Math.random().toString(36).substring(7),
        }));
        if (!imported.length) throw new Error("empty");
        setLocalCourses(imported);
        setUserHasEdited(true);
        toast({ title: "✓ تم الاستيراد", description: `تم تحميل ${imported.length} مادة. اضغطي "حفظ الكل" لنشرها.` });
      } catch {
        toast({ title: "خطأ في الاستيراد", description: "الملف غير صالح. تأكدي أنه ملف JSON مُصدَّر من الأدمن.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];

        const imported: LocalCourse[] = [];
        for (const row of rows) {
          const college = String(row[0] ?? "").trim();
          const instructor = String(row[1] ?? "").trim();
          const name = String(row[2] ?? "").trim();
          const section = String(row[3] ?? "").trim();
          const day = String(row[4] ?? "").trim();
          const timeRaw = String(row[5] ?? "").trim();
          const room = String(row[6] ?? "").trim();
          const roomDescription = String(row[7] ?? "").trim();
          const officeLocation = String(row[8] ?? "").trim();

          if (!name || !instructor || !college || college.includes("الكلي")) continue;

          const { startTime, endTime } = convertExcelTime(timeRaw);

          imported.push({
            _tempId: Math.random().toString(36).substring(7),
            name,
            instructor,
            college: normalizeCollege(college),
            day: normalizeDay(day),
            startTime,
            endTime,
            room,
            roomDescription: roomDescription || undefined,
            section: section || undefined,
            officeLocation: officeLocation || undefined,
          });
        }

        if (!imported.length) throw new Error("empty");
        setLocalCourses(imported);
        setUserHasEdited(true);
        toast({ title: "✓ تم استيراد الإكسل", description: `تم تحميل ${imported.length} مادة من الجدول. اضغطي "حفظ الكل" لنشرها.` });
      } catch {
        toast({ title: "خطأ في قراءة الملف", description: "تأكدي أن الملف بصيغة xlsx وأن الأعمدة: الكلية، الدكتورة، المادة، الشعبة، اليوم، الوقت، القاعة.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const addRow = (instructor = "") => {
    setUserHasEdited(true);
    const resolvedInstructor = instructor || (activeInstructor !== "الكل" ? activeInstructor : "");
    setLocalCourses(prev => [...prev, {
      _tempId: Math.random().toString(36).substring(7),
      name: "",
      instructor: resolvedInstructor,
      college: activeCollege !== "الكل" ? activeCollege : "",
      day: "الأحد",
      startTime: "",
      endTime: "",
      room: "",
      roomDescription: "",
      section: "",
      officeLocation: ""
    }]);
  };

  const confirmAddInstructor = () => {
    const name = newInstructorName.trim();
    if (!name) return;
    addRow(name);
    setNewInstructorName("");
    setShowAddInstructor(false);
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

  const doSave = () => {
    setSaveConfirm(false);
    const validCourses = localCourses.filter(c => c.name && c.instructor && c.college && c.day && c.startTime && c.endTime && c.room);

    if (validCourses.length !== localCourses.length) {
      toast({
        title: "بيانات ناقصة",
        description: `تم تجاهل ${localCourses.length - validCourses.length} صف ناقص البيانات.`,
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
      section: c.section || undefined,
      officeLocation: c.officeLocation || undefined
    }));

    bulkCreate.mutate({ data: { courses: payload } }, {
      onSuccess: () => {
        saveBackup(validCourses as LocalCourse[]);
        clearDraft();
        setUserHasEdited(false);
        setDraftSavedAt(null);
        setBackupWarning(null);
        toast({ title: "✓ تم الحفظ بنجاح", description: `تم نشر ${payload.length} مادة للطالبات وحفظ نسخة احتياطية.` });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey({}) });
      },
      onError: () => {
        toast({ title: "خطأ في الحفظ", description: "لم يتم الحفظ. بياناتك محفوظة مؤقتاً في الجهاز، جربي مرة أخرى.", variant: "destructive" });
      }
    });
  };

  const handleSaveClick = () => {
    if (bulkCreate.isPending) return;
    const validCount = localCourses.filter(c => c.name && c.instructor && c.college && c.day && c.startTime && c.endTime && c.room).length;
    if (validCount === 0) { doSave(); return; }
    setSaveConfirm(true);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => new Date(iso).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const validCount = localCourses.filter(c => c.name && c.instructor && c.college && c.day && c.startTime && c.endTime && c.room).length;
  const instructorSet = new Set(localCourses.filter(c => c.instructor).map(c => c.instructor));

  // Unique instructors relevant to the active college filter
  const instructorList = Array.from(
    new Set(
      localCourses
        .filter(c => c.instructor && (activeCollege === "الكل" || c.college === activeCollege))
        .map(c => c.instructor as string)
    )
  );

  const visibleCourses = localCourses.filter(c => {
    const matchCollege = activeCollege === "الكل" || c.college === activeCollege;
    const matchInstructor = activeInstructor === "الكل" || c.instructor === activeInstructor;
    return matchCollege && matchInstructor;
  });
  const visibleIndices = localCourses
    .map((c, i) => {
      const matchCollege = activeCollege === "الكل" || c.college === activeCollege;
      const matchInstructor = activeInstructor === "الكل" || c.instructor === activeInstructor;
      return matchCollege && matchInstructor ? i : -1;
    })
    .filter(i => i !== -1);

  useEffect(() => {
    setKnowledgeLoading(true);
    fetch(`${API_BASE}/assistant/knowledge`)
      .then(r => r.json())
      .then(data => setKnowledge(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setKnowledgeLoading(false));
  }, []);

  const addKnowledge = async () => {
    if (!newKnTitle.trim() || !newKnContent.trim()) return;
    setKnSaving(true);
    try {
      const res = await fetch(`${API_BASE}/assistant/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newKnTitle.trim(), content: newKnContent.trim() }),
      });
      const item = await res.json();
      setKnowledge(prev => [...prev, item]);
      setNewKnTitle("");
      setNewKnContent("");
      toast({ title: "✓ تمت الإضافة", description: "تمت إضافة المعلومة للمساعد الذكي." });
    } catch {
      toast({ title: "خطأ", description: "فشل الحفظ، حاولي مجدداً.", variant: "destructive" });
    } finally {
      setKnSaving(false);
    }
  };

  const updateKnowledge = async () => {
    if (!editingKn || !editingKn.title.trim() || !editingKn.content.trim()) return;
    setKnSaving(true);
    try {
      const res = await fetch(`${API_BASE}/assistant/knowledge/${editingKn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingKn.title.trim(), content: editingKn.content.trim() }),
      });
      const item = await res.json();
      setKnowledge(prev => prev.map(k => k.id === item.id ? item : k));
      setEditingKn(null);
      toast({ title: "✓ تم التحديث", description: "تم تحديث المعلومة بنجاح." });
    } catch {
      toast({ title: "خطأ", description: "فشل التحديث.", variant: "destructive" });
    } finally {
      setKnSaving(false);
    }
  };

  const deleteKnowledge = async (id: number) => {
    await fetch(`${API_BASE}/assistant/knowledge/${id}`, { method: "DELETE" });
    setKnowledge(prev => prev.filter(k => k.id !== id));
    toast({ title: "تم الحذف" });
  };

  const collegeCount = (col: string) => col === "الكل" ? localCourses.length : localCourses.filter(c => c.college === col).length;
  const instructorCount = (name: string) => name === "الكل"
    ? localCourses.filter(c => activeCollege === "الكل" || c.college === activeCollege).length
    : localCourses.filter(c => c.instructor === name && (activeCollege === "الكل" || c.college === activeCollege)).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-4">

          {/* Title + tabs row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">لوحة التحكم</h1>
              <p className="text-muted-foreground text-sm">إدارة المواد ومساعدة القاعات</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Link href="/"><Button variant="outline" size="sm">العودة للرئيسية</Button></Link>

              {adminTab === "courses" && (<>
                <Button variant="outline" size="sm" onClick={exportData} className="gap-1.5 text-muted-foreground" disabled={localCourses.length === 0}>
                  <Download className="w-3.5 h-3.5" />
                  تصدير
                </Button>

                <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={importData} />
                <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1.5 text-muted-foreground">
                  <Upload className="w-3.5 h-3.5" />
                  استيراد JSON
                </Button>

                <input
                  ref={excelFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={importExcel}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => excelFileRef.current?.click()}
                  className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  استيراد إكسل
                </Button>

                {userHasEdited && (
                  <Button variant="ghost" size="sm" onClick={discardDraft} className="text-muted-foreground gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />تجاهل
                  </Button>
                )}
                <Button onClick={handleSaveClick} className="bg-primary hover:bg-primary/90" disabled={bulkCreate.isPending}>
                  <Save className="w-4 h-4 ml-2" />
                  {bulkCreate.isPending ? "جاري الحفظ..." : "حفظ الكل"}
                </Button>
              </>)}
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 border-b border-border/50 pb-0">
            <button
              onClick={() => setAdminTab("courses")}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors ${
                adminTab === "courses"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              📋 إدارة المواد
            </button>
            <button
              onClick={() => setAdminTab("assistant")}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors ${
                adminTab === "assistant"
                  ? "border-green-600 text-green-700 bg-green-50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              🤖 مساعد القاعات
            </button>
          </div>

          {adminTab === "courses" && (<>

          {/* Backup warning — server has fewer courses than last backup */}
          {backupWarning && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-orange-500" />
              <div className="flex-1">
                <p className="font-semibold">تم اكتشاف نسخة احتياطية أكبر من البيانات الحالية</p>
                <p className="text-orange-700 text-xs mt-0.5">
                  النسخة الاحتياطية تحتوي على {backupWarning.count} مادة (محفوظة {formatDate(backupWarning.savedAt)}) — السيرفر يحتوي على {courses.length} مادة فقط.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => restoreFromBackup(backupWarning)} className="bg-orange-600 hover:bg-orange-700 text-white h-8">
                  استعادة النسخة الاحتياطية
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBackupWarning(null)} className="h-8 text-orange-600">
                  تجاهل
                </Button>
              </div>
            </div>
          )}

          {/* Save confirmation banner */}
          {saveConfirm && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border-2 border-primary/30 text-sm">
              <ShieldCheck className="w-5 h-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-primary">تأكيد الحفظ</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  ستُنشرين <strong>{validCount} مادة</strong> لـ <strong>{instructorSet.size} دكتور/ة</strong> للطالبات. هذا سيستبدل البيانات الحالية على السيرفر.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={doSave} className="bg-primary hover:bg-primary/90 h-8">
                  نعم، احفظي
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSaveConfirm(false)} className="h-8">
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {/* Status banner */}
          {!saveConfirm && !backupWarning && (
            userHasEdited ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <CloudOff className="w-4 h-4 shrink-0" />
                <span>
                  لديكِ تغييرات غير محفوظة
                  {draftSavedAt && <span className="text-amber-600 mr-1">— مؤقتاً الساعة {formatTime(draftSavedAt)}</span>}
                </span>
                <span className="mr-auto text-amber-600 text-xs font-medium">اضغطي "حفظ الكل" لنشرها</span>
              </div>
            ) : localCourses.length > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>كل البيانات منشورة للطالبات</span>
              </div>
            ) : null
          )}

          {/* College filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {COLLEGES.map(col => {
              const count = collegeCount(col);
              const isGlass = col === "القاعات الزجاجيه";
              const isActive = activeCollege === col;
              return (
                <button key={col} onClick={() => { setActiveCollege(col); setActiveInstructor("الكل"); }}
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

          {/* Instructor filter chips */}
          {instructorList.length > 0 && (
            <div className="bg-white rounded-xl border border-border/50 shadow-sm p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">الدكتور/ة:</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveInstructor("الكل")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeInstructor === "الكل"
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  الكل
                  <span className={`text-[10px] px-1 py-0.5 rounded-full ${activeInstructor === "الكل" ? "bg-white/20" : "bg-muted"}`}>
                    {instructorCount("الكل")}
                  </span>
                </button>
                {instructorList.map(name => (
                  <button
                    key={name}
                    onClick={() => setActiveInstructor(activeInstructor === name ? "الكل" : name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      activeInstructor === name
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {name}
                    <span className={`text-[10px] px-1 py-0.5 rounded-full ${activeInstructor === name ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                      {instructorCount(name)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">الشعبة</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">موقع المكتب</th>
                    <th className="px-4 py-3 font-medium w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && localCourses.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
                  ) : visibleCourses.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                      لا توجد مواد{activeCollege !== "الكل" ? ` في ${activeCollege}` : ""}. اضغطي "إضافة دكتورة" للبدء.
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
                                  <span className="font-semibold text-primary text-sm">{course.instructor}</span>
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
                            <td className="px-2 py-2"><Input value={course.section || ""} onChange={(e) => updateRow(realIndex, "section", e.target.value)} placeholder="مثال: GW1" className="h-8 min-w-[100px] bg-transparent" /></td>
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

            <div className="p-4 border-t border-border/50 bg-muted/20 space-y-3">
              {showAddInstructor && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-1.5 h-5 rounded-full bg-primary/50 shrink-0" />
                  <Input
                    ref={instructorInputRef}
                    value={newInstructorName}
                    onChange={e => setNewInstructorName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") confirmAddInstructor();
                      if (e.key === "Escape") { setShowAddInstructor(false); setNewInstructorName(""); }
                    }}
                    placeholder="اسم الدكتورة... (مثال: د. سارة العمري)"
                    className="flex-1 h-8 bg-white text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={confirmAddInstructor} disabled={!newInstructorName.trim()} className="bg-primary hover:bg-primary/90 h-8 px-4">
                    إضافة
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddInstructor(false); setNewInstructorName(""); }} className="h-8 text-muted-foreground">
                    إلغاء
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline"
                  onClick={() => { setShowAddInstructor(true); setTimeout(() => instructorInputRef.current?.focus(), 50); }}
                  className="flex-1 border-dashed border-primary/40 text-primary hover:bg-primary/5">
                  <Plus className="w-4 h-4 ml-2" />إضافة دكتورة
                </Button>
                <Button variant="outline" onClick={() => addRow()} className="flex-1 border-dashed text-muted-foreground">
                  <Plus className="w-4 h-4 ml-2" />إضافة صف جديد
                </Button>
              </div>
            </div>
          </div>

          </>)}

          {adminTab === "assistant" && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-green-50">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-green-700" />
              </div>
              <div>
                <h2 className="font-bold text-green-800 text-sm">دليل القاعات والمواقع</h2>
                <p className="text-xs text-green-600">أضيفي وصفاً لكل قاعة أو موقع — المساعد يرجعه للطالبة عند السؤال</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {editingKn ? (
                <div className="space-y-2 p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-2">تعديل المعلومة</p>
                  <Input
                    value={editingKn.title}
                    onChange={e => setEditingKn(k => k ? { ...k, title: e.target.value } : null)}
                    placeholder="اسم القاعة أو الموقع (مثال: قاعة L206، قاعة 201، مبنى الحاسبات...)"
                    className="text-sm"
                  />
                  <textarea
                    value={editingKn.content}
                    onChange={e => setEditingKn(k => k ? { ...k, content: e.target.value } : null)}
                    placeholder="وصف القاعة وكيفية الوصول إليها..."
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={updateKnowledge} disabled={knSaving} className="bg-green-600 hover:bg-green-700">
                      {knSaving ? "جاري الحفظ..." : "حفظ التعديل"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingKn(null)}>إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-4 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Input
                    value={newKnTitle}
                    onChange={e => setNewKnTitle(e.target.value)}
                    placeholder="اسم القاعة أو الموقع (مثال: قاعة L206، قاعة 201، مبنى الحاسبات...)"
                    className="text-sm"
                  />
                  <textarea
                    value={newKnContent}
                    onChange={e => setNewKnContent(e.target.value)}
                    placeholder="اكتبي وصف القاعة وكيفية الوصول إليها حتى تعرف الطالبة وين تروح..."
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button
                    size="sm"
                    onClick={addKnowledge}
                    disabled={!newKnTitle.trim() || !newKnContent.trim() || knSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1.5" />
                    {knSaving ? "جاري الإضافة..." : "إضافة للمساعد"}
                  </Button>
                </div>
              )}

              {knowledgeLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
              ) : knowledge.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد قاعات مضافة بعد — أضيفي وصف أول قاعة</p>
              ) : (
                <div className="space-y-2">
                  {knowledge.map(item => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingKn(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteKnowledge(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

        </div>
      </main>
    </div>
  );
}
