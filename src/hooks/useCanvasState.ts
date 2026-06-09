import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  CanvasElement,
  PaperConfig,
  TextElement,
  LeadElement,
  DecorationElement,
  HistoryEntry,
} from '../types';
import {
  createTextElement,
  createLeadElement,
  createDecorationElement,
  addElement,
  removeElement,
  updateElement,
  getElementById,
  moveElement,
  validateAndUpdateElement,
  cloneElements,
} from '../services/elementService';
import { runOptimization, runPaperSizeOptimization } from '../services/analysisService';

const DEFAULT_PAPER: PaperConfig = {
  width: 595,
  height: 842,
  backgroundColor: '#ffffff',
};

export interface CanvasState {
  elements: CanvasElement[];
  selectedId: string | null;
  paper: PaperConfig;
  selectedElement: CanvasElement | null;
}

export interface CanvasActions {
  setElements: (elements: CanvasElement[]) => void;
  setPaper: (paper: PaperConfig) => void;
  setSelectedId: (id: string | null) => void;
  selectElement: (id: string | null) => void;
  addTextElement: () => TextElement;
  addLeadElement: () => LeadElement;
  addDecorationElement: () => DecorationElement;
  deleteSelected: () => string | null;
  moveElementById: (id: string, x: number, y: number) => void;
  modifyElement: (id: string, updates: Partial<CanvasElement>) => boolean;
  updateElementWithValidation: (id: string, updates: Partial<CanvasElement>) => boolean;
  optimizeLayout: () => { changed: boolean; description: string; elements: CanvasElement[] };
  updatePaperWithOptimization: (newPaper: PaperConfig) => { paper: PaperConfig; elements: CanvasElement[]; changed: boolean; description: string };
  resetCanvas: () => void;
  getElement: (id: string) => CanvasElement | undefined;
  startModify: () => void;
  endModify: (id: string) => CanvasElement[] | null;
}

export function useCanvasState() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperConfig>(DEFAULT_PAPER);
  const prevPaperRef = useRef<PaperConfig>(paper);
  const elementsBeforeModifyRef = useRef<CanvasElement[] | null>(null);

  const selectedElement = useMemo(() => {
    return elements.find((e) => e.id === selectedId) || null;
  }, [elements, selectedId]);

  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const addTextElement = useCallback((): TextElement => {
    const newElement = createTextElement(50, 50 + elements.length * 30);
    setElements((prev) => addElement(prev, newElement));
    setSelectedId(newElement.id);
    return newElement;
  }, [elements.length]);

  const addLeadElement = useCallback((): LeadElement => {
    const newElement = createLeadElement(50, 100 + elements.length * 10);
    setElements((prev) => addElement(prev, newElement));
    setSelectedId(newElement.id);
    return newElement;
  }, [elements.length]);

  const addDecorationElement = useCallback((): DecorationElement => {
    const newElement = createDecorationElement(100, 100 + elements.length * 20);
    setElements((prev) => addElement(prev, newElement));
    setSelectedId(newElement.id);
    return newElement;
  }, [elements.length]);

  const deleteSelected = useCallback((): string | null => {
    if (!selectedId) return null;
    const deletedId = selectedId;
    setElements((prev) => removeElement(prev, selectedId));
    setSelectedId(null);
    return deletedId;
  }, [selectedId]);

  const moveElementById = useCallback((id: string, x: number, y: number) => {
    setElements((prev) => moveElement(prev, id, x, y));
  }, []);

  const modifyElement = useCallback((id: string, updates: Partial<CanvasElement>): boolean => {
    setElements((prev) => updateElement(prev, id, updates));
    return true;
  }, []);

  const updateElementWithValidation = useCallback(
    (id: string, updates: Partial<CanvasElement>): boolean => {
      const result = validateAndUpdateElement(elements, id, updates, paper);
      if (result.success) {
        setElements(result.elements);
      }
      return result.success;
    },
    [elements, paper]
  );

  const optimizeLayout = useCallback(() => {
    const result = runOptimization(elements, paper);
    const changed = result.changedElementIds.length > 0;
    if (changed) {
      setElements(result.elements);
    }
    return {
      changed,
      description: result.description,
      elements: result.elements,
    };
  }, [elements, paper]);

  const updatePaperWithOptimization = useCallback(
    (newPaper: PaperConfig) => {
      const oldPaper = prevPaperRef.current;
      const sizeChanged = newPaper.width !== oldPaper.width || newPaper.height !== oldPaper.height;

      if (sizeChanged && elements.length > 0) {
        const result = runPaperSizeOptimization(elements, oldPaper, newPaper);
        setPaper(newPaper);
        setElements(result.elements);
        prevPaperRef.current = newPaper;
        return {
          paper: newPaper,
          elements: result.elements,
          changed: result.changedElementIds.length > 0,
          description: result.description,
        };
      }

      setPaper(newPaper);
      prevPaperRef.current = newPaper;
      return {
        paper: newPaper,
        elements,
        changed: false,
        description: '修改纸张设置',
      };
    },
    [elements]
  );

  const resetCanvas = useCallback(() => {
    setElements([]);
    setSelectedId(null);
    setPaper(DEFAULT_PAPER);
    prevPaperRef.current = DEFAULT_PAPER;
  }, []);

  const getElement = useCallback(
    (id: string): CanvasElement | undefined => {
      return getElementById(elements, id);
    },
    [elements]
  );

  const startModify = useCallback(() => {
    elementsBeforeModifyRef.current = cloneElements(elements);
  }, [elements]);

  const endModify = useCallback((id: string): CanvasElement[] | null => {
    const beforeElements = elementsBeforeModifyRef.current;
    elementsBeforeModifyRef.current = null;
    return beforeElements;
  }, []);

  const state: CanvasState = {
    elements,
    selectedId,
    paper,
    selectedElement,
  };

  const actions: CanvasActions = {
    setElements,
    setPaper,
    setSelectedId,
    selectElement,
    addTextElement,
    addLeadElement,
    addDecorationElement,
    deleteSelected,
    moveElementById,
    modifyElement,
    updateElementWithValidation,
    optimizeLayout,
    updatePaperWithOptimization,
    resetCanvas,
    getElement,
    startModify,
    endModify,
  };

  return {
    state,
    actions,
    elements,
    selectedId,
    paper,
    selectedElement,
    prevPaperRef,
    elementsBeforeModifyRef,
  };
}

export type UseCanvasStateReturn = ReturnType<typeof useCanvasState>;
