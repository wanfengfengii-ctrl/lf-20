import { Card, Badge, Text, Group, Stack, ActionIcon, Menu, Tooltip, Progress, Button } from '@mantine/core';
import { IconDots, IconTrash, IconDownload, IconEdit, IconStar, IconClock, IconSparkles, IconCopy } from '@tabler/icons-react';
import type { DesignTemplate, TemplateSimilarity } from '../types';

interface TemplateCardProps {
  template: DesignTemplate;
  onApply: (template: DesignTemplate) => void;
  onDelete: (template: DesignTemplate) => void;
  onEdit?: (template: DesignTemplate) => void;
  onExport?: (template: DesignTemplate) => void;
  onBatchApply?: (template: DesignTemplate) => void;
  similarity?: TemplateSimilarity;
  isRecommended?: boolean;
  isRecent?: boolean;
  matchLevel?: 'perfect' | 'high' | 'medium' | 'low';
  showPreview?: (template: DesignTemplate) => void;
}

export function TemplateCard({
  template,
  onApply,
  onDelete,
  onEdit,
  onExport,
  onBatchApply,
  similarity,
  isRecommended,
  isRecent,
  matchLevel,
  showPreview,
}: TemplateCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const matchLevelColors: Record<string, string> = {
    perfect: 'green',
    high: 'teal',
    medium: 'yellow',
    low: 'gray',
  };

  const matchLevelLabels: Record<string, string> = {
    perfect: '完美匹配',
    high: '高度匹配',
    medium: '中等匹配',
    low: '一般匹配',
  };

  return (
    <Card
      shadow="sm"
      padding="sm"
      withBorder
      radius="md"
      style={{ cursor: 'pointer' }}
      onClick={() => onApply(template)}
    >
      <Card.Section>
        <div
          style={{
            height: 120,
            background: template.thumbnail || '#f0f0f0',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {template.thumbnail ? (
            <img
              src={template.thumbnail}
              alt={template.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '80%',
                aspectRatio: `${template.paper.width / template.paper.height}`,
                maxWidth: '80%',
                maxHeight: '80%',
                background: template.paper.backgroundColor,
                border: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: 12,
              }}
            >
              {template.paper.width} × {template.paper.height}
            </div>
          )}
          <Group gap={4} style={{ position: 'absolute', top: 8, left: 8 }}>
            <Badge
              size="xs"
              color={template.type === 'full' ? 'blue' : 'violet'}
              variant="light"
            >
              {template.type === 'full' ? '完整模板' : '风格模板'}
            </Badge>
            {isRecommended && (
              <Tooltip label="智能推荐">
                <Badge size="xs" color="grape" variant="filled" leftSection={<IconSparkles size={10} />}>
                  推荐
                </Badge>
              </Tooltip>
            )}
            {isRecent && (
              <Tooltip label="最近使用">
                <Badge size="xs" color="orange" variant="light" leftSection={<IconClock size={10} />}>
                  最近
                </Badge>
              </Tooltip>
            )}
          </Group>
          {similarity && matchLevel && (
            <Tooltip label={`匹配度: ${similarity.overallScore}% - ${matchLevelLabels[matchLevel]}`}>
              <Badge
                size="xs"
                color={matchLevelColors[matchLevel]}
                variant="light"
                style={{ position: 'absolute', top: 8, right: 8 }}
                leftSection={<IconStar size={10} />}
              >
                {similarity.overallScore}%
              </Badge>
            </Tooltip>
          )}
          <Menu shadow="md" width={120} withinPortal>
            <Menu.Target>
              <ActionIcon
                size="sm"
                variant="subtle"
                style={{ position: 'absolute', top: 4, right: 4 }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              {onEdit && (
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                  }}
                >
                  编辑信息
                </Menu.Item>
              )}
              {onExport && (
                <Menu.Item
                  leftSection={<IconDownload size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(template);
                  }}
                >
                  导出模板
                </Menu.Item>
              )}
              {onBatchApply && (
                <Menu.Item
                  leftSection={<IconCopy size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBatchApply(template);
                  }}
                >
                  批量套用
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template);
                }}
              >
                删除模板
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </Card.Section>

      <Stack gap={4} mt="sm">
        <Group justify="space-between" gap={4}>
          <Text fw={500} size="sm" lineClamp={1}>
            {template.name}
          </Text>
          <Tooltip label={`使用 ${template.usageCount} 次`}>
            <Text size="xs" c="dimmed">
              {template.usageCount} 次
            </Text>
          </Tooltip>
        </Group>

        <Text size="xs" c="dimmed" lineClamp={2}>
          {template.description || '暂无描述'}
        </Text>

        {similarity && (
          <div style={{ marginTop: 4 }}>
            <Group justify="space-between" mb={2}>
              <Text size="xs" c="dimmed">
                匹配度
              </Text>
              <Text size="xs" fw={500} c={matchLevelColors[matchLevel || 'low']}>
                {similarity.overallScore}%
              </Text>
            </Group>
            <Progress
              value={similarity.overallScore}
              size="xs"
              color={matchLevelColors[matchLevel || 'low']}
            />
          </div>
        )}

        <Group gap={4} mt={4}>
          <Badge size="xs" variant="outline" color="gray">
            {template.category}
          </Badge>
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="xs" variant="light" color="gray">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 2 && (
            <Badge size="xs" variant="light" color="gray">
              +{template.tags.length - 2}
            </Badge>
          )}
        </Group>

        {showPreview && (
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            mt={4}
            onClick={(e) => {
              e.stopPropagation();
              showPreview(template);
            }}
          >
            预览效果
          </Button>
        )}

        <Text size="xs" c="dimmed" mt={4}>
          更新于 {formatDate(template.updatedAt)}
        </Text>
      </Stack>
    </Card>
  );
}
