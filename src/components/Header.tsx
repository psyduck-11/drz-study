'use client';

import React from 'react';
import { Subject, WikiSection } from '@/types/database';
import { Upload, Download, Sun, Moon, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeSubject: Subject | null;
  sections: WikiSection[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenIngestModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSubject,
  sections,
  isDarkMode,
  onToggleTheme,
  onOpenIngestModal,
}) => {
  // Export compiled Living Wiki as a single .md file
  const handleExportMarkdown = () => {
    if (!activeSubject) return;

    let compiledMd = `# Sách Giáo Trình: ${activeSubject.name}\n\n`;
    compiledMd += `*Hệ tri thức Living Wiki - Xuất ngày ${new Date().toLocaleDateString('vi-VN')}*\n\n---\n\n`;

    sections.forEach((sec, idx) => {
      const hasLeadingIndex = /^\d+[.)]\s/.test(sec.title.trim());
      compiledMd += `## ${hasLeadingIndex ? sec.title : `${idx + 1}. ${sec.title}`}\n\n`;
      compiledMd += `${sec.content_markdown}\n\n---\n\n`;
    });

    const blob = new Blob([compiledMd], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSubject.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')}_LivingWiki.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[820px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* Subject Title */}
        <div className="flex items-center gap-2 overflow-hidden mr-4">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h1 className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">
            {activeSubject ? activeSubject.name : 'Chọn hoặc tạo môn học'}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSubject && (
            <>
              {/* Nạp tài liệu */}
              <button
                onClick={onOpenIngestModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                title="Nạp tài liệu PDF hoặc hình ảnh"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nạp tài liệu (PDF / Ảnh)</span>
                <span className="sm:hidden">Nạp</span>
              </button>

              {/* Xuất Markdown */}
              <button
                onClick={handleExportMarkdown}
                disabled={sections.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-40"
                title="Tải toàn bộ nội dung môn học dưới dạng tệp Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất Markdown</span>
                <span className="sm:hidden">Xuất</span>
              </button>
            </>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
