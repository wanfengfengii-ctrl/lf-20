import { useState, useCallback, useMemo, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import type {
  CanvasElement,
  PaperConfig,
  HistoryEntry,
  DesignTemplate,
  DesignData,
  TextElement,
  LeadElement,
  DecorationElement,
  LayoutAnalysis,
  LayoutDiagnosis,
  ValidationIssue,
} from '../types';
import { useHistory } from './useHistory';
import { useCanvasState } from './useCanvasState';
import {
  cloneElements,
} from '../services/elementService';
import {
  performFullAnalysis,
  performLayoutAnalysis,
  performLayoutDiagnosis,
  runValidations,
} from '../services/analysisService';
import {
  applyTemplateAsNewDesign,
  createThumbnail,
  computeTemplateDiff,
  previewTemplateApplication,
  markTemplateUsed,
} from '../services/templateService';
import {
  downloadAsFile,
  saveToLibrary,
  importFromFile,
  getLibraryDesigns,
} from '../services/importExportService';

export interface AppState {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedElement: CanvasElement | null;
  paper: PaperConfig;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  showCompareView: boolean;
  templateModalOpened: boolean;
  layoutAnalysis: LayoutAnalysis;
  validationIssues: ValidationIssue[];
  layoutDiagnosis: LayoutDiagnosis;
  lastOptimizeEntry: HistoryEntry | null;
  compareBeforeElements: CanvasElement[] | null;
  compareAfterElements: CanvasElement[] | null;
  hasOptimizeHistory: boolean;
  optimizedScore: number | undefined;
}

export interface AppActions {
  selectElement: (id: string | null) => void;
  addText: () => void;
  addLead: () => void;
  addDecoration: () => void;
  deleteSelected: () => void;
  handleElementMove: (id: string, x: number, y: number) => void;
  handleElementModify: (id: string, updates: Partial<CanvasElement>) => void;
  handleUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  handleModifyStart: () => void;
  handleOptimize: () => void;
  handleToggleCompare: (show: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleUpdatePaper: (newPaper: PaperConfig) => void;
  handleExport: () => void;
  handleImport: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenTemplates: () => void;
  handleCloseTemplates: () => void;
  handleSaveToLibrary: () => Promise<void>;
  handleApplyTemplate: (template: DesignTemplate) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
}

export function useAppState() {
  const canvasState = useCanvasState();
  const history = useHistory();

  const [zoom, setZoom] = useState(0.8);
  const [showCompareView, setShowCompareView] = useState(false);
  const [templateModalOpened, setTemplateModalOpened] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastOptimizeEntry = useMemo(() => {
    return history.getEntryByType('optimize');
  }, [history]);

  const compareBeforeElements = useMemo(() => {
    if (!showCompareView || !lastOptimizeEntry) return null;
    return lastOptimizeEntry.beforeElements;
  }, [showCompareView, lastOptimizeEntry]);

  const compareAfterElements = useMemo(() => {
    if (!showCompareView || !lastOptimizeEntry) return null;
    return lastOptimizeEntry.afterElements;
  }, [showCompareView, lastOptimizeEntry]);

  const layoutAnalysis: LayoutAnalysis = useMemo(() => {
    return performLayoutAnalysis(canvasState.elements, canvasState.paper);
  }, [canvasState.elements, canvasState.paper]);

  const validationIssues: ValidationIssue[] = useMemo(() => {
    return runValidations(canvasState.elements, canvasState.paper);
  }, [canvasState.elements, canvasState.paper]);

  const layoutDiagnosis: LayoutDiagnosis = useMemo(() => {
    return performLayoutDiagnosis(canvasState.elements, canvasState.paper);
  }, [canvasState.elements, canvasState.paper]);

  const hasOptimizeHistory = lastOptimizeEntry !== null;

  const optimizedScore = useMemo(() => {
    if (!lastOptimizeEntry) return undefined;
    return performLayoutDiagnosis(lastOptimizeEntry.afterElements, canvasState.paper).overallScore;
  }, [lastOptimizeEntry, canvasState.paper]);

  const pushHistoryWithState = useCallback(
    (
      type: HistoryEntry['type'],
      description: string,
      beforeElements: CanvasElement[],
      afterElements: CanvasElement[],
      options?: {
        beforePaper?: PaperConfig;
        afterPaper?: PaperConfig;
        changedElementIds?: string[];
      }
    ) => {
      history.pushHistory({
        type,
        description,
        beforeElements,
        afterElements,
        beforePaper: options?.beforePaper,
        afterPaper: options?.afterPaper,
        changedElementIds: options?.changedElementIds,
      });
    },
    [history]
  );

  const selectElement = useCallback((id: string | null) => {
    canvasState.actions.selectElement(id);
  }, [canvasState]);

  const addText = useCallback(() => {
    const beforeElements = cloneElements(canvasState.elements);
    const newElement = canvasState.actions.addTextElement();

    pushHistoryWithState(
      'add',
      '添加文字块',
      beforeElements,
      [...beforeElements, newElement],
      { changedElementIds: [newElement.id] }
    );
    setShowCompareView(false);
  }, [canvasState, pushHistoryWithState]);

  const addLead = useCallback(() => {
    const beforeElements = cloneElements(canvasState.elements);
    const newElement = canvasState.actions.addLeadElement();

    pushHistoryWithState(
      'add',
      '添加铅条',
      beforeElements,
      [...beforeElements, newElement],
      { changedElementIds: [newElement.id] }
    );
    setShowCompareView(false);
  }, [canvasState, pushHistoryWithState]);

  const addDecoration = useCallback(() => {
    const beforeElements = cloneElements(canvasState.elements);
    const newElement = canvasState.actions.addDecorationElement();

    pushHistoryWithState(
      'add',
      '添加装饰元素',
      beforeElements,
      [...beforeElements, newElement],
      { changedElementIds: [newElement.id] }
    );
    setShowCompareView(false);
  }, [canvasState, pushHistoryWithState]);

  const deleteSelected = useCallback(() => {
    if (!canvasState.selectedId) return;

    const beforeElements = cloneElements(canvasState.elements);
    const deletedId = canvasState.actions.deleteSelected();

    if (deletedId) {
      pushHistoryWithState(
        'delete',
        '删除选中元素',
        beforeElements,
        beforeElements.filter((e) => e.id !== deletedId),
        { changedElementIds: [deletedId] }
      );
      setShowCompareView(false);

      notifications.show({
        title: '已删除',
        message: '选中的元素已被删除',
        color: 'blue',
      });
    }
  }, [canvasState, pushHistoryWithState]);

  const handleElementMove = useCallback(
    (id: string, x: number, y: number) => {
      canvasState.actions.moveElementById(id, x, y);
    },
    [canvasState]
  );

  const handleModifyStart = useCallback(() => {
    if (history.isProgrammaticChangeRef.current) return;
    canvasState.actions.startModify();
  }, [canvasState, history]);

  const handleElementModify = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      const beforeElements = canvasState.elementsBeforeModifyRef.current || cloneElements(canvasState.elements);
      canvasState.actions.modifyElement(id, updates);
      const afterElements = canvasState.elements;

      pushHistoryWithState(
        'modify',
        '修改元素',
        beforeElements,
        afterElements,
        { changedElementIds: [id] }
      );

      canvasState.actions.endModify(id);
      setShowCompareView(false);
    },
    [canvasState, pushHistoryWithState]
  );

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      const beforeElements = cloneElements(canvasState.elements);
      const success = canvasState.actions.updateElementWithValidation(id, updates);

      if (success) {
        const afterElements = canvasState.elements;
        pushHistoryWithState(
          'modify',
          '修改元素属性',
          beforeElements,
          afterElements,
          { changedElementIds: [id] }
        );
        setShowCompareView(false);
      }
    },
    [canvasState, pushHistoryWithState]
  );

  const handleOptimize = useCallback(() => {
    const beforeElements = cloneElements(canvasState.elements);
    const result = canvasState.actions.optimizeLayout();

    if (!result.changed) {
      notifications.show({
        title: '无需优化',
        message: result.description,
        color: 'green',
      });
      return;
    }

    pushHistoryWithState(
      'optimize',
      result.description,
      beforeElements,
      result.elements,
      { changedElementIds: [] }
    );

    notifications.show({
      title: '优化完成',
      message: result.description,
      color: 'green',
    });
  }, [canvasState, pushHistoryWithState]);

  const handleToggleCompare = useCallback((show: boolean) => {
    setShowCompareView(show);
  }, []);

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (!entry) return;

    history.setProgrammaticChange(true);

    canvasState.actions.setElements(entry.beforeElements);

    if (entry.beforePaper) {
      canvasState.actions.setPaper(entry.beforePaper);
    }

    setShowCompareView(false);
    history.setProgrammaticChange(false);

    notifications.show({
      title: '已撤销',
      message: entry.description,
      color: 'blue',
    });
  }, [canvasState, history]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (!entry) return;

    history.setProgrammaticChange(true);

    canvasState.actions.setElements(entry.afterElements);

    if (entry.afterPaper) {
      canvasState.actions.setPaper(entry.afterPaper);
    }

    setShowCompareView(false);
    history.setProgrammaticChange(false);

    notifications.show({
      title: '已重做',
      message: entry.description,
      color: 'blue',
    });
  }, [canvasState, history]);

  const handleUpdatePaper = useCallback(
    (newPaper: PaperConfig) => {
      const oldPaper = canvasState.prevPaperRef.current;
      const beforeElements = cloneElements(canvasState.elements);

      const result = canvasState.actions.updatePaperWithOptimization(newPaper);

      if (result.changed) {
        pushHistoryWithState(
          'paper_change',
          result.description,
          beforeElements,
          result.elements,
          {
            beforePaper: oldPaper,
            afterPaper: newPaper,
          }
        );
        setShowCompareView(false);

        const issues = runValidations(result.elements, newPaper);
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
        pushHistoryWithState(
          'paper_change',
          '修改纸张设置',
          beforeElements,
          beforeElements,
          {
            beforePaper: { ...oldPaper },
            afterPaper: newPaper,
          }
        );
      }
    },
    [canvasState, pushHistoryWithState]
  );

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadAsFile(
      canvasState.elements,
      canvasState.paper,
      `typography-design-${timestamp}.json`
    );
    notifications.show({
      title: '导出成功',
      message: '设计方案已导出为 JSON 文件',
      color: 'green',
    });
  }, [canvasState]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const data = await importFromFile(file);

        if (data) {
          const beforeElements = cloneElements(canvasState.elements);
          const beforePaper = { ...canvasState.paper };

          canvasState.actions.setElements(data.elements);
          canvasState.actions.setPaper(data.paper);
          canvasState.actions.setSelectedId(null);
          history.resetHistory();
          setShowCompareView(false);

          pushHistoryWithState(
            'import',
            `导入设计文件 (${data.elements.length} 个元素)`,
            beforeElements,
            data.elements,
            {
              beforePaper,
              afterPaper: data.paper,
            }
          );

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
      } catch {
        notifications.show({
          title: '导入失败',
          message: '读取文件时出错',
          color: 'red',
        });
      }

      e.target.value = '';
    },
    [canvasState, history, pushHistoryWithState]
  );

  const handleOpenTemplates = useCallback(() => {
    setTemplateModalOpened(true);
  }, []);

  const handleCloseTemplates = useCallback(() => {
    setTemplateModalOpened(false);
  }, []);

  const handleSaveToLibrary = useCallback(async () => {
    const name = window.prompt(
      '请输入设计稿名称:',
      `设计稿 ${new Date().toLocaleDateString('zh-CN')}`
    );
    if (!name) return;

    try {
      const thumbnail = await createThumbnail(
        canvasState.elements,
        canvasState.paper
      );
      saveToLibrary(canvasState.elements, canvasState.paper, { name, thumbnail });
      notifications.show({
        title: '已保存到设计库',
        message: `"${name}" 已保存，可在批量套用时使用`,
        color: 'green',
      });
    } catch {
      notifications.show({
        title: '保存失败',
        message: '保存到设计库时出错',
        color: 'red',
      });
    }
  }, [canvasState]);

  const handleApplyTemplate = useCallback(
    (template: DesignTemplate) => {
      const beforeElements = cloneElements(canvasState.elements);
      const beforePaper = { ...canvasState.paper };

      const result = applyTemplateAsNewDesign(template);

      pushHistoryWithState(
        'import',
        `套用模板 "${template.name}"`,
        beforeElements,
        result.elements,
        {
          beforePaper,
          afterPaper: result.paper,
        }
      );

      canvasState.actions.setElements(result.elements);
      canvasState.actions.setPaper(result.paper);
      canvasState.actions.setSelectedId(null);
      markTemplateUsed(template.id);
      setShowCompareView(false);

      notifications.show({
        title: '模板已套用',
        message: `成功套用模板 "${template.name}"`,
        color: 'green',
      });
    },
    [canvasState, pushHistoryWithState]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(0.8);
  }, []);

  const state: AppState = {
    elements: canvasState.elements,
    selectedId: canvasState.selectedId,
    selectedElement: canvasState.selectedElement,
    paper: canvasState.paper,
    zoom,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    showCompareView,
    templateModalOpened,
    layoutAnalysis,
    validationIssues,
    layoutDiagnosis,
    lastOptimizeEntry,
    compareBeforeElements,
    compareAfterElements,
    hasOptimizeHistory,
    optimizedScore,
  };

  const actions: AppActions = {
    selectElement,
    addText,
    addLead,
    addDecoration,
    deleteSelected,
    handleElementMove,
    handleElementModify,
    handleUpdateElement,
    handleModifyStart,
    handleOptimize,
    handleToggleCompare,
    handleUndo,
    handleRedo,
    handleUpdatePaper,
    handleExport,
    handleImport,
    handleFileChange,
    handleOpenTemplates,
    handleCloseTemplates,
    handleSaveToLibrary,
    handleApplyTemplate,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };

  return {
    state,
    actions,
    fileInputRef,
  };
}

export type UseAppStateReturn = ReturnType<typeof useAppState>;
