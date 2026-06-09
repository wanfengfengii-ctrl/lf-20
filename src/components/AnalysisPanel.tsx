import {
  Paper,
  Title,
  Stack,
  Alert,
  Group,
  Text,
  Badge,
  Button,
  Accordion,
  Progress,
  Box,
  Divider,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconWand,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconEye,
  IconEyeOff,
  IconBulb,
  IconArrowUpRight,
  IconChartBar,
} from '@tabler/icons-react';
import type {
  ValidationIssue,
  LayoutAnalysis,
  LayoutDiagnosis,
  DiagnosisSuggestion,
} from '../types';

interface IssuesPanelProps {
  issues: ValidationIssue[];
}

export function IssuesPanel({ issues }: IssuesPanelProps) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>验证问题</Title>
        <Group gap="xs">
          {errors.length > 0 && <Badge color="red">{errors.length} 个错误</Badge>}
          {warnings.length > 0 && <Badge color="yellow">{warnings.length} 个警告</Badge>}
          {issues.length === 0 && <Badge color="green">无问题</Badge>}
        </Group>
      </Group>

      {issues.length === 0 ? (
        <Alert icon={<IconCircleCheck size={16} />} color="green" title="一切正常">
          版面设计符合所有约束条件。
        </Alert>
      ) : (
        <Stack gap="xs">
          {issues.map((issue) => (
            <Alert
              key={issue.id}
              icon={
                issue.severity === 'error' ? (
                  <IconAlertCircle size={16} />
                ) : (
                  <IconAlertTriangle size={16} />
                )
              }
              color={issue.severity === 'error' ? 'red' : 'yellow'}
              title={issue.severity === 'error' ? '错误' : '警告'}
            >
              <Text size="sm">{issue.message}</Text>
            </Alert>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

interface AnalysisPanelProps {
  analysis: LayoutAnalysis;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const getBalanceColor = () => {
    if (analysis.balanceScore >= 70) return 'green';
    if (analysis.balanceScore >= 40) return 'yellow';
    return 'red';
  };

  const getDensityColor = () => {
    if (analysis.textDensity > 0.6) return 'red';
    if (analysis.textDensity > 0.4) return 'yellow';
    return 'green';
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>版面分析</Title>
        <Badge variant="light" leftSection={<IconChartBar size={12} />}>
          实时
        </Badge>
      </Group>

      <Stack gap="md">
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm">平衡度</Text>
            <Text size="sm" fw={600} c={getBalanceColor()}>
              {analysis.balanceScore.toFixed(1)} 分
            </Text>
          </Group>
          <Progress
            value={analysis.balanceScore}
            color={getBalanceColor()}
            size="sm"
          />
        </div>

        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm">文字密度</Text>
            <Text size="sm" fw={600} c={getDensityColor()}>
              {(analysis.textDensity * 100).toFixed(1)}%
            </Text>
          </Group>
          <Progress
            value={Math.min(analysis.textDensity * 100, 100)}
            color={getDensityColor()}
            size="sm"
          />
        </div>

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              左重量
            </Text>
            <Text size="sm" fw={600}>
              {analysis.leftWeight.toFixed(1)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              右重量
            </Text>
            <Text size="sm" fw={600}>
              {analysis.rightWeight.toFixed(1)}
            </Text>
          </div>
        </Group>

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              上重量
            </Text>
            <Text size="sm" fw={600}>
              {analysis.topWeight.toFixed(1)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              下重量
            </Text>
            <Text size="sm" fw={600}>
              {analysis.bottomWeight.toFixed(1)}
            </Text>
          </div>
        </Group>

        <Divider />

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              重心 X
            </Text>
            <Text size="sm" fw={600}>
              {analysis.centerOfGravity.x.toFixed(1)}px
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              重心 Y
            </Text>
            <Text size="sm" fw={600}>
              {analysis.centerOfGravity.y.toFixed(1)}px
            </Text>
          </div>
        </Group>

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              左边距
            </Text>
            <Text size="sm" fw={600}>
              {analysis.marginLeft.toFixed(1)}px
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              右边距
            </Text>
            <Text size="sm" fw={600}>
              {analysis.marginRight.toFixed(1)}px
            </Text>
          </div>
        </Group>

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              上边距
            </Text>
            <Text size="sm" fw={600}>
              {analysis.marginTop.toFixed(1)}px
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              下边距
            </Text>
            <Text size="sm" fw={600}>
              {analysis.marginBottom.toFixed(1)}px
            </Text>
          </div>
        </Group>

        <Divider />

        <Group grow>
          <div>
            <Text size="xs" c="dimmed">
              文字元素
            </Text>
            <Text size="sm" fw={600}>
              {analysis.textElements.count} 个
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              装饰元素
            </Text>
            <Text size="sm" fw={600}>
              {analysis.decorationElements.count} 个
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              铅条
            </Text>
            <Text size="sm" fw={600}>
              {analysis.leadElements.count} 个
            </Text>
          </div>
        </Group>
      </Stack>
    </Paper>
  );
}

interface DiagnosisPanelProps {
  diagnosis: LayoutDiagnosis;
  onOptimize: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showPreview: boolean;
  onTogglePreview: (show: boolean) => void;
  isOptimized: boolean;
  optimizedScore?: number;
}

function getSeverityIcon(severity: DiagnosisSuggestion['severity']) {
  switch (severity) {
    case 'error':
      return <IconAlertCircle size={16} />;
    case 'warning':
      return <IconAlertTriangle size={16} />;
    case 'info':
    default:
      return <IconBulb size={16} />;
  }
}

function getSeverityColor(severity: DiagnosisSuggestion['severity']) {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
    default:
      return 'blue';
  }
}

function getImpactBadge(impact: DiagnosisSuggestion['impact']) {
  const labels: Record<string, string> = {
    high: '影响大',
    medium: '影响中',
    low: '影响小',
  };
  const colors: Record<string, string> = {
    high: 'red',
    medium: 'yellow',
    low: 'green',
  };
  return <Badge size="xs" color={colors[impact]}>{labels[impact]}</Badge>;
}

function getGradeInfo(grade: LayoutDiagnosis['grade']) {
  const info = {
    excellent: { label: '优秀', color: 'green', emoji: '🌟' },
    good: { label: '良好', color: 'blue', emoji: '👍' },
    fair: { label: '一般', color: 'yellow', emoji: '📝' },
    poor: { label: '待优化', color: 'red', emoji: '⚠️' },
  };
  return info[grade];
}

export function DiagnosisPanel({
  diagnosis,
  onOptimize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showPreview,
  onTogglePreview,
  isOptimized,
  optimizedScore,
}: DiagnosisPanelProps) {
  const gradeInfo = getGradeInfo(diagnosis.grade);

  const scoreColor =
    diagnosis.overallScore >= 85
      ? 'green'
      : diagnosis.overallScore >= 70
      ? 'blue'
      : diagnosis.overallScore >= 50
      ? 'yellow'
      : 'red';

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>版面诊断</Title>
        <Badge color={gradeInfo.color} variant="light">
          {gradeInfo.emoji} {gradeInfo.label}
        </Badge>
      </Group>

      <Stack gap="md">
        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={500}>
              综合评分
            </Text>
            <Text size="lg" fw={700} c={scoreColor}>
              {diagnosis.overallScore}
              <Text size="xs" c="dimmed" span ml={4}>
                / 100
              </Text>
            </Text>
          </Group>
          <Progress value={diagnosis.overallScore} color={scoreColor} size="lg" />

          {isOptimized && optimizedScore !== undefined && (
            <Group mt={8} gap="xs">
              <IconArrowUpRight size={14} color="var(--mantine-color-green-filled)" />
              <Text size="xs" c="green">
                优化后评分: {optimizedScore} 分 (+{(optimizedScore - diagnosis.overallScore).toFixed(0)})
              </Text>
            </Group>
          )}
        </Box>

        <Divider />

        <Group grow>
          <Tooltip label="撤销上一步操作">
            <Button
              variant="light"
              leftSection={<IconArrowBackUp size={16} />}
              onClick={onUndo}
              disabled={!canUndo}
              size="sm"
            >
              撤销
            </Button>
          </Tooltip>
          <Tooltip label="重做已撤销的操作">
            <Button
              variant="light"
              leftSection={<IconArrowForwardUp size={16} />}
              onClick={onRedo}
              disabled={!canRedo}
              size="sm"
            >
              重做
            </Button>
          </Tooltip>
        </Group>

        <Group grow>
          <Tooltip label={showPreview ? '关闭对比视图，返回编辑' : '并排查看优化前后效果'}>
            <Button
              variant="light"
              color={showPreview ? 'violet' : 'gray'}
              leftSection={showPreview ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              onClick={() => onTogglePreview(!showPreview)}
              disabled={!isOptimized}
              size="sm"
            >
              {showPreview ? '对比中' : '对比视图'}
            </Button>
          </Tooltip>
        </Group>

        <Button
          fullWidth
          leftSection={<IconWand size={16} />}
          onClick={onOptimize}
          variant="gradient"
          gradient={{ from: 'indigo', to: 'violet', deg: 180 }}
        >
          一键优化版面
        </Button>

        <Divider label="诊断建议" labelPosition="center" />

        {diagnosis.suggestions.length === 0 ? (
          <Alert icon={<IconCircleCheck size={16} />} color="green" title="版面状态良好">
            未发现明显的排版问题，继续保持！
          </Alert>
        ) : (
          <Accordion variant="separated" radius="sm">
            {diagnosis.suggestions.map((suggestion) => (
              <Accordion.Item key={suggestion.id} value={suggestion.id}>
                <Accordion.Control>
                  <Group gap="xs" wrap="nowrap">
                    <Box c={getSeverityColor(suggestion.severity)} style={{ display: 'flex' }}>
                      {getSeverityIcon(suggestion.severity)}
                    </Box>
                    <Text size="sm" fw={500} style={{ flex: 1 }}>
                      {suggestion.title}
                    </Text>
                    {getImpactBadge(suggestion.impact)}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                      {suggestion.description}
                    </Text>
                    <Box
                      p="sm"
                      style={{
                        background: 'var(--mantine-color-blue-light)',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                    >
                      <Group gap="xs" mb={4}>
                        <IconBulb size={14} color="var(--mantine-color-blue-filled)" />
                        <Text size="sm" fw={500} c="blue">
                          优化建议
                        </Text>
                      </Group>
                      <Text size="sm">{suggestion.suggestion}</Text>
                    </Box>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}

        <Text size="xs" c="dimmed" ta="center" mt="xs">
          共 {diagnosis.suggestions.length} 项建议 · 点击展开详情
        </Text>
      </Stack>
    </Paper>
  );
}
