'use client';

import React, { useState } from 'react';
import { Subject, WikiSection, Source } from '@/types/database';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Layers,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  subjects: Subject[];
  activeSubject: Subject | null;
  sections: WikiSection[];
  sources?: Source[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSubject: (subject: Subject) => void;
  onCreateSubject: (name: string) => Promise<void>;
  onRenameSubject: (id: string, newName: string) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  onDeleteSource?: (id: string) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  subjects,
  activeSubject,
  sections,
  sources = [],
  isCollapsed,
  onToggleCollapse,
  onSelectSubject,
  onCreateSubject,
  onRenameSubject,
  onDeleteSubject,
  onDeleteSource,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    await onCreateSubject(newSubjectName.trim());
    setNewSubjectName('');
    setIsCreating(false);
  };

  const startEditing = (sub: Subject) => {
    setEditingSubjectId(sub.id);
    setEditingSubjectName(sub.name);
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editingSubjectName.trim()) return;
    await onRenameSubject(id, editingSubjectName.trim());
    setEditingSubjectId(null);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 h-screen border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center py-4 shrink-0 transition-all duration-200">
        <button
          onClick={onToggleCollapse}
          title="Mở thanh bên"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-8 flex flex-col items-center gap-4 text-slate-400">
          <BookOpen className="w-5 h-5" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[240px] h-screen border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 flex flex-col shrink-0 select-none overflow-hidden transition-all duration-200">
      {/* Sidebar Header / Brand */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
            Living Wiki
          </h1>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Thu gọn thanh bên"
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* TOP SECTION: Manual Subject Management */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 max-h-[45vh] flex flex-col">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Môn học
          </span>
          <button
            onClick={() => setIsCreating(true)}
            title="Thêm môn học mới"
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        {/* Input box for new subject */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="mb-2">
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Tên môn học..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-blue-400 rounded focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Subject list */}
        <div className="overflow-y-auto space-y-0.5 flex-1 pr-1">
          {subjects.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-2 py-3 text-center">
              Chưa có môn học nào. Nhấn "+ Thêm" để bắt đầu.
            </p>
          ) : (
            subjects.map((sub) => {
              const isActive = activeSubject?.id === sub.id;
              const isEditingThis = editingSubjectId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => !isEditingThis && onSelectSubject(sub)}
                >
                  {isEditingThis ? (
                    <div
                      className="flex items-center gap-1 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingSubjectName}
                        onChange={(e) => setEditingSubjectName(e.target.value)}
                        className="w-full text-xs px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-400 rounded focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameSubmit(sub.id)}
                        className="p-0.5 text-green-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingSubjectId(null)}
                        className="p-0.5 text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate pr-2">{sub.name}</span>

                      {/* Action buttons on hover */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(sub);
                          }}
                          title="Đổi tên"
                          className="p-1 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Xóa môn học "${sub.name}" và toàn bộ tri thức bên trong?`)) {
                              onDeleteSubject(sub.id);
                            }
                          }}
                          title="Xóa môn"
                          className="p-1 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MIDDLE SECTION: Uploaded Sources */}
      {activeSubject && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div
            className="flex items-center justify-between px-1 cursor-pointer select-none"
            onClick={() => setIsSourcesOpen((prev) => !prev)}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Tài liệu nguồn
            </span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded-full font-medium">
              {sources.length}
            </span>
          </div>

          {isSourcesOpen && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
              {sources.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic px-1 py-1">
                  Chưa nạp tài liệu nào cho môn này.
                </p>
              ) : (
                sources.map((src) => (
                  <div
                    key={src.id}
                    className="group flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-1.5 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
                  >
                    <a
                      href={src.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate flex items-center gap-1.5 hover:underline"
                      title={src.file_name}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                      <span className="truncate">{src.file_name}</span>
                    </a>
                    {onDeleteSource && (
                      <button
                        onClick={() => onDeleteSource(src.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:text-red-700"
                        title="Xóa nguồn"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM SECTION: Auto-generated Table of Contents */}
      <div className="p-3 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5" />
            Mục lục
          </span>
          <span className="text-[11px] text-slate-400">
            {sections.length} mục
          </span>
        </div>

        <div className="overflow-y-auto space-y-1 flex-1 pr-1">
          {sections.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-2 py-4 text-center">
              Chưa có nội dung. Hãy nạp tài liệu để tổng hợp.
            </p>
          ) : (
            sections.map((sec, idx) => {
              const hasLeadingIndex = /^\d+[.)]\s/.test(sec.title.trim());
              return (
                <a
                  key={sec.id}
                  href={`#section-${sec.id}`}
                  className="block text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 px-2 py-1 rounded truncate transition-colors"
                  title={sec.title}
                >
                  {!hasLeadingIndex && (
                    <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                  )}
                  {sec.title}
                </a>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
