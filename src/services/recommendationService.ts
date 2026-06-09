import type {
  CanvasElement,
  PaperConfig,
  DesignTemplate,
  TemplateRecommendation,
  SceneDetectionResult,
  TemplateSimilarity,
} from '../types';
import {
  recommendTemplates,
  calculateTemplateSimilarity,
  detectScene,
  getRecentTemplates,
  addRecentTemplate,
  clearRecentTemplates,
  sortTemplatesBySimilarity,
} from '../utils/templateRecommendation';

export interface RecommendOptions {
  limit?: number;
  type?: 'all' | 'full' | 'style';
}

export function getRecommendations(
  templates: DesignTemplate[],
  elements: CanvasElement[],
  paper: PaperConfig,
  options?: RecommendOptions
): TemplateRecommendation[] {
  return recommendTemplates(templates, elements, paper, options);
}

export function computeSimilarity(
  template: DesignTemplate,
  elements: CanvasElement[],
  paper: PaperConfig
): TemplateSimilarity {
  return calculateTemplateSimilarity(template, elements, paper);
}

export function detectDesignScene(
  elements: CanvasElement[],
  paper: PaperConfig
): SceneDetectionResult {
  return detectScene(elements, paper);
}

export function getRecentTemplateIds(): string[] {
  return getRecentTemplates();
}

export function addRecentTemplateId(templateId: string): void {
  addRecentTemplate(templateId);
}

export function clearRecentTemplateIds(): void {
  clearRecentTemplates();
}

export function sortBySimilarity(
  templates: DesignTemplate[],
  elements: CanvasElement[],
  paper: PaperConfig
): DesignTemplate[] {
  return sortTemplatesBySimilarity(templates, elements, paper);
}
