'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

let mermaidInitialized = false;

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      mermaidInitialized = true;
    }

    let isMounted = true;
    const renderChart = async () => {
      try {
        setError(null);
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

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md text-sm text-red-600 dark:text-red-400">
        <p>{error}</p>
        <pre className="text-xs mt-2 overflow-x-auto text-gray-700 dark:text-gray-300">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-5 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
