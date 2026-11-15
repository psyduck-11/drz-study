'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidBlock } from './MermaidBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return <MermaidBlock chart={codeContent} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img({ node, src, alt, ...props }) {
            return (
              <figure className="my-6 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt || 'Minh họa tài liệu'}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 max-h-[500px] w-auto mx-auto shadow-sm object-contain"
                  loading="lazy"
                  {...props}
                />
                {alt && (
                  <figcaption className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                    {alt}
                  </figcaption>
                )}
              </figure>
            );
          },
          table({ node, ...props }) {
            return (
              <div className="overflow-x-auto my-6 border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-sm" {...props} />
              </div>
            );
          },
          th({ node, ...props }) {
            return (
              <th
                className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800"
                {...props}
              />
            );
          },
          td({ node, ...props }) {
            return (
              <td
                className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/60"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
