export type ElementType = 'text' | 'lead' | 'decoration';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
}

export interface LeadElement extends BaseElement {
  type: 'lead';
  fill: string;
}

export interface DecorationElement extends BaseElement {
  type: 'decoration';
  shape: 'line' | 'circle' | 'rect' | 'diamond';
  fill: string;
  strokeWidth: number;
  strokeColor: string;
}

export type CanvasElement = TextElement | LeadElement | DecorationElement;

export interface PaperConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface ValidationIssue {
  id: string;
  type: 'overflow' | 'overlap' | 'density' | 'imbalance' | 'size';
  severity: 'warning' | 'error';
  message: string;
  elementIds?: string[];
}

export type DiagnosisType =
  | 'title_heavy'
  | 'body_dense'
  | 'whitespace_insufficient'
  | 'decoration_overpower'
  | 'balance_left_right'
  | 'balance_top_bottom'
  | 'alignment_inconsistent'
  | 'hierarchy_unclear';

export interface DiagnosisSuggestion {
  id: string;
  type: DiagnosisType;
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  suggestion: string;
  elementIds?: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface LayoutDiagnosis {
  suggestions: DiagnosisSuggestion[];
  overallScore: number;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface OptimizationResult {
  elements: CanvasElement[];
  changedElementIds: string[];
  description: string;
}

export interface OptimizationHistoryEntry {
  id: string;
  timestamp: number;
  beforeElements: CanvasElement[];
  afterElements: CanvasElement[];
  changedElementIds: string[];
  description: string;
}

export type PaperSizeCategory = 'business_card' | 'small' | 'medium' | 'large' | 'poster';

export interface PaperLayoutGuidelines {
  minMargin: number;
  recommendedMargin: number;
  maxTextDensity: number;
  minTextDensity: number;
  titleBodyRatioMax: number;
  titleBodyRatioMin: number;
  maxDecorationWeightRatio: number;
}

export interface LayoutAnalysis {
  centerOfGravity: { x: number; y: number };
  textDensity: number;
  leftWeight: number;
  rightWeight: number;
  topWeight: number;
  bottomWeight: number;
  balanceScore: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  textElements: {
    count: number;
    totalArea: number;
    avgFontSize: number;
    maxFontSize: number;
    minFontSize: number;
    titleCandidates: string[];
    bodyCandidates: string[];
  };
  decorationElements: {
    count: number;
    totalWeight: number;
    totalArea: number;
  };
  leadElements: {
    count: number;
    totalArea: number;
  };
}

export interface DesignData {
  version: string;
  paper: PaperConfig;
  elements: CanvasElement[];
  createdAt: string;
}

export const FONT_FAMILIES = [
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
];

export const DEFAULT_PAPER_PRESETS = [
  { name: 'A4', width: 595, height: 842 },
  { name: 'A5', width: 420, height: 595 },
  { name: '信纸', width: 612, height: 792 },
  { name: '名片', width: 252, height: 144 },
  { name: '自定义', width: 0, height: 0 },
];
