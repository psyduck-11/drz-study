'use client';

import React, { useState, useRef } from 'react';
import { Subject, WikiSection } from '@/types/database';
import { renderPdfFile, renderImageFile, RenderedPage } from '@/lib/pdf-renderer';
import { cropCanvasBox2d } from '@/lib/canvas-cropper';
import { uploadSourceFile, uploadCroppedIllustration } from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Source } from '@/types/database';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

interface DocumentIngestionModalProps {
  isOpen: boolean;
  activeSubject: Subject | null;
  existingSections: WikiSection[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type IngestionStage =
  | 'idle'
  | 'uploading_source'
  | 'rendering_pages'
  | 'analyzing_ai'
  | 'cropping_images'
  | 'synthesizing_db'
  | 'done'
  | 'error';

export const DocumentIngestionModal: React.FC<DocumentIngestionModalProps> = ({
  isOpen,
  activeSubject,
  existingSections,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<IngestionStage>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  const handleStartIngest = async () => {
    if (!file || !activeSubject) return;

    try {
      setErrorMessage(null);

      // Stage 1: Upload original source file
      setStage('uploading_source');
      setStatusMessage('Đang lưu tệp gốc vào Supabase Storage...');
      const sourceUrl = await uploadSourceFile(file, activeSubject.id);

      // Record source in database or local storage
      if (isSupabaseConfigured) {
        await supabase.from('sources').insert({
          subject_id: activeSubject.id,
          file_name: file.name,
          file_url: sourceUrl,
        });
      } else {
        const newSource: Source = {
          id: `src-${Date.now()}`,
          subject_id: activeSubject.id,
          file_name: file.name,
          file_url: sourceUrl,
          created_at: new Date().toISOString(),
        };
        const stored = localStorage.getItem(`living_wiki_sources_${activeSubject.id}`);
        const list: Source[] = stored ? JSON.parse(stored) : [];
        list.unshift(newSource);
        localStorage.setItem(`living_wiki_sources_${activeSubject.id}`, JSON.stringify(list));
      }

      // Stage 2: Render pages via PDF.js or Image loader
      setStage('rendering_pages');
      setStatusMessage('Đang kết xuất các trang tài liệu (độ phân giải 2.0x)...');
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      let renderedPages: RenderedPage[] = [];
      if (isPdf) {
        renderedPages = await renderPdfFile(file, (curr, total) => {
          setStatusMessage(`Đang kết xuất trang ${curr}/${total} (PDF.js 2.0x)...`);
        });
      } else {
        renderedPages = await renderImageFile(file);
      }

      if (renderedPages.length === 0) {
        throw new Error('Không thể kết xuất hình ảnh từ tài liệu đã chọn.');
      }

      // Stage 3: Call AI Ingest API with pages and existing sections outline
      setStage('analyzing_ai');
      setStatusMessage('Vision AI đang phân tích tri thức & phát hiện sơ đồ...');

      const sectionsOutline = existingSections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        outline: sec.content_markdown.substring(0, 300),
      }));

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: activeSubject.id,
          fileName: file.name,
          pages: renderedPages.map((p) => ({
            pageNumber: p.pageNumber,
            dataUrl: p.dataUrl,
          })),
          existingSections: sectionsOutline,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Quá trình phân tích AI thất bại.');
      }

      const actions = data.actions || [];

      // Stage 4: Crop illustrations (box_2d) and upload to Storage
      setStage('cropping_images');
      setStatusMessage('Đang cắt sơ đồ trực quan và tải lên bộ lưu trữ...');

      const processedActions = [];

      for (const actionItem of actions) {
        let finalMarkdown = actionItem.content_markdown;

        if (actionItem.illustrations && actionItem.illustrations.length > 0) {
          for (let i = 0; i < actionItem.illustrations.length; i++) {
            const ill = actionItem.illustrations[i];
            const matchedPage = renderedPages.find((p) => p.pageNumber === ill.page_number) || renderedPages[0];

            if (matchedPage) {
              try {
                // Crop with 10px padding from canvas
                const croppedBlob = await cropCanvasBox2d(matchedPage.canvas, ill.box_2d, 10);
                // Upload to wiki-assets
                const publicUrl = await uploadCroppedIllustration(
                  croppedBlob,
                  activeSubject.id,
                  ill.page_number,
                  i
                );
                // Embed directly beneath explanation in Markdown if placeholder exists, else append
                const placeholder = `[HÌNH_MINH_HỌA_${i + 1}]`;
                const illustrationMarkdown = `\n\n![${ill.caption}](${publicUrl})\n*Hình: ${ill.caption}*\n\n`;

                if (finalMarkdown.includes(placeholder)) {
                  finalMarkdown = finalMarkdown.replace(placeholder, illustrationMarkdown);
                } else {
                  finalMarkdown += illustrationMarkdown;
                }
              } catch (cropErr) {
                console.warn('Lỗi khi cắt sơ đồ:', cropErr);
              }
            }
          }
        }

        processedActions.push({
          ...actionItem,
          content_markdown: finalMarkdown,
        });
      }

      // Stage 5: Apply Non-Destructive Incremental Synthesis (Anti-Truncation)
      setStage('synthesizing_db');
      setStatusMessage('Đang áp dụng tổng hợp tri thức không-phá-hủy...');

      let currentMaxOrder = existingSections.length > 0
        ? Math.max(...existingSections.map((s) => s.order_index))
        : -1;

      let localSections = [...existingSections];

      for (const item of processedActions) {
        if (item.action === 'CREATE' || !item.target_section_id) {
          // CREATE action: Add new section
          currentMaxOrder += 1;
          if (isSupabaseConfigured) {
            await supabase.from('wiki_sections').insert({
              subject_id: activeSubject.id,
              title: item.title,
              order_index: currentMaxOrder,
              content_markdown: item.content_markdown,
            });
          } else {
            localSections.push({
              id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              subject_id: activeSubject.id,
              title: item.title,
              order_index: currentMaxOrder,
              content_markdown: item.content_markdown,
              updated_at: new Date().toISOString(),
            });
          }
        } else if (item.action === 'APPEND' && item.target_section_id) {
          // APPEND action: Preserve 100% prior knowledge!
          if (isSupabaseConfigured) {
            const { data: targetSection } = await supabase
              .from('wiki_sections')
              .select('content_markdown')
              .eq('id', item.target_section_id)
              .single();

            const existingContent = targetSection?.content_markdown || '';
            const concatenatedContent = `${existingContent}\n\n${item.content_markdown}`.trim();

            await supabase
              .from('wiki_sections')
              .update({
                content_markdown: concatenatedContent,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.target_section_id);
          } else {
            localSections = localSections.map((sec) => {
              if (sec.id === item.target_section_id) {
                return {
                  ...sec,
                  content_markdown: `${sec.content_markdown}\n\n${item.content_markdown}`.trim(),
                  updated_at: new Date().toISOString(),
                };
              }
              return sec;
            });
          }
        }
      }

      if (!isSupabaseConfigured) {
        localStorage.setItem(`living_wiki_sections_${activeSubject.id}`, JSON.stringify(localSections));
      }

      setStage('done');
      setStatusMessage('Tổng hợp tri thức thành công!');
      setTimeout(async () => {
        await onSuccess();
        onClose();
        setStage('idle');
        setFile(null);
      }, 1200);
    } catch (err: any) {
      console.error('Lỗi quy trình nạp tài liệu:', err);
      setStage('error');
      setErrorMessage(err.message || 'Đã xảy ra lỗi không xác định.');
    }
  };

  const isProcessing = stage !== 'idle' && stage !== 'done' && stage !== 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Nạp tài liệu học tập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Môn học: <strong className="text-slate-700 dark:text-slate-300">{activeSubject?.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                {file.name.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-10 h-10 text-red-500 mb-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-blue-500 mb-2" />
                )}
                <span className="font-medium text-sm text-slate-800 dark:text-slate-200 break-all">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={isProcessing}
                  className="mt-3 text-xs text-red-500 hover:underline"
                >
                  Chọn tệp khác
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                  Kéo thả tệp PDF hoặc ảnh (.png, .jpg, .webp) vào đây
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  hoặc bấm để duyệt tệp từ thiết bị của bạn
                </span>
              </div>
            )}
          </div>

          {/* Progress / Status Display */}
          {stage !== 'idle' && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5 text-xs">
                {isProcessing && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                {stage === 'done' && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                {stage === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {statusMessage}
                </span>
              </div>

              {errorMessage && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 pl-6">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          {/* Guidelines info */}
          <div className="mt-4 text-[11px] text-slate-400 space-y-1">
            <p>• <strong>Quy tắc Anti-Truncation:</strong> Kiến thức cũ được bảo toàn 100%, nội dung mới sẽ được tạo chương riêng hoặc ghép nối chính xác.</p>
            <p>• <strong>Sơ đồ & Hình vẽ:</strong> Tự động cắt bằng canvas 2.0x hoặc bổ sung sơ đồ Mermaid nếu tài liệu thiếu hình ảnh.</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
          >
            Đóng
          </button>
          <button
            onClick={handleStartIngest}
            disabled={!file || isProcessing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-40"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Bắt đầu nạp & Tổng hợp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
