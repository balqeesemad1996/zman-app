import { useState, useMemo } from "react";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { SkeletonList } from "@/components/shared/SkeletonList";
import { useSnippets, useCreateSnippet, useUpdateSnippet, useDeleteSnippet } from "@/features/snippets/hooks";
import type { Snippet } from "@/features/snippets/queries";

interface SnippetFormValues {
  title: string;
  body: string;
  category: string;
}

function SnippetForm({
  initialData,
  onSubmit,
  onDelete,
  isSubmitting,
  existingCategories,
}: {
  initialData?: Snippet;
  onSubmit: (v: SnippetFormValues) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  existingCategories: string[];
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "عام");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSubmit({ title: title.trim(), body: body.trim(), category: category.trim() || "عام" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink-2 mb-1">العنوان *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="عنوان القالب"
          className="w-full h-11 px-3 rounded-md border border-hairline bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink-2 mb-1">الفئة</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={100}
          placeholder="الوسم أو التصنيف"
          list="categories-list"
          className="w-full h-11 px-3 rounded-md border border-hairline bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
        />
        <datalist id="categories-list">
          {existingCategories.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink-2 mb-1">النص *</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={2000}
          rows={6}
          placeholder="نص القالب"
          className="w-full px-3 py-2 rounded-md border border-hairline bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink resize-none leading-relaxed"
        />
        <p className="text-xs text-ink/40 mt-1 text-end">{body.length}/2000</p>
      </div>

      <div className="flex gap-3 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 rounded-md border border-alert/30 text-alert hover:bg-alert-soft font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !body.trim()}
          className="flex-1 min-h-[44px] py-2 px-4 rounded-md bg-info text-paper font-bold hover:bg-info/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "جاري الحفظ..." : initialData ? "حفظ التعديلات" : "إضافة القالب"}
        </button>
      </div>
    </form>
  );
}

export default function SnippetsClient() {
  const [search, setSearch] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [viewing, setViewing] = useState<Snippet | null>(null);

  const { data: items = [], isLoading, isError, refetch } = useSnippets();
  const createMutation = useCreateSnippet();
  const updateMutation = useUpdateSnippet();
  const deleteMutation = useDeleteSnippet();

  const existingCategories = useMemo(
    () => [...new Set(items.map((s) => s.category))].filter(Boolean),
    [items],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (s) => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Snippet[]>();
    for (const s of filtered) {
      const cat = s.category || "عام";
      const list = map.get(cat) ?? [];
      list.push(s);
      map.set(cat, list);
    }
    return map;
  }, [filtered]);

  const handleCreate = async (values: SnippetFormValues) => {
    const res = await createMutation.mutateAsync(values);
    if (res.status === "ok") {
      toast.success("تم إضافة القالب");
      setIsNew(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleUpdate = async (values: SnippetFormValues) => {
    if (!editing) return;
    const res = await updateMutation.mutateAsync({ id: editing.id, ...values });
    if (res.status === "ok") {
      toast.success("تم تحديث القالب");
      setEditing(null);
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    const res = await deleteMutation.mutateAsync(editing.id);
    if (res.status === "ok") {
      toast.success("تم حذف القالب");
      setEditing(null);
    } else {
      toast.error(res.message);
    }
  };

  const handleCopy = async (body: string) => {
    await navigator.clipboard.writeText(body);
    navigator.vibrate?.(10);
    toast.success("تم النسخ");
  };

  const pageAction = (
    <button
      type="button"
      onClick={() => setIsNew(true)}
      className="min-h-[44px] px-4 py-2 rounded-md bg-info hover:bg-info/90 text-paper font-bold text-sm flex items-center gap-2 transition-colors"
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">قالب جديد</span>
    </button>
  );

  return (
    <AppShell title="مكتبة القوالب النصية" action={pageAction}>
      <div className="space-y-4 flex-1 flex flex-col">
        {/* بحث */}
        <div className="relative">
          <Search className="absolute inset-s-3 top-3 h-4.5 w-4.5 text-ink/40" />
          <input
            type="text"
            placeholder="ابحث في القوالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 ps-10 pe-4 rounded-md border border-hairline bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="مكتبة القوالب فارغة"
            description="أضف قوالب نصية جاهزة للنسخ واللصق في واتساب وغيره (ردود عملاء، تأكيد طلبات، عروض أسعار...)"
            actionLabel="إضافة أول قالب"
            onAction={() => setIsNew(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد نتائج" description="جرب كلمة بحث مختلفة" />
        ) : (
          <div className="space-y-6 flex-1">
            {[...grouped.entries()].map(([cat, catItems]) => (
              <div key={cat}>
                <h3 className="text-xs font-bold text-ink/40 uppercase tracking-wider mb-2 px-1">
                  {cat}
                </h3>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-4 bg-paper rounded-lg border border-hairline hover:border-ink/20 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setViewing(item)}
                        className="flex-1 min-w-0 text-start"
                      >
                        <p className="font-bold text-ink text-base leading-tight">{item.title}</p>
                        <p className="text-sm text-ink/50 mt-1 line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.body)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-info-soft text-info transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-canvas text-ink/50 hover:text-ink transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* شيت عرض النص الكامل + نسخ */}
      <ResponsiveModal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? ""}
      >
        {viewing && (
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-canvas text-ink/50">
              {viewing.category}
            </span>
            <div className="bg-canvas rounded-lg p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {viewing.body}
            </div>
            <button
              type="button"
              onClick={() => {
                handleCopy(viewing.body);
                setViewing(null);
              }}
              className="w-full min-h-[56px] rounded-md bg-info text-paper font-bold text-base hover:bg-info/90 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              نسخ النص
            </button>
          </div>
        )}
      </ResponsiveModal>

      {/* نموذج إضافة */}
      <ResponsiveModal isOpen={isNew} onClose={() => setIsNew(false)} title="قالب نصي جديد">
        <SnippetForm
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
          existingCategories={existingCategories}
        />
      </ResponsiveModal>

      {/* نموذج تعديل */}
      <ResponsiveModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="تعديل القالب"
      >
        {editing && (
          <SnippetForm
            initialData={editing}
            onSubmit={handleUpdate}
            onDelete={handleDelete}
            isSubmitting={updateMutation.isPending || deleteMutation.isPending}
            existingCategories={existingCategories}
          />
        )}
      </ResponsiveModal>
    </AppShell>
  );
}
