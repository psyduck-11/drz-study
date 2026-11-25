'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Subject, WikiSection, Source } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SectionItem } from '@/components/SectionItem';
import { DocumentIngestionModal } from '@/components/DocumentIngestionModal';
import { BookOpen, Plus, Sparkles, AlertCircle } from 'lucide-react';

// Sample initial data for local testing before Supabase credentials are plugged in
const INITIAL_DEMO_SUBJECT: Subject = {
  id: 'demo-subject-1',
  name: 'Đại Số Tuyến Tính & Học Máy',
  created_at: new Date().toISOString(),
};

const INITIAL_DEMO_SECTIONS: WikiSection[] = [
  {
    id: 'demo-sec-1',
    subject_id: 'demo-subject-1',
    title: '1. Không Gian Véc-tơ và Phép Biến Đổi Tuyến Tính',
    order_index: 0,
    content_markdown: `Trong học máy và khoa học dữ liệu, **không gian véc-tơ** $\\mathbb{R}^n$ là nền tảng biểu diễn các mẫu dữ liệu nhiều chiều.

### Định nghĩa Hình thức
Một tập hợp $V$ cùng với hai phép toán cộng véc-tơ và nhân với vô hướng được gọi là không gian véc-tơ trên trường số thực $\\mathbb{R}$ nếu thỏa mãn 8 tiên đề cơ bản:

1. **Tính kết hợp:** $(u + v) + w = u + (v + w)$
2. **Tính giao hoán:** $u + v = v + u$
3. **Phần tử không:** Tồn tại $\\mathbf{0} \\in V$ sao cho $v + \\mathbf{0} = v$
4. **Phép nhân vô hướng phân phối:** $\\alpha(u + v) = \\alpha u + \\alpha v$

### Ma trận Biến đổi và Giá trị riêng
Cho ma trận vuông $A \\in \\mathbb{R}^{n \\times n}$. Véc-tơ $v \\neq \\mathbf{0}$ là véc-tơ riêng ứng với giá trị riêng $\\lambda$ nếu:

$$A v = \\lambda v \\iff (A - \\lambda I)v = \\mathbf{0}$$

Điều kiện có nghiệm không tầm thường là định thức phải triệt tiêu:
$$\\det(A - \\lambda I) = 0$$

\`\`\`mermaid
graph LR
  A[Dữ liệu thô x] --> B[Biến đổi tuyến tính A]
  B --> C[Không gian đặc trưng y = Ax]
  C --> D[Phân tích Thành phần Chính PCA]
\`\`\`

| Khái niệm | Ký hiệu | Ý nghĩa trong Học Máy |
| :--- | :--- | :--- |
| Tích vô hướng | $\\langle u, v \\rangle = u^T v$ | Đo lường độ tương đồng Cosine giữa 2 véc-tơ |
| Chuẩn Frobenius | $\\|A\\|_F = \\sqrt{\\sum a_{ij}^2}$ | Đánh giá độ lớn ma trận trọng số (Regularization) |
| Ma trận đối xứng | $A = A^T$ | Luôn có thể chéo hóa trực giao |`,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-sec-2',
    subject_id: 'demo-subject-1',
    title: '2. Phân Tích Suy Biến (SVD - Singular Value Decomposition)',
    order_index: 1,
    content_markdown: `Mọi ma trận $A \\in \\mathbb{R}^{m \\times n}$ bất kỳ đều có thể phân tích thành tích của 3 ma trận:

$$A = U \\Sigma V^T$$

Trong đó:
- $U \\in \\mathbb{R}^{m \\times m}$: Ma trận trực giao gồm các véc-tơ riêng của $A A^T$.
- $\\Sigma \\in \\mathbb{R}^{m \\times n}$: Ma trận đường chéo chứa các giá trị suy biến $\\sigma_1 \\ge \\sigma_2 \\ge \\dots \\ge 0$.
- $V \\in \\mathbb{R}^{n \\times n}$: Ma trận trực giao gồm các véc-tơ riêng của $A^T A$.

*[Nguồn: DeepLearning_Matrix.pdf - Tr. 14]*

> **Ý nghĩa thực tiễn:** SVD được sử dụng trong nén ảnh, hệ thống gợi ý (Collaborative Filtering), và giảm chiều dữ liệu giữ lại tối đa phương sai.`,
    updated_at: new Date().toISOString(),
  },
];

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseOffline, setIsSupabaseOffline] = useState(false);
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const supabaseOfflineRef = useRef(false);

  const canUseSupabase = isSupabaseConfigured && !isSupabaseOffline;

  const markSupabaseOffline = useCallback((reason: string) => {
    if (!supabaseOfflineRef.current) {
      supabaseOfflineRef.current = true;
      setIsSupabaseOffline(true);
      setSupabaseErrorMsg(reason);
    }
  }, []);

  const loadLocalSubjects = useCallback((): Subject[] => {
    if (typeof window === 'undefined') return [INITIAL_DEMO_SUBJECT];
    const stored = localStorage.getItem('living_wiki_subjects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Ignore corrupt localStorage and re-seed demo subject
      }
    }
    localStorage.setItem('living_wiki_subjects', JSON.stringify([INITIAL_DEMO_SUBJECT]));
    return [INITIAL_DEMO_SUBJECT];
  }, []);

  const loadLocalSections = useCallback((subjectId: string): WikiSection[] => {
    if (typeof window === 'undefined') {
      return subjectId === INITIAL_DEMO_SUBJECT.id ? INITIAL_DEMO_SECTIONS : [];
    }
    const stored = localStorage.getItem(`living_wiki_sections_${subjectId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore corrupt localStorage
      }
    }
    if (subjectId === INITIAL_DEMO_SUBJECT.id) {
      localStorage.setItem(`living_wiki_sections_${subjectId}`, JSON.stringify(INITIAL_DEMO_SECTIONS));
      return INITIAL_DEMO_SECTIONS;
    }
    return [];
  }, []);

  const loadLocalSources = useCallback((subjectId: string): Source[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(`living_wiki_sources_${subjectId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore corrupt localStorage
      }
    }
    return [];
  }, []);

  // Initialize theme from system or preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Fetch sections for current active subject
  const fetchSections = useCallback(async (subjectId: string) => {
    try {
      if (isSupabaseConfigured && !supabaseOfflineRef.current) {
        const { data, error } = await supabase
          .from('wiki_sections')
          .select('*')
          .eq('subject_id', subjectId)
          .order('order_index', { ascending: true });

        if (error) throw error;
        setSections(data || []);
        return;
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải mục wiki từ Supabase, chuyển sang lưu cục bộ:', err);
      markSupabaseOffline(err?.message || 'Không thể kết nối Supabase');
    }
    setSections(loadLocalSections(subjectId));
  }, [loadLocalSections, markSupabaseOffline]);

  // Fetch source documents for current active subject
  const fetchSources = useCallback(async (subjectId: string) => {
    try {
      if (isSupabaseConfigured && !supabaseOfflineRef.current) {
        const { data, error } = await supabase
          .from('sources')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSources(data || []);
        return;
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải tài liệu nguồn từ Supabase, chuyển sang lưu cục bộ:', err);
      markSupabaseOffline(err?.message || 'Không thể kết nối Supabase');
    }
    setSources(loadLocalSources(subjectId));
  }, [loadLocalSources, markSupabaseOffline]);

  // Fetch subjects from Supabase or fallback — runs ONCE on mount
  const fetchSubjects = useCallback(async () => {
    try {
      let resolvedSubjects: Subject[] = [];
      if (isSupabaseConfigured && !supabaseOfflineRef.current) {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          resolvedSubjects = data;
        } else {
          // If Supabase table is empty, create a starter subject
          const { data: newSub, error: createError } = await supabase
            .from('subjects')
            .insert({ name: 'Đại Số Tuyến Tính & Học Máy' })
            .select()
            .single();

          if (createError) throw createError;
          if (newSub) {
            resolvedSubjects = [newSub];
          }
        }
      } else {
        resolvedSubjects = loadLocalSubjects();
      }

      const initialSubject = resolvedSubjects[0] || null;
      setSubjects(resolvedSubjects);
      setActiveSubject(initialSubject);
      if (initialSubject) {
        await Promise.all([
          fetchSections(initialSubject.id),
          fetchSources(initialSubject.id),
        ]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải môn học từ Supabase, chuyển sang lưu cục bộ:', err);
      markSupabaseOffline(err?.message || 'Không thể kết nối Supabase');
      const localSubjects = loadLocalSubjects();
      const initialSubject = localSubjects[0] || null;
      setSubjects(localSubjects);
      setActiveSubject(initialSubject);
      if (initialSubject) {
        setSections(loadLocalSections(initialSubject.id));
        setSources(loadLocalSources(initialSubject.id));
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchSections, fetchSources, loadLocalSections, loadLocalSources, loadLocalSubjects, markSupabaseOffline]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const activeSubjectId = activeSubject?.id;
  useEffect(() => {
    if (isLoading) return;
    if (activeSubjectId) {
      fetchSections(activeSubjectId);
      fetchSources(activeSubjectId);
    } else {
      setSections([]);
      setSources([]);
    }
  }, [activeSubjectId, isLoading, fetchSections, fetchSources]);

  // Subject Handlers
  const handleCreateSubject = async (name: string) => {
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { data, error } = await supabase
        .from('subjects')
        .insert({ name })
        .select()
        .single();
      if (!error && data) {
        setSubjects((prev) => [...prev, data]);
        setActiveSubject(data);
        return;
      }
      console.warn('Lỗi tạo môn học trên Supabase, chuyển sang lưu cục bộ:', error);
      markSupabaseOffline(error?.message || 'Không thể kết nối Supabase');
    }

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
    };
    setSubjects((prev) => {
      const updated = [...prev, newSub];
      localStorage.setItem('living_wiki_subjects', JSON.stringify(updated));
      return updated;
    });
    setActiveSubject(newSub);
  };

  const handleRenameSubject = async (id: string, newName: string) => {
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { error } = await supabase.from('subjects').update({ name: newName }).eq('id', id);
      if (error) {
        console.warn('Lỗi đổi tên môn học trên Supabase, chuyển sang lưu cục bộ:', error);
        markSupabaseOffline(error.message);
      }
    }
    setSubjects((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, name: newName } : s));
      if (!isSupabaseConfigured || supabaseOfflineRef.current) {
        localStorage.setItem('living_wiki_subjects', JSON.stringify(updated));
      }
      return updated;
    });
    if (activeSubject?.id === id) {
      setActiveSubject((prev) => (prev ? { ...prev, name: newName } : null));
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) {
        console.warn('Lỗi xóa môn học trên Supabase, chuyển sang lưu cục bộ:', error);
        markSupabaseOffline(error.message);
      }
    }
    const remaining = subjects.filter((s) => s.id !== id);
    setSubjects(remaining);
    if (!isSupabaseConfigured || supabaseOfflineRef.current) {
      localStorage.setItem('living_wiki_subjects', JSON.stringify(remaining));
      localStorage.removeItem(`living_wiki_sections_${id}`);
      localStorage.removeItem(`living_wiki_sources_${id}`);
    }
    if (activeSubject?.id === id) {
      setActiveSubject(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!activeSubject) return;
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { error } = await supabase.from('sources').delete().eq('id', id);
      if (error) {
        console.warn('Lỗi xóa nguồn trên Supabase, chuyển sang lưu cục bộ:', error);
        markSupabaseOffline(error.message);
      }
    }
    setSources((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (!isSupabaseConfigured || supabaseOfflineRef.current) {
        localStorage.setItem(`living_wiki_sources_${activeSubject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Section Handlers
  const handleUpdateSection = async (id: string, newTitle: string, newContent: string) => {
    if (!activeSubject) return;
    const now = new Date().toISOString();
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { error } = await supabase
        .from('wiki_sections')
        .update({
          title: newTitle,
          content_markdown: newContent,
          updated_at: now,
        })
        .eq('id', id);
      if (error) {
        console.warn('Lỗi cập nhật mục trên Supabase, chuyển sang lưu cục bộ:', error);
        markSupabaseOffline(error.message);
      }
    }
    setSections((prev) => {
      const updated = prev.map((sec) =>
        sec.id === id
          ? { ...sec, title: newTitle, content_markdown: newContent, updated_at: now }
          : sec
      );
      if (!isSupabaseConfigured || supabaseOfflineRef.current) {
        localStorage.setItem(`living_wiki_sections_${activeSubject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDeleteSection = async (id: string) => {
    if (!activeSubject) return;
    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { error } = await supabase.from('wiki_sections').delete().eq('id', id);
      if (error) {
        console.warn('Lỗi xóa mục trên Supabase, chuyển sang lưu cục bộ:', error);
        markSupabaseOffline(error.message);
      }
    }
    setSections((prev) => {
      const updated = prev.filter((sec) => sec.id !== id);
      if (!isSupabaseConfigured || supabaseOfflineRef.current) {
        localStorage.setItem(`living_wiki_sections_${activeSubject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleMoveSection = async (id: string, direction: 'up' | 'down') => {
    if (!activeSubject) return;
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...sections];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Update order_index
    const updated = reordered.map((sec, i) => ({
      ...sec,
      order_index: i,
    }));
    setSections(updated);

    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      for (const item of updated) {
        const { error } = await supabase
          .from('wiki_sections')
          .update({ order_index: item.order_index })
          .eq('id', item.id);
        if (error) {
          console.warn('Lỗi sắp xếp mục trên Supabase, chuyển sang lưu cục bộ:', error);
          markSupabaseOffline(error.message);
          break;
        }
      }
    }
    if (!isSupabaseConfigured || supabaseOfflineRef.current) {
      localStorage.setItem(`living_wiki_sections_${activeSubject.id}`, JSON.stringify(updated));
    }
  };

  const handleAddManualSection = async () => {
    if (!activeSubject) return;
    const nextOrder = sections.length > 0
      ? Math.max(...sections.map((s) => s.order_index)) + 1
      : 0;

    const newTitle = `Mục mới ${sections.length + 1}`;
    const newContent = 'Nhập nội dung Markdown tại đây...';

    if (isSupabaseConfigured && !supabaseOfflineRef.current) {
      const { data, error } = await supabase
        .from('wiki_sections')
        .insert({
          subject_id: activeSubject.id,
          title: newTitle,
          order_index: nextOrder,
          content_markdown: newContent,
        })
        .select()
        .single();

      if (!error && data) {
        setSections((prev) => [...prev, data]);
        return;
      }
      console.warn('Lỗi thêm mục thủ công trên Supabase, chuyển sang lưu cục bộ:', error);
      markSupabaseOffline(error?.message || 'Không thể kết nối Supabase');
    }

    const newSec: WikiSection = {
      id: `sec-${Date.now()}`,
      subject_id: activeSubject.id,
      title: newTitle,
      order_index: nextOrder,
      content_markdown: newContent,
      updated_at: new Date().toISOString(),
    };
    setSections((prev) => {
      const updated = [...prev, newSec];
      localStorage.setItem(`living_wiki_sections_${activeSubject.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-sans">
      {/* LEFT SIDEBAR (240px, collapsible) */}
      <Sidebar
        subjects={subjects}
        activeSubject={activeSubject}
        sections={sections}
        sources={sources}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectSubject={(sub) => setActiveSubject(sub)}
        onCreateSubject={handleCreateSubject}
        onRenameSubject={handleRenameSubject}
        onDeleteSubject={handleDeleteSubject}
        onDeleteSource={handleDeleteSource}
      />

      {/* RIGHT: MAIN READING AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header
          activeSubject={activeSubject}
          sections={sections}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onOpenIngestModal={() => setIsIngestModalOpen(true)}
        />

        {/* Informational banner if Supabase isn't configured or is unreachable */}
        {!canUseSupabase && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2 max-w-[820px] mx-auto w-full">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              {!isSupabaseConfigured ? (
                <span>
                  <strong>Chế độ Xem trước cục bộ:</strong> Chưa cấu hình thông tin Supabase trong <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env.local</code>. Dữ liệu đang được lưu trong trình duyệt.
                </span>
              ) : (
                <span>
                  <strong>Mất kết nối Supabase:</strong> Không thể truy cập máy chủ Supabase ({supabaseErrorMsg || 'lỗi mạng/DNS'}). Ứng dụng đã chuyển sang lưu cục bộ (<code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">localStorage</code>) — kiểm tra <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> trong <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env.local</code>.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Document Content */}
        <main className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-[820px] mx-auto">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 text-sm">
                Đang tải dữ liệu Living Wiki...
              </div>
            ) : !activeSubject ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">
                  Chưa có môn học nào được chọn
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  Hãy chọn một môn học ở thanh bên trái hoặc tạo một môn học mới để bắt đầu học tập.
                </p>
              </div>
            ) : sections.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                  Môn học này chưa có nội dung
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                  Bấm nút <strong>"Nạp tài liệu (PDF / Ảnh)"</strong> ở trên để AI tự động tổng hợp sách giáo trình sống động, hoặc tạo mục thủ công.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsIngestModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nạp tài liệu ngay</span>
                  </button>
                  <button
                    onClick={handleAddManualSection}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <span>Thêm mục thủ công</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* List of Living Wiki Sections */}
                {sections.map((section, idx) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    isFirst={idx === 0}
                    isLast={idx === sections.length - 1}
                    onUpdate={handleUpdateSection}
                    onDelete={handleDeleteSection}
                    onMove={handleMoveSection}
                  />
                ))}

                {/* Add Manual Section Button at bottom */}
                <div className="pt-6 pb-20 flex justify-center">
                  <button
                    onClick={handleAddManualSection}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm mục mới thủ công</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DOCUMENT INGESTION MODAL */}
      <DocumentIngestionModal
        isOpen={isIngestModalOpen}
        activeSubject={activeSubject}
        existingSections={sections}
        useSupabase={canUseSupabase}
        onSupabaseOffline={markSupabaseOffline}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={async () => {
          if (activeSubject) {
            await Promise.all([
              fetchSections(activeSubject.id),
              fetchSources(activeSubject.id),
            ]);
          }
        }}
      />
    </div>
  );
}
