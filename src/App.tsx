import { useState, useCallback, useMemo, useRef } from 'react';
import {
  AppShell,
  Group,
  Box,
  Stack,
  Title,
  ScrollArea,
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FabricCanvas } from './components/FabricCanvas';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { PaperSettings } from './components/PaperSettings';
import { IssuesPanel, AnalysisPanel } from './components/AnalysisPanel';
import type {
  CanvasElement,
  PaperConfig,
  TextElement,
  LeadElement,
  DecorationElement,
  ValidationIssue,
  LayoutAnalysis,
} from './types';
import { generateId } from './utils/helpers';
import { analyzeLayout } from './utils/layoutAnalysis';
import { runAllValidations } from './utils/validation';
import { importDesign, downloadDesignFile } from './utils/designStorage';

const DEFAULT_PAPER: PaperConfig = {
  width: 595,
  height: 842,
  backgroundColor: '#ffffff',
};

function App() {
  const theme = useMantineTheme();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperConfig>(DEFAULT_PAPER);
  const [zoom, setZoom] = useState(0.8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedId) || null;
  }, [elements, selectedId]);

  const layoutAnalysis: LayoutAnalysis = useMemo(() => {
    return analyzeLayout(elements, paper);
  }, [elements, paper]);

  const validationIssues: ValidationIssue[] = useMemo(() => {
    return runAllValidations(elements, paper);
  }, [elements, paper]);

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
  }, [elements.length]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
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

  const handleUpdatePaper = useCallback((newPaper: PaperConfig) => {
    setPaper(newPaper);
    const issues = runAllValidations(elements, newPaper);
    const overflowIssues = issues.filter((i) => i.type === 'overflow');
    if (overflowIssues.length > 0) {
      notifications.show({
        title: '警告',
        message: `有 ${overflowIssues.length} 个元素超出新纸张边界`,
        color: 'yellow',
      });
    }
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
        setSelectedId(null);
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
        width: 300,
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
            }}
          >
            <FabricCanvas
              paper={paper}
              elements={elements}
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
