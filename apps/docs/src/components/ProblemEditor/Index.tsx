import React, { useState, useRef, useEffect, useCallback } from 'react';
import CodeEditor from '@site/src/components/CoreEditor/Index';
import styles from './styles.module.css';

interface TestCase {
  stdin: string;
  expectedOutput: string;
}

interface ProblemMeta {
  id: string;
  timeLimitSeconds: number;
  memoryLimitKb: number;
}

interface ProblemEditorProps {
  meta: ProblemMeta;
  testCases: TestCase[];
  starterCode: Record<string, string>;
  harness?: Record<string, string>;
  defaultLanguage?: string;
  children: React.ReactNode;
}

const STORAGE_KEY_PREFIX = 'sypher-problem-split-';

/** Left panel width when sidebar is visible (default) vs collapsed */
const DEFAULT_WIDTH_EXPANDED = 28;
const DEFAULT_WIDTH_COLLAPSED = 38;

export default function ProblemEditor({
  meta, testCases, starterCode, harness, defaultLanguage = 'python',
  children,
}: ProblemEditorProps): JSX.Element {
  const storageKey = `${STORAGE_KEY_PREFIX}${meta.id}`;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Math.min(70, Math.max(30, Number(saved)));
    }
    return DEFAULT_WIDTH_EXPANDED;
  });

  // Detect sidebar collapse to adjust IDE width
  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector('.theme-doc-sidebar-container');
      if (sidebar) {
        const width = sidebar.getBoundingClientRect().width;
        const collapsed = width < 50;
        setSidebarCollapsed(collapsed);
        // Only adjust default if user hasn't manually saved a preference
        if (!localStorage.getItem(storageKey)) {
          setLeftWidth(collapsed ? DEFAULT_WIDTH_COLLAPSED : DEFAULT_WIDTH_EXPANDED);
        }
      }
    };
    // Check initial state after a short delay for layout to settle
    const timer = setTimeout(checkSidebar, 100);
    // Watch for resize events that may indicate sidebar toggle
    const observer = new ResizeObserver(checkSidebar);
    const sidebar = document.querySelector('.theme-doc-sidebar-container');
    if (sidebar) observer.observe(sidebar);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [storageKey]);

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setLeftWidth(Math.min(70, Math.max(30, percent)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setLeftWidth((current) => {
        localStorage.setItem(storageKey, String(Math.round(current)));
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, storageKey]);

  return (
      <div className={styles.container} ref={containerRef}>
        <div
          className={styles.leftPanel}
          style={{ flexBasis: `${leftWidth}%` }}
        >
          {children}
        </div>
        <div
          className={`${styles.divider} ${isDragging ? styles.dividerActive : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.dividerHandle} />
        </div>
        <div className={styles.rightPanel}>
          <CodeEditor
            meta={meta}
            testCases={testCases}
            starterCode={starterCode}
            harness={harness}
            defaultLanguage={defaultLanguage}
          />
        </div>
      </div>
  );
}