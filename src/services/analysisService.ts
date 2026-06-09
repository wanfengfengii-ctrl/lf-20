import type {
  CanvasElement,
  PaperConfig,
  LayoutAnalysis,
  LayoutDiagnosis,
  ValidationIssue,
} from '../types';
import { analyzeLayout, diagnoseLayout } from '../utils/layoutAnalysis';
import { runAllValidations, validateTextOverlap } from '../utils/validation';
import { optimizeLayout, optimizeForPaperSize } from '../utils/layoutOptimizer';
import type { OptimizationResult } from '../types';

export function performLayoutAnalysis(
  elements: CanvasElement[],
  paper: PaperConfig
): LayoutAnalysis {
  return analyzeLayout(elements, paper);
}

export function performLayoutDiagnosis(
  elements: CanvasElement[],
  paper: PaperConfig
): LayoutDiagnosis {
  return diagnoseLayout(elements, paper);
}

export function runValidations(
  elements: CanvasElement[],
  paper: PaperConfig
): ValidationIssue[] {
  return runAllValidations(elements, paper);
}

export function checkTextOverlap(elements: CanvasElement[]): ValidationIssue[] {
  return validateTextOverlap(elements);
}

export function runOptimization(
  elements: CanvasElement[],
  paper: PaperConfig
): OptimizationResult {
  return optimizeLayout(elements, paper);
}

export function runPaperSizeOptimization(
  elements: CanvasElement[],
  oldPaper: PaperConfig,
  newPaper: PaperConfig
): OptimizationResult {
  return optimizeForPaperSize(elements, oldPaper, newPaper);
}

export interface FullAnalysisResult {
  analysis: LayoutAnalysis;
  diagnosis: LayoutDiagnosis;
  issues: ValidationIssue[];
}

export function performFullAnalysis(
  elements: CanvasElement[],
  paper: PaperConfig
): FullAnalysisResult {
  return {
    analysis: performLayoutAnalysis(elements, paper),
    diagnosis: performLayoutDiagnosis(elements, paper),
    issues: runValidations(elements, paper),
  };
}

export function getIssuesByType(
  issues: ValidationIssue[],
  type: ValidationIssue['type']
): ValidationIssue[] {
  return issues.filter((i) => i.type === type);
}

export function getIssuesBySeverity(
  issues: ValidationIssue[],
  severity: ValidationIssue['severity']
): ValidationIssue[] {
  return issues.filter((i) => i.severity === severity);
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export function hasWarnings(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'warning');
}
