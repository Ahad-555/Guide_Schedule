import { useState, useEffect } from "react";
import { useListCourses, useBulkCreateCourses, getListCoursesQueryKey } from "@workspace/api-client-react";
import { Course, CreateCourseBody } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";
import { Link } from "wouter";

export default function Admin() {
  const { data: courses = [], isLoading } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey({}) } });
  const bulkCreate = useBulkCreateCourses();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [localCourses, setLocalCourses] = useState<Partial<Course & { _tempId: string }>[]>([]);

  useEffect(() => {
    if (courses.length > 0 && localCourses.length === 0) {
      setLocalCourses(courses.map(c => ({ ...c, _tempId: String(c.id) })));
    }
  }, [courses]);

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
        officeHours: "",
        officeLocation: ""
      }
    ]);
  };

  const updateRow = (index: number, field: keyof Course, value: string) => {
    const newCourses = [...localCourses];
    newCourses[index] = { ...newCourses[index], [field]: value };
    setLocalCourses(newCourses);
  };

  const removeRow = (index: number) => {
    setLocalCourses(localCourses.filter((_, i) => i !== index));
  };

  const saveAll = () => {
    // Validate
    const validCourses = localCourses.filter(c => c.name && c.instructor && c.college && c.day && c.startTime && c.endTime && c.room);
    
    if (validCourses.length !== localCourses.length) {
      toast({
        title: "بيانات ناقصة",
        description: "تم تجاهل الصفوف التي لا تحتوي على جميع البيانات الأساسية.",
        variant: "destructive"
      });
    }

    const payload: CreateCourseBody[] = validCourses.map(c => ({
      name: c.name!,
      instructor: c.instructor!,
      college: c.college!,
      day: c.day!,
      startTime: c.startTime!,
      endTime: c.endTime!,
      room: c.room!,
      officeHours: c.officeHours,
      officeLocation: c.officeLocation
    }));

    bulkCreate.mutate({ data: { courses: payload } }, {
      onSuccess: () => {
        toast({
          title: "تم الحفظ بنجاح",
          description: `تم حفظ ${payload.length} مادة.`
        });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey({}) });
      },
      onError: () => {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حفظ البيانات.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">إدارة المواد</h1>
              <p className="text-muted-foreground text-sm">لوحة التحكم الخاصة بإضافة وتعديل المواد.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline">العودة للرئيسية</Button>
              </Link>
              <Button onClick={saveAll} className="bg-primary hover:bg-primary/90" disabled={bulkCreate.isPending}>
                <Save className="w-4 h-4 ml-2" />
                {bulkCreate.isPending ? "جاري الحفظ..." : "حفظ الكل"}
              </Button>
            </div>
          </div>

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
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">ساعات المكتب</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px]">موقع المكتب</th>
                    <th className="px-4 py-3 font-medium w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">جاري التحميل...</td>
                    </tr>
                  ) : localCourses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">لا توجد بيانات. انقر على "إضافة صف جديد" للبدء.</td>
                    </tr>
                  ) : (
                    localCourses.map((course, index) => (
                      <tr key={course._tempId || index} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-2">
                          <Input 
                            value={course.name || ""} 
                            onChange={(e) => updateRow(index, "name", e.target.value)} 
                            className="h-8 min-w-[150px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            value={course.instructor || ""} 
                            onChange={(e) => updateRow(index, "instructor", e.target.value)} 
                            className="h-8 min-w-[150px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            value={course.college || ""} 
                            onChange={(e) => updateRow(index, "college", e.target.value)} 
                            className="h-8 min-w-[150px] bg-transparent"
                          />
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
                          <Input 
                            type="time"
                            value={course.startTime || ""} 
                            onChange={(e) => updateRow(index, "startTime", e.target.value)} 
                            className="h-8 min-w-[100px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            type="time"
                            value={course.endTime || ""} 
                            onChange={(e) => updateRow(index, "endTime", e.target.value)} 
                            className="h-8 min-w-[100px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            value={course.room || ""} 
                            onChange={(e) => updateRow(index, "room", e.target.value)} 
                            className="h-8 min-w-[100px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            value={course.officeHours || ""} 
                            onChange={(e) => updateRow(index, "officeHours", e.target.value)} 
                            className="h-8 min-w-[120px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input 
                            value={course.officeLocation || ""} 
                            onChange={(e) => updateRow(index, "officeLocation", e.target.value)} 
                            className="h-8 min-w-[120px] bg-transparent"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => removeRow(index)}
                          >
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
