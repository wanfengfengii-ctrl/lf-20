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
  HistoryEntry,
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

const MAX_HISTORY_SIZE = 50;

function App() {
  const theme = useMantineTheme();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperConfig>(DEFAULT_PAPER);
  const [zoom, setZoom] = useState(0.8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showCompareView, setShowCompareView] = useState(false);
  const isProgrammaticChangeRef = useRef(false);
  const elementsBeforeModifyRef = useRef<CanvasElement[] | null>(null);

  const prevPaperRef = useRef<PaperConfig>(paper);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedId) || null;
  }, [elements, selectedId]);

  const layoutAnalysis: LayoutAnalysis = useMemo(() => {
    return analyzeLayout(elements, paper);
  }, [elements, paper]);

  const validationIssues: ValidationIssue[] = useMemo(() => {
    return runAllValidations(elements, paper);
  }, [elements, paper]);

  const layoutDiagnosis: LayoutDiagnosis = useMemo(() => {
    return diagnoseLayout(elements, paper);
  }, [elements, paper]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const lastOptimizeEntry = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].type === 'optimize') {
        return history[i];
      }
    }
    return null;
  }, [history]);

  const compareBeforeElements = useMemo(() => {
    if (!showCompareView || !lastOptimizeEntry) return null;
    return lastOptimizeEntry.beforeElements;
  }, [showCompareView, lastOptimizeEntry]);

  const compareAfterElements = useMemo(() => {
    if (!showCompareView || !lastOptimizeEntry) return null;
    return lastOptimizeEntry.afterElements;
  }, [showCompareView, lastOptimizeEntry]);

  const pushHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    if (isProgrammaticChangeRef.current) return;

    const fullEntry: HistoryEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const updated = [...trimmed, fullEntry];
      if (updated.length > MAX_HISTORY_SIZE) {
        return updated.slice(updated.length - MAX_HISTORY_SIZE);
      }
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    const entry = history[historyIndex];
    if (!entry) return;

    isProgrammaticChangeRef.current = true;

    setElements(entry.beforeElements);

    if (entry.beforePaper) {
      setPaper(entry.beforePaper);
      prevPaperRef.current = entry.beforePaper;
    }

    setHistoryIndex((prev) => prev - 1);
    setShowCompareView(false);

    isProgrammaticChangeRef.current = false;

    notifications.show({
      title: '已撤销',
      message: entry.description,
      color: 'blue',
    });
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    if (!entry) return;

    isProgrammaticChangeRef.current = true;

    setElements(entry.afterElements);

    if (entry.afterPaper) {
      setPaper(entry.afterPaper);
      prevPaperRef.current = entry.afterPaper;
    }

    setHistoryIndex(nextIndex);
    setShowCompareView(false);

    isProgrammaticChangeRef.current = false;

    notifications.show({
      title: '已重做',
      message: entry.description,
      color: 'blue',
    });
  }, [canRedo, history, historyIndex]);

  const handleOptimize = useCallback(() => {
    const beforeElements = [...elements];
    const result = optimizeLayout(elements, paper);

    if (result.changedElementIds.length === 0) {
      notifications.show({
        title: '无需优化',
        message: result.description,
        color: 'green',
      });
      return;
    }

    pushHistory({
      type: 'optimize',
      description: result.description,
      beforeElements,
      afterElements: result.elements,
      changedElementIds: result.changedElementIds,
    });

    setElements(result.elements);

    notifications.show({
      title: '优化完成',
      message: result.description,
      color: 'green',
    });
  }, [elements, paper, pushHistory]);

  const handleToggleCompare = useCallback((show: boolean) => {
    setShowCompareView(show);
  }, []);

  const handleAddText = useCallback(() => {
    const beforeElements = [...elements];
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
    const afterElements = [...beforeElements, newElement];

    pushHistory({
      type: 'add',
      description: '添加文字块',
      beforeElements,
      afterElements,
      changedElementIds: [newElement.id],
    });

    setElements(afterElements);
    setSelectedId(newElement.id);
    setShowCompareView(false);
  }, [elements, pushHistory]);

  const handleAddLead = useCallback(() => {
    const beforeElements = [...elements];
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
    const afterElements = [...beforeElements, newElement];

    pushHistory({
      type: 'add',
      description: '添加铅条',
      beforeElements,
      afterElements,
      changedElementIds: [newElement.id],
    });

    setElements(afterElements);
    setSelectedId(newElement.id);
    setShowCompareView(false);
  }, [elements, pushHistory]);

  const handleAddDecoration = useCallback(() => {
    const beforeElements = [...elements];
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
    const afterElements = [...beforeElements, newElement];

    pushHistory({
      type: 'add',
      description: '添加装饰元素',
      beforeElements,
      afterElements,
      changedElementIds: [newElement.id],
    });

    setElements(afterElements);
    setSelectedId(newElement.id);
    setShowCompareView(false);
  }, [elements, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;

    const beforeElements = [...elements];
    const afterElements = beforeElements.filter((e) => e.id !== selectedId);

    pushHistory({
      type: 'delete',
      description: '删除选中元素',
      beforeElements,
      afterElements,
      changedElementIds: [selectedId],
    });

    setElements(afterElements);
    setSelectedId(null);
    setShowCompareView(false);

    notifications.show({
      title: '已删除',
      message: '选中的元素已被删除',
      color: 'blue',
    });
  }, [selectedId, elements, pushHistory]);

  const handleElementSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleModifyStart = useCallback(() => {
    if (isProgrammaticChangeRef.current) return;
    elementsBeforeModifyRef.current = [...elements];
  }, [elements]);

  const handleElementMove = useCallback((id: string, x: number, y: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x: Math.round(x), y: Math.round(y) } : el))
    );
  }, []);

  const handleElementModify = useCallback((id: string, updates: Partial<CanvasElement>) => {
    const beforeElements = elementsBeforeModifyRef.current || [...elements];
    const afterElements = beforeElements.map((el) => {
      if (el.id !== id) return el;
      if (el.type === 'text') {
        return { ...el, ...updates } as TextElement;
      } else if (el.type === 'lead') {
        return { ...el, ...updates } as LeadElement;
      } else {
        return { ...el, ...updates } as DecorationElement;
      }
    });

    pushHistory({
      type: 'modify',
      description: '修改元素',
      beforeElements,
      afterElements,
      changedElementIds: [id],
    });

    setElements(afterElements);
    elementsBeforeModifyRef.current = null;
    setShowCompareView(false);
  }, [elements, pushHistory]);

  const handleUpdateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    const updated = { ...element, ...updates } as CanvasElement;

    if (updated.type === 'text') {
      const textEl = updated as TextElement;
      if (textEl.fontSize <= 0) return;
    }
    if (updated.width <= 0 || updated.height <= 0) return;

    updated.x = clamp(updated.x, 0, paper.width - updated.width);
    updated.y = clamp(updated.y, 0, paper.height - updated.height);

    if (updated.type === 'text') {
      const otherElements = elements.filter((el) => el.id !== id);
      const testElements = [...otherElements, updated];
      const overlapIssues = validateTextOverlap(testElements);
      if (overlapIssues.length > 0) {
        return;
      }
    }

    const beforeElements = [...elements];
    const afterElements = beforeElements.map((el) => {
      if (el.id !== id) return el;
      if (el.type === 'text') {
        return { ...el, ...updated } as TextElement;
      } else if (el.type === 'lead') {
        return { ...el, ...updated } as LeadElement;
      } else {
        return { ...el, ...updated } as DecorationElement;
      }
    });

    pushHistory({
      type: 'modify',
      description: '修改元素属性',
      beforeElements,
      afterElements,
      changedElementIds: [id],
    });

    setElements(afterElements);
    setShowCompareView(false);
  }, [elements, paper.width, paper.height, pushHistory]);

  const handleUpdatePaper = useCallback((newPaper: PaperConfig) => {
    const oldPaper = prevPaperRef.current;

    if (
      (newPaper.width !== oldPaper.width || newPaper.height !== oldPaper.height) &&
      elements.length > 0
    ) {
      const beforeElements = [...elements];
      const result = optimizeForPaperSize(elements, oldPaper, newPaper);

      pushHistory({
        type: 'paper_change',
        description: result.description,
        beforeElements,
        afterElements: result.elements,
        beforePaper: oldPaper,
        afterPaper: newPaper,
      });

      setPaper(newPaper);
      setElements(result.elements);
      setShowCompareView(false);

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
      const oldPaperCopy = { ...oldPaper };
      pushHistory({
        type: 'paper_change',
        description: '修改纸张设置',
        beforeElements: [...elements],
        afterElements: [...elements],
        beforePaper: oldPaperCopy,
        afterPaper: newPaper,
      });
      setPaper(newPaper);
    }

    prevPaperRef.current = newPaper;
  }, [elements, pushHistory]);

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
        const beforeElements = [...elements];
        const beforePaper = { ...paper };

        setElements(data.elements);
        setPaper(data.paper);
        prevPaperRef.current = data.paper;
        setSelectedId(null);
        setHistory([]);
        setHistoryIndex(-1);
        setShowCompareView(false);

        pushHistory({
          type: 'import',
          description: `导入设计文件 (${data.elements.length} 个元素)`,
          beforeElements,
          afterElements: data.elements,
          beforePaper,
          afterPaper: data.paper,
        });

        notifications.show({
          title: '导入成功',
          message: `成功导入 ${data.elements.length} 个元素`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: '导入失败',
          message: '文件格式不正确或数据不完整',
          color: 'red',
        });
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [elements, paper, pushHistory]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(0.8);
  }, []);

  const hasOptimizeHistory = lastOptimizeEntry !== null;

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
            {showCompareView && (
              <Badge color="violet" variant="light" size="lg">
                优化前后对比视图
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
            gap: theme.spacing.lg,
          }}
        >
          {showCompareView && compareBeforeElements && compareAfterElements ? (
            <>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm }}>
                <Badge color="gray" variant="light" size="lg">
                  优化前
                </Badge>
                <Box
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <FabricCanvas
                    paper={paper}
                    elements={compareBeforeElements}
                    selectedId={null}
                    onElementSelect={() => {}}
                    onElementMove={() => {}}
                    onElementModify={() => {}}
                    scale={zoom}
                  />
                </Box>
              </Box>
              <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm }}>
                <Badge color="green" variant="light" size="lg">
                  优化后
                </Badge>
                <Box
                  style={{
                    boxShadow: '0 4px 20px rgba(0, 120, 0, 0.25)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    outline: `3px solid ${theme.colors.green[5]}`,
                  }}
                >
                  <FabricCanvas
                    paper={paper}
                    elements={compareAfterElements}
                    selectedId={null}
                    onElementSelect={() => {}}
                    onElementMove={() => {}}
                    onElementModify={() => {}}
                    scale={zoom}
                  />
                </Box>
              </Box>
            </>
          ) : (
            <Box
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <FabricCanvas
                paper={paper}
                elements={elements}
                selectedId={selectedId}
                onElementSelect={handleElementSelect}
                onElementMove={handleElementMove}
                onElementModify={handleElementModify}
                onModifyStart={handleModifyStart}
                scale={zoom}
              />
            </Box>
          )}
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
              showPreview={showCompareView}
              onTogglePreview={handleToggleCompare}
              isOptimized={hasOptimizeHistory}
              optimizedScore={lastOptimizeEntry ? diagnoseLayout(lastOptimizeEntry.afterElements, paper).overallScore : undefined}
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
