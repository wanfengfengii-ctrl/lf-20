import type { CanvasElement, PaperConfig, DesignData, DesignItem, SavedDesign } from '../types';
import {
  exportDesign,
  importDesign,
  downloadDesignFile,
  saveDesignToLibrary,
  getAllDesigns,
  getDesignById,
  updateDesignInLibrary,
  deleteDesignFromLibrary,
  getDesignItems,
} from '../utils/designStorage';

export interface DesignSaveOptions {
  name: string;
  thumbnail?: string | null;
}

export function exportDesignToJson(elements: CanvasElement[], paper: PaperConfig): string {
  return exportDesign(elements, paper);
}

export function importDesignFromJson(json: string): DesignData | null {
  return importDesign(json);
}

export function downloadAsFile(
  elements: CanvasElement[],
  paper: PaperConfig,
  filename?: string
): void {
  downloadDesignFile(elements, paper, filename);
}

export function saveToLibrary(
  elements: CanvasElement[],
  paper: PaperConfig,
  options: DesignSaveOptions
): SavedDesign {
  return saveDesignToLibrary(elements, paper, options);
}

export function getLibraryDesigns(): SavedDesign[] {
  return getAllDesigns();
}

export function getLibraryDesignById(id: string): SavedDesign | null {
  return getDesignById(id);
}

export function updateLibraryDesign(
  id: string,
  updates: Partial<SavedDesign>
): SavedDesign | null {
  return updateDesignInLibrary(id, updates);
}

export function removeLibraryDesign(id: string): void {
  deleteDesignFromLibrary(id);
}

export function getLibraryDesignItems(): DesignItem[] {
  return getDesignItems();
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

export async function importFromFile(file: File): Promise<DesignData | null> {
  const content = await readFileAsText(file);
  return importDesignFromJson(content);
}
