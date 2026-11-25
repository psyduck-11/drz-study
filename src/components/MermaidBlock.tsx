'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

const MERMAID_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

let renderQueue: Promise<void> = Promise.resolve();

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        if (isMounted) setError(null);
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: MERMAID_FONT_FAMILY,
          flowchart: {
            htmlLabels: true,
            padding: 20,
            nodeSpacing: 40,
            rankSpacing: 50,
            useMaxWidth: true,
          },
        });
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.warn('Mermaid rendering error:', err);
        if (isMounted) {
          setError('Không thể kết xuất sơ đồ Mermaid.');
        }
      }
    };

    // Serialize initialize + render calls so concurrent diagrams do not clash on theme config
    renderQueue = renderQueue.then(run, run);

    return () => {
      isMounted = false;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <div className="not-prose my-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md text-sm text-red-600 dark:text-red-400">
        <p>{error}</p>
        <pre className="text-xs mt-2 overflow-x-auto text-gray-700 dark:text-gray-300">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="not-prose my-5 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
