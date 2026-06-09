import { useState, useCallback, useMemo, useRef } from 'react';
import {
  AppShell,
  Group,
  Box,
  Stack,
  Title,
  ScrollArea,
  Badge,
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FabricCanvas } from './components/FabricCanvas';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { PaperSettings } from './components/PaperSettings';
import { IssuesPanel, AnalysisPanel, DiagnosisPanel } from './components/AnalysisPanel';
import type {
  CanvasElement,
  PaperConfig,
  TextElement,
  LeadElement,
  DecorationElement,
  ValidationIssue,
  LayoutAnalysis,
  LayoutDiagnosis,
  OptimizationHistoryEntry,
} from './types';
import { generateId, clamp } from './utils/helpers';
import { analyzeLayout, diagnoseLayout } from './utils/layoutAnalysis';
import { runAllValidations, validateTextOverlap } from './utils/validation';
import { optimizeLayout, optimizeForPaperSize } from './utils/layoutOptimizer';
import { importDesign, downloadDesignFile } from './utils/designStorage';

const DEFAULT_PAPER: PaperConfig = {
  width: 595,
  height: 842,
  backgroundColor: '#ffffff',
};

const MAX_HISTORY_SIZE = 20;

function App() {
  const theme = useMantineTheme();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperConfig>(DEFAULT_PAPER);
  const [zoom, setZoom] = useState(0.8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showOptimizedPreview, setShowOptimizedPreview] = useState(false);

  const prevPaperRef = useRef<PaperConfig>(paper);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedId) || null;
  }, [elements, selectedId]);

  const displayElements = useMemo(() => {
    if (showOptimizedPreview && historyIndex >= 0 && historyIndex < optimizationHistory.length) {
      return optimizationHistory[historyIndex].afterElements;
    }
    return elements;
  }, [showOptimizedPreview, elements, optimizationHistory, historyIndex]);

  const layoutAnalysis: LayoutAnalysis = useMemo(() => {
    return analyzeLayout(displayElements, paper);
  }, [displayElements, paper]);

  const validationIssues: ValidationIssue[] = useMemo(() => {
    return runAllValidations(displayElements, paper);
  }, [displayElements, paper]);

  const layoutDiagnosis: LayoutDiagnosis = useMemo(() => {
    return diagnoseLayout(displayElements, paper);
  }, [displayElements, paper]);

  const optimizedDiagnosis: LayoutDiagnosis | undefined = useMemo(() => {
    if (historyIndex >= 0 && historyIndex < optimizationHistory.length) {
      return diagnoseLayout(optimizationHistory[historyIndex].afterElements, paper);
    }
    return undefined;
  }, [optimizationHistory, historyIndex, paper]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < optimizationHistory.length - 1;

  const pushOptimizationHistory = useCallback((entry: OptimizationHistoryEntry) => {
    setOptimizationHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const updated = [...trimmed, entry];
      if (updated.length > MAX_HISTORY_SIZE) {
        return updated.slice(updated.length - MAX_HISTORY_SIZE);
      }
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [historyIndex]);

  const handleOptimize = useCallback(() => {
    const result = optimizeLayout(elements, paper);

    if (result.changedElementIds.length === 0) {
      notifications.show({
        title: '无需优化',
        message: result.description,
        color: 'green',
      });
      return;
    }

    const entry: OptimizationHistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      beforeElements: [...elements],
      afterElements: result.elements,
      changedElementIds: result.changedElementIds,
      description: result.description,
    };

    pushOptimizationHistory(entry);
    setElements(result.elements);
    setShowOptimizedPreview(false);

    notifications.show({
      title: '优化完成',
      message: result.description,
      color: 'green',
    });
  }, [elements, paper, pushOptimizationHistory]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    const entry = optimizationHistory[historyIndex];
    if (entry) {
      setElements(entry.beforeElements);
      setHistoryIndex((prev) => prev - 1);
      setShowOptimizedPreview(false);

      notifications.show({
        title: '已撤销',
        message: '已恢复到优化前的状态',
        color: 'blue',
      });
    }
  }, [canUndo, optimizationHistory, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    const nextIndex = historyIndex + 1;
    const entry = optimizationHistory[nextIndex];
    if (entry) {
      setElements(entry.afterElements);
      setHistoryIndex(nextIndex);
      setShowOptimizedPreview(false);

      notifications.show({
        title: '已重做',
        message: entry.description,
        color: 'blue',
      });
    }
  }, [canRedo, optimizationHistory, historyIndex]);

  const handleTogglePreview = useCallback((show: boolean) => {
    setShowOptimizedPreview(show);
  }, []);

  const handleAddText = useCallback(() => {
    const newElement: TextElement = {
      id: generateId(),
      type: 'text',
      x: 50,
      y: 50 + elements.length * 30,
      width: 200,
      height: 30,
      rotation: 0,
      text: '请输入文字',
      fontSize: 24,
      fontFamily: 'Georgia',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      fill: '#333333',
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    setOptimizationHistory([]);
    setHistoryIndex(-1);
  }, [elements.length]);

  const handleAddLead = useCallback(() => {
    const newElement: LeadElement = {
      id: generateId(),
      type: 'lead',
      x: 50,
      y: 100 + elements.length * 10,
      width: 200,
      height: 4,
      rotation: 0,
      fill: '#333333',
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    setOptimizationHistory([]);
    setHistoryIndex(-1);
  }, [elements.length]);

  const handleAddDecoration = useCallback(() => {
    const newElement: DecorationElement = {
      id: generateId(),
      type: 'decoration',
      shape: 'rect',
      x: 100,
      y: 100 + elements.length * 20,
      width: 60,
      height: 60,
      rotation: 0,
      fill: 'transparent',
      strokeWidth: 2,
      strokeColor: '#333333',
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    setOptimizationHistory([]);
    setHistoryIndex(-1);
  }, [elements.length]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
    setOptimizationHistory([]);
    setHistoryIndex(-1);
    notifications.show({
      title: '已删除',
      message: '选中的元素已被删除',
      color: 'blue',
    });
  }, [selectedId]);

  const handleElementSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleElementMove = useCallback((id: string, x: number, y: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x: Math.round(x), y: Math.round(y) } : el))
    );
  }, []);

  const handleElementModify = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        if (el.type === 'text') {
          return { ...el, ...updates } as TextElement;
        } else if (el.type === 'lead') {
          return { ...el, ...updates } as LeadElement;
        } else {
          return { ...el, ...updates } as DecorationElement;
        }
      })
    );
  }, []);

  const handleUpdateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) => {
      const element = prev.find((el) => el.id === id);
      if (!element) return prev;

      const updated = { ...element, ...updates } as CanvasElement;

      if (updated.type === 'text') {
        const textEl = updated as TextElement;
        if (textEl.fontSize <= 0) return prev;
      }
      if (updated.width <= 0 || updated.height <= 0) return prev;

      updated.x = clamp(updated.x, 0, paper.width - updated.width);
      updated.y = clamp(updated.y, 0, paper.height - updated.height);

      if (updated.type === 'text') {
        const otherElements = prev.filter((el) => el.id !== id);
        const testElements = [...otherElements, updated];
        const overlapIssues = validateTextOverlap(testElements);
        if (overlapIssues.length > 0) {
          return prev;
        }
      }

      return prev.map((el) => {
        if (el.id !== id) return el;
        if (el.type === 'text') {
          return { ...el, ...updated } as TextElement;
        } else if (el.type === 'lead') {
          return { ...el, ...updated } as LeadElement;
        } else {
          return { ...el, ...updated } as DecorationElement;
        }
      });
    });
  }, [paper.width, paper.height]);

  const handleUpdatePaper = useCallback((newPaper: PaperConfig) => {
    const oldPaper = prevPaperRef.current;

    if (
      (newPaper.width !== oldPaper.width || newPaper.height !== oldPaper.height) &&
      elements.length > 0
    ) {
      const result = optimizeForPaperSize(elements, oldPaper, newPaper);

      setPaper(newPaper);
      setElements(result.elements);
      setOptimizationHistory([]);
      setHistoryIndex(-1);

      const issues = runAllValidations(result.elements, newPaper);
      const overflowIssues = issues.filter((i) => i.type === 'overflow');

      if (overflowIssues.length > 0) {
        notifications.show({
          title: '纸张尺寸已更新',
          message: `${result.description}，但有 ${overflowIssues.length} 个元素超出边界`,
          color: 'yellow',
        });
      } else {
        notifications.show({
          title: '纸张尺寸已更新',
          message: result.description,
          color: 'green',
        });
      }
    } else {
      setPaper(newPaper);
    }

    prevPaperRef.current = newPaper;
  }, [elements]);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadDesignFile(elements, paper, `typography-design-${timestamp}.json`);
    notifications.show({
      title: '导出成功',
      message: '设计方案已导出为 JSON 文件',
      color: 'green',
    });
  }, [elements, paper]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const data = importDesign(content);

      if (data) {
        setElements(data.elements);
        setPaper(data.paper);
        prevPaperRef.current = data.paper;
        setSelectedId(null);
        setOptimizationHistory([]);
        setHistoryIndex(-1);
        notifications.show({
          title: '导入成功',
          message: `成功导入 ${data.elements.length} 个元素`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: '导入失败',
          message: '文件格式不正确或已损坏',
          color: 'red',
        });
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(0.8);
  }, []);

  const isOptimizedState = canUndo;

  return (
    <AppShell
      padding="md"
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      aside={{
        width: 320,
        breakpoint: 'md',
        collapsed: { desktop: false, mobile: true },
      }}
      style={{ background: theme.colors.gray[1] }}
    >
      <AppShell.Header
        style={{
          background: theme.white,
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Title order={3} c="dark">
              活版印刷工作室
            </Title>
            {showOptimizedPreview && (
              <Badge color="blue" variant="light" size="lg">
                预览优化效果
              </Badge>
            )}
          </Group>
          <Toolbar
            onAddText={handleAddText}
            onAddLead={handleAddLead}
            onAddDecoration={handleAddDecoration}
            onDeleteSelected={handleDeleteSelected}
            onExport={handleExport}
            onImport={handleImport}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            zoom={zoom}
            hasSelection={!!selectedId}
          />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea h="100%">
          <Stack gap="md">
            <PaperSettings paper={paper} onUpdatePaper={handleUpdatePaper} />
            <PropertyPanel element={selectedElement} onUpdateElement={handleUpdateElement} />
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            overflow: 'auto',
            padding: theme.spacing.xl,
            background: theme.colors.gray[2],
          }}
        >
          <Box
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              borderRadius: 4,
              overflow: 'hidden',
              transition: 'box-shadow 0.3s',
            }}
          >
            <FabricCanvas
              paper={paper}
              elements={displayElements}
              selectedId={selectedId}
              onElementSelect={handleElementSelect}
              onElementMove={handleElementMove}
              onElementModify={handleElementModify}
              scale={zoom}
            />
          </Box>
        </Box>
      </AppShell.Main>

      <AppShell.Aside p="md">
        <ScrollArea h="100%">
          <Stack gap="md">
            <DiagnosisPanel
              diagnosis={layoutDiagnosis}
              onOptimize={handleOptimize}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              showPreview={showOptimizedPreview}
              onTogglePreview={handleTogglePreview}
              isOptimized={isOptimizedState}
              optimizedScore={optimizedDiagnosis?.overallScore}
            />
            <AnalysisPanel analysis={layoutAnalysis} />
            <IssuesPanel issues={validationIssues} />
          </Stack>
        </ScrollArea>
      </AppShell.Aside>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </AppShell>
  );
}

export default App;
