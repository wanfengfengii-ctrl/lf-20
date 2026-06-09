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
  lastUsedAt?: string;
}

export interface TemplateSimilarity {
  templateId: string;
  overallScore: number;
  paperSizeScore: number;
  elementCountScore: number;
  titleBodyRatioScore: number;
  decorationDensityScore: number;
  whitespaceScore: number;
  colorSchemeScore: number;
  fontStyleScore: number;
}

export interface RecommendationReason {
  id: string;
  title: string;
  description: string;
  type: 'match' | 'improvement' | 'style';
}

export interface TemplateRecommendation {
  template: DesignTemplate;
  similarity: TemplateSimilarity;
  reasons: RecommendationReason[];
  matchLevel: 'perfect' | 'high' | 'medium' | 'low';
}

export type SceneCategory =
  | 'business_card'
  | 'poster'
  | 'flyer'
  | 'invitation'
  | 'letterhead'
  | 'book_cover'
  | 'social_media'
  | 'other';

export interface SceneDetectionResult {
  scene: SceneCategory;
  confidence: number;
  indicators: string[];
}

export interface TemplateDiff {
  elementChanges: {
    added: string[];
    removed: string[];
    modified: {
      elementId: string;
      property: string;
      oldValue: unknown;
      newValue: unknown;
    }[];
  };
  styleChanges: {
    fontFamily?: { old: string; new: string };
    titleFontSize?: { old: number; new: number };
    bodyFontSize?: { old: number; new: number };
    titleColor?: { old: string; new: string };
    bodyColor?: { old: string; new: string };
    backgroundColor?: { old: string; new: string };
  };
  paperChanges?: {
    width?: { old: number; new: number };
    height?: { old: number; new: number };
    backgroundColor?: { old: string; new: string };
  };
  summary: {
    totalChanges: number;
    elementChanges: number;
    styleChanges: number;
    paperChanges: number;
  };
}

export interface BatchApplyResult {
  designId: string;
  designName: string;
  success: boolean;
  error?: string;
  elementsBefore: CanvasElement[];
  elementsAfter: CanvasElement[];
  paperBefore: PaperConfig;
  paperAfter: PaperConfig;
  diff: TemplateDiff;
}

export interface DesignItem {
  id: string;
  name: string;
  paper: PaperConfig;
  elements: CanvasElement[];
  thumbnail?: string | null;
  updatedAt: string;
}

export const SCENE_CATEGORIES: { value: SceneCategory; label: string; description: string }[] = [
  { value: 'business_card', label: '名片', description: '个人或商务名片设计' },
  { value: 'poster', label: '海报', description: '宣传海报、活动海报' },
  { value: 'flyer', label: '传单', description: '宣传单页、DM单' },
  { value: 'invitation', label: '邀请函', description: '活动邀请、请柬' },
  { value: 'letterhead', label: '信纸', description: '办公信纸、抬头纸' },
  { value: 'book_cover', label: '书籍封面', description: '书籍、杂志封面' },
  { value: 'social_media', label: '社交媒体', description: '社交媒体配图' },
  { value: 'other', label: '其他', description: '其他类型设计' },
];

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
