'use client';

import React, { useState } from 'react';
import { WikiSection } from '@/types/database';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Edit2, Check, X, Trash2, ArrowUp, ArrowDown, Eye, Code } from 'lucide-react';

interface SectionItemProps {
  section: WikiSection;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, newTitle: string, newContent: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: 'up' | 'down') => Promise<void>;
}

export const SectionItem: React.FC<SectionItemProps> = ({
  section,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content_markdown);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      setIsSaving(true);
      await onUpdate(section.id, title, content);
      setIsEditing(false);
    } catch (err) {
      console.error('Lỗi khi lưu mục:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(section.title);
    setContent(section.content_markdown);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mục "${section.title}" không?`)) {
      await onDelete(section.id);
    }
  };

  return (
    <article
      id={`section-${section.id}`}
      className="group relative scroll-mt-24 pb-12 mb-12 border-b border-slate-200 dark:border-slate-800 last:border-b-0"
    >
      {/* View Mode */}
      {!isEditing ? (
        <div>
          {/* Header row with Title & Action buttons */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {section.title}
            </h2>

            {/* Manual controls toolbar - Subtle on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs text-slate-600 dark:text-slate-300">
              <button
                onClick={() => onMove(section.id, 'up')}
                disabled={isFirst}
                title="Di chuyển lên"
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMove(section.id, 'down')}
                disabled={isLast}
                title="Di chuyển xuống"
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 my-auto mx-0.5" />
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded font-medium text-slate-700 dark:text-slate-200"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
          </div>

          {/* Rendered Markdown Body */}
          <MarkdownRenderer content={section.content_markdown} />
        </div>
      ) : (
        /* Inline Editor Mode */
        <div className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-md">
          <div className="flex items-center justify-between gap-4 mb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề mục..."
              className="text-lg font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 w-full text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Tab switch for live preview */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('editor')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  previewTab === 'editor'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  previewTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Xem trước
              </button>
            </div>
          </div>

          {previewTab === 'editor' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Nội dung Markdown, KaTeX ($...$, $$...$$), công thức..."
              className="w-full font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          ) : (
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg max-h-96 overflow-y-auto">
              <MarkdownRenderer content={content} />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa mục này</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
