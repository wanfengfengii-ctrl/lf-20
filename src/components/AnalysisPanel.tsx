import { Paper, Title, Stack, Alert, Group, Text, Badge } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ValidationIssue, LayoutAnalysis } from '../types';

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
      <Title order={4} mb="md">版面分析</Title>

      <Stack gap="md">
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm">平衡度</Text>
            <Text size="sm" fw={600} c={getBalanceColor()}>
              {analysis.balanceScore.toFixed(1)} 分
            </Text>
          </Group>
          <div style={{ height: 6, background: '#e9ecef', borderRadius: 3 }}>
            <div
              style={{
                height: '100%',
                width: `${analysis.balanceScore}%`,
                background:
                  analysis.balanceScore >= 70
                    ? '#40c057'
                    : analysis.balanceScore >= 40
                    ? '#fab005'
                    : '#ff6b6b',
                borderRadius: 3,
                transition: 'all 0.3s',
              }}
            />
          </div>
        </div>

        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm">文字密度</Text>
            <Text size="sm" fw={600} c={getDensityColor()}>
              {(analysis.textDensity * 100).toFixed(1)}%
            </Text>
          </Group>
          <div style={{ height: 6, background: '#e9ecef', borderRadius: 3 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(analysis.textDensity * 100, 100)}%`,
                background:
                  analysis.textDensity > 0.6
                    ? '#ff6b6b'
                    : analysis.textDensity > 0.4
                    ? '#fab005'
                    : '#40c057',
                borderRadius: 3,
                transition: 'all 0.3s',
              }}
            />
          </div>
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
      </Stack>
    </Paper>
  );
}
