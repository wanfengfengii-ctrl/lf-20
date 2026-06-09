import { useState, useCallback, useRef } from 'react';
import type { HistoryEntry, HistoryActionType } from '../types';
import { generateId } from '../utils/helpers';

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface PushHistoryOptions {
  type: HistoryActionType;
  description: string;
  beforeElements: HistoryEntry['beforeElements'];
  afterElements: HistoryEntry['afterElements'];
  beforePaper?: HistoryEntry['beforePaper'];
  afterPaper?: HistoryEntry['afterPaper'];
  changedElementIds?: HistoryEntry['changedElementIds'];
}

const MAX_HISTORY_SIZE = 50;

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isProgrammaticChangeRef = useRef(false);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < entries.length - 1;

  const getCurrentEntry = useCallback((): HistoryEntry | null => {
    if (currentIndex < 0 || currentIndex >= entries.length) return null;
    return entries[currentIndex];
  }, [currentIndex, entries]);

  const getEntryByType = useCallback(
    (type: HistoryActionType): HistoryEntry | null => {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].type === type) {
          return entries[i];
        }
      }
      return null;
    },
    [entries]
  );

  const pushHistory = useCallback(
    (options: PushHistoryOptions): HistoryEntry | null => {
      if (isProgrammaticChangeRef.current) return null;

      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: Date.now(),
        type: options.type,
        description: options.description,
        beforeElements: options.beforeElements,
        afterElements: options.afterElements,
        beforePaper: options.beforePaper,
        afterPaper: options.afterPaper,
        changedElementIds: options.changedElementIds,
      };

      setEntries((prev) => {
        const trimmed = prev.slice(0, currentIndex + 1);
        const updated = [...trimmed, entry];
        if (updated.length > MAX_HISTORY_SIZE) {
          return updated.slice(updated.length - MAX_HISTORY_SIZE);
        }
        return updated;
      });
      setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));

      return entry;
    },
    [currentIndex]
  );

  const undo = useCallback((): HistoryEntry | null => {
    if (!canUndo) return null;

    const entry = entries[currentIndex];
    if (!entry) return null;

    isProgrammaticChangeRef.current = true;

    setCurrentIndex((prev) => prev - 1);

    isProgrammaticChangeRef.current = false;

    return entry;
  }, [canUndo, currentIndex, entries]);

  const redo = useCallback((): HistoryEntry | null => {
    if (!canRedo) return null;

    const nextIndex = currentIndex + 1;
    const entry = entries[nextIndex];
    if (!entry) return null;

    isProgrammaticChangeRef.current = true;

    setCurrentIndex(nextIndex);

    isProgrammaticChangeRef.current = false;

    return entry;
  }, [canRedo, currentIndex, entries]);

  const resetHistory = useCallback(() => {
    setEntries([]);
    setCurrentIndex(-1);
  }, []);

  const setProgrammaticChange = useCallback((value: boolean) => {
    isProgrammaticChangeRef.current = value;
  }, []);

  const state: HistoryState = {
    entries,
    currentIndex,
    canUndo,
    canRedo,
  };

  return {
    state,
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    resetHistory,
    getCurrentEntry,
    getEntryByType,
    setProgrammaticChange,
    isProgrammaticChangeRef,
  };
}

export type UseHistoryReturn = ReturnType<typeof useHistory>;
