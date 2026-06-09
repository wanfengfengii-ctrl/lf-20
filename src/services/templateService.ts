import type {
  DesignTemplate,
  CanvasElement,
  PaperConfig,
  TemplateDiff,
  BatchApplyResult,
  TemplateType,
} from '../types';
import {
  getAllTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  updateTemplate,
  searchTemplates,
  getTemplateCategories,
  applyTemplateToNewDesign,
  applyTemplate,
  generateTemplateThumbnail,
  createTemplate as createTemplateFromStorage,
  incrementTemplateUsage,
} from '../utils/templateStorage';
import { calculateTemplateDiff, batchApplyTemplate as batchApplyFromRecommendation } from '../utils/templateRecommendation';

export interface TemplateCreateOptions {
  name: string;
  category: string;
  tags: string[];
  description: string;
  type: TemplateType;
  thumbnail?: string | null;
}

export function getTemplates(): DesignTemplate[] {
  return getAllTemplates();
}

export function getTemplateById(id: string): DesignTemplate | null {
  return getTemplate(id);
}

export function saveTemplateToStorage(template: DesignTemplate): void {
  saveTemplate(template);
}

export function removeTemplate(id: string): void {
  deleteTemplate(id);
}

export function modifyTemplate(id: string, updates: Partial<DesignTemplate>): DesignTemplate | null {
  return updateTemplate(id, updates);
}

export function findTemplates(
  query: string,
  options?: { category?: string; type?: TemplateType }
): DesignTemplate[] {
  return searchTemplates(query, options);
}

export function getCategories(): string[] {
  return getTemplateCategories();
}

export function createNewTemplate(
  elements: CanvasElement[],
  paper: PaperConfig,
  options: TemplateCreateOptions
): DesignTemplate {
  return createTemplateFromStorage(elements, paper, options);
}

export function applyTemplateToDesign(
  template: DesignTemplate,
  elements: CanvasElement[]
): { elements: CanvasElement[]; paper: PaperConfig } {
  return applyTemplate(template, elements);
}

export function applyTemplateAsNewDesign(template: DesignTemplate): {
  elements: CanvasElement[];
  paper: PaperConfig;
} {
  return applyTemplateToNewDesign(template);
}

export function createThumbnail(
  elements: CanvasElement[],
  paper: PaperConfig
): Promise<string | null> {
  return generateTemplateThumbnail(elements, paper);
}

export function computeTemplateDiff(
  beforeElements: CanvasElement[],
  afterElements: CanvasElement[],
  beforePaper: PaperConfig,
  afterPaper: PaperConfig
): TemplateDiff {
  return calculateTemplateDiff(beforeElements, afterElements, beforePaper, afterPaper);
}

export function previewTemplateApplication(
  template: DesignTemplate,
  elements: CanvasElement[],
  paper: PaperConfig
): { elements: CanvasElement[]; paper: PaperConfig; diff: TemplateDiff } {
  const result = applyTemplate(template, elements);
  const diff = calculateTemplateDiff(
    elements,
    result.elements,
    paper,
    result.paper
  );
  return {
    elements: result.elements,
    paper: result.paper,
    diff,
  };
}

export function batchApplyTemplateToDesigns(
  template: DesignTemplate,
  designs: { id: string; name: string; elements: CanvasElement[]; paper: PaperConfig }[]
): {
  results: BatchApplyResult[];
  successCount: number;
  failCount: number;
} {
  return batchApplyFromRecommendation(template, designs);
}

export function markTemplateUsed(id: string): void {
  incrementTemplateUsage(id);
}
