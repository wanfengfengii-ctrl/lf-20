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

export type HistoryActionType = 'add' | 'delete' | 'modify' | 'optimize' | 'paper_change' | 'import';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: HistoryActionType;
  description: string;
  beforeElements: CanvasElement[];
  afterElements: CanvasElement[];
  beforePaper?: PaperConfig;
  afterPaper?: PaperConfig;
  changedElementIds?: string[];
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

export type TemplateType = 'full' | 'style';

export interface StyleRule {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
}

export interface DecorationStyle {
  shape: 'line' | 'circle' | 'rect' | 'diamond';
  fill: string;
  strokeWidth: number;
  strokeColor: string;
}

export interface WhitespaceConfig {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  lineSpacing: number;
  paragraphSpacing: number;
}

export interface TemplateStyle {
  titleStyle: StyleRule;
  bodyStyle: StyleRule;
  decorationStyle: DecorationStyle;
  leadColor: string;
  whitespace: WhitespaceConfig;
  backgroundColor: string;
}

export interface TemplateLayoutInfo {
  titlePositions: { x: number; y: number; width: number; height: number }[];
  bodyPositions: { x: number; y: number; width: number; height: number }[];
  leadPositions: { x: number; y: number; width: number; height: number }[];
  decorationPositions: { x: number; y: number; width: number; height: number; shape: string }[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  thumbnail: string | null;
  type: TemplateType;
  paper: PaperConfig;
  elements?: CanvasElement[];
  style?: TemplateStyle;
  layout?: TemplateLayoutInfo;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export const TEMPLATE_CATEGORIES = [
  '全部',
  '名片',
  '海报',
  '传单',
  '邀请函',
  '信纸',
  '书籍封面',
  '其他',
];

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
