import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Group,
  Stack,
  Text,
  Badge,
  Box,
  Tabs,
  ScrollArea,
  Button,
  SimpleGrid,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconPalette,
  IconTypography,
  IconArrowsDiagonal,
  IconSparkles,
  IconArrowRight,
} from '@tabler/icons-react';
import type {
  DesignTemplate,
  CanvasElement,
  PaperConfig,
  TemplateDiff,
  RecommendationReason,
} from '../types';
import { previewTemplateApply } from '../utils/templateRecommendation';
import { generateTemplateThumbnail } from '../utils/templateStorage';

interface TemplatePreviewModalProps {
  opened: boolean;
  onClose: () => void;
  template: DesignTemplate | null;
  currentElements: CanvasElement[];
  currentPaper: PaperConfig;
  onApply: (template: DesignTemplate) => void;
  reasons?: RecommendationReason[];
  matchLevel?: 'perfect' | 'high' | 'medium' | 'low';
}

export function TemplatePreviewModal({
  opened,
  onClose,
  template,
  currentElements,
  currentPaper,
  onApply,
  reasons,
  matchLevel,
}: TemplatePreviewModalProps) {
  const [beforeThumbnail, setBeforeThumbnail] = useState<string | null>(null);
  const [afterThumbnail, setAfterThumbnail] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    elements: CanvasElement[];
    paper: PaperConfig;
    diff: TemplateDiff;
  } | null>(null);

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

  useEffect(() => {
    if (opened && template) {
      const result = previewTemplateApply(template, currentElements, currentPaper);
      setPreviewResult(result);

      generateTemplateThumbnail(currentElements, currentPaper).then((thumb) => {
        setBeforeThumbnail(thumb);
      });

      generateTemplateThumbnail(result.elements, result.paper).then((thumb) => {
        setAfterThumbnail(thumb);
      });
    } else {
      setPreviewResult(null);
      setBeforeThumbnail(null);
      setAfterThumbnail(null);
    }
  }, [opened, template, currentElements, currentPaper]);

  const diffSummary = useMemo(() => {
    if (!previewResult) return null;
    const { diff } = previewResult;
    return diff.summary;
  }, [previewResult]);

  const handleApply = () => {
    if (template) {
      onApply(template);
      onClose();
    }
  };

  if (!template) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600} size="lg">
            模板预览
          </Text>
          {matchLevel && (
            <Badge color={matchLevelColors[matchLevel]} variant="light" size="lg">
              {matchLevelLabels[matchLevel]}
            </Badge>
          )}
        </Group>
      }
      size="xl"
    >
      <Stack gap="lg">
        <Group gap="md" align="stretch">
          <Box style={{ flex: 1 }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Badge color="gray" variant="light" size="md">
                  当前设计
                </Badge>
                <Text size="sm" c="dimmed">
                  {currentElements.length} 个元素
                </Text>
              </Group>
              <Box
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#f8f9fa',
                  aspectRatio: `${currentPaper.width} / ${currentPaper.height}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {beforeThumbnail ? (
                  <img
                    src={beforeThumbnail}
                    alt="当前设计"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Text size="sm" c="dimmed">
                    生成预览中...
                  </Text>
                )}
              </Box>
            </Stack>
          </Box>

          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ThemeIcon size="lg" color="blue" variant="light" radius="xl">
              <IconArrowRight size={20} />
            </ThemeIcon>
          </Box>

          <Box style={{ flex: 1 }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Badge color="green" variant="light" size="md">
                  套用后
                </Badge>
                <Text size="sm" c="dimmed">
                  {previewResult?.elements.length || 0} 个元素
                </Text>
              </Group>
              <Box
                style={{
                  border: '2px solid #228be6',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#f8f9fa',
                  aspectRatio: `${previewResult?.paper.width || template.paper.width} / ${previewResult?.paper.height || template.paper.height}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 3px rgba(34, 139, 230, 0.1)',
                }}
              >
                {afterThumbnail ? (
                  <img
                    src={afterThumbnail}
                    alt="套用后"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Text size="sm" c="dimmed">
                    生成预览中...
                  </Text>
                )}
              </Box>
            </Stack>
          </Box>
        </Group>

        {diffSummary && (
          <Group justify="center" gap="lg">
            <Stack gap={4} align="center">
              <ThemeIcon size="lg" color="blue" variant="light">
                <IconTypography size={18} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {diffSummary.styleChanges}
              </Text>
              <Text size="xs" c="dimmed">
                样式变化
              </Text>
            </Stack>
            <Stack gap={4} align="center">
              <ThemeIcon size="lg" color="teal" variant="light">
                <IconArrowsDiagonal size={18} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {diffSummary.elementChanges}
              </Text>
              <Text size="xs" c="dimmed">
                元素变化
              </Text>
            </Stack>
            <Stack gap={4} align="center">
              <ThemeIcon size="lg" color="violet" variant="light">
                <IconPalette size={18} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {diffSummary.paperChanges}
              </Text>
              <Text size="xs" c="dimmed">
                纸张变化
              </Text>
            </Stack>
            <Divider orientation="vertical" />
            <Stack gap={4} align="center">
              <ThemeIcon size="lg" color="green" variant="light">
                <IconSparkles size={18} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {diffSummary.totalChanges}
              </Text>
              <Text size="xs" c="dimmed">
                总计变更
              </Text>
            </Stack>
          </Group>
        )}

        <Tabs defaultValue="changes">
          <Tabs.List>
            <Tabs.Tab value="changes" leftSection={<IconCheck size={14} />}>
              变更详情
            </Tabs.Tab>
            {reasons && reasons.length > 0 && (
              <Tabs.Tab value="reasons" leftSection={<IconSparkles size={14} />}>
                推荐理由
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="changes" pt="md">
            <ScrollArea h={200}>
              <Stack gap="md">
                {previewResult && previewResult.diff.styleChanges && (
                  <div>
                    <Text fw={500} size="sm" mb="xs">
                      样式变更
                    </Text>
                    <SimpleGrid cols={2} spacing="xs">
                      {Object.entries(previewResult.diff.styleChanges).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          fontFamily: '字体',
                          titleFontSize: '标题字号',
                          bodyFontSize: '正文字号',
                          titleColor: '标题颜色',
                          bodyColor: '正文颜色',
                          backgroundColor: '背景色',
                        };
                        return (
                          <Group key={key} gap="xs">
                            <Badge size="xs" variant="outline" color="gray">
                              {labels[key] || key}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {String(value.old)}
                            </Text>
                            <IconArrowRight size={12} color="#adb5bd" />
                            <Text size="xs" fw={500} c="green">
                              {String(value.new)}
                            </Text>
                          </Group>
                        );
                      })}
                    </SimpleGrid>
                  </div>
                )}

                {previewResult && previewResult.diff.paperChanges && (
                  <div>
                    <Text fw={500} size="sm" mb="xs">
                      纸张变更
                    </Text>
                    <SimpleGrid cols={2} spacing="xs">
                      {Object.entries(previewResult.diff.paperChanges).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          width: '宽度',
                          height: '高度',
                          backgroundColor: '背景色',
                        };
                        return (
                          <Group key={key} gap="xs">
                            <Badge size="xs" variant="outline" color="gray">
                              {labels[key] || key}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {String(value.old)}
                            </Text>
                            <IconArrowRight size={12} color="#adb5bd" />
                            <Text size="xs" fw={500} c="green">
                              {String(value.new)}
                            </Text>
                          </Group>
                        );
                      })}
                    </SimpleGrid>
                  </div>
                )}

                {previewResult && previewResult.diff.elementChanges.added.length > 0 && (
                  <div>
                    <Text fw={500} size="sm" mb="xs">
                      新增元素 ({previewResult.diff.elementChanges.added.length})
                    </Text>
                    <Text size="xs" c="green">
                      将新增 {previewResult.diff.elementChanges.added.length} 个元素
                    </Text>
                  </div>
                )}

                {previewResult && previewResult.diff.elementChanges.removed.length > 0 && (
                  <div>
                    <Text fw={500} size="sm" mb="xs">
                      移除元素 ({previewResult.diff.elementChanges.removed.length})
                    </Text>
                    <Text size="xs" c="red">
                      将移除 {previewResult.diff.elementChanges.removed.length} 个元素
                    </Text>
                  </div>
                )}

                {previewResult && previewResult.diff.elementChanges.modified.length > 0 && (
                  <div>
                    <Text fw={500} size="sm" mb="xs">
                      修改元素属性 ({previewResult.diff.elementChanges.modified.length})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {previewResult.diff.elementChanges.modified.length} 个元素的属性将被修改
                    </Text>
                  </div>
                )}
              </Stack>
            </ScrollArea>
          </Tabs.Panel>

          {reasons && reasons.length > 0 && (
            <Tabs.Panel value="reasons" pt="md">
              <ScrollArea h={200}>
                <Stack gap="sm">
                  {reasons.map((reason) => (
                    <Group key={reason.id} gap="sm" align="flex-start">
                      <ThemeIcon
                        size="sm"
                        color={
                          reason.type === 'match'
                            ? 'green'
                            : reason.type === 'improvement'
                            ? 'blue'
                            : 'violet'
                        }
                        variant="light"
                      >
                        {reason.type === 'match' ? (
                          <IconCheck size={14} />
                        ) : reason.type === 'improvement' ? (
                          <IconSparkles size={14} />
                        ) : (
                          <IconPalette size={14} />
                        )}
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="sm">
                          {reason.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {reason.description}
                        </Text>
                      </div>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Tabs.Panel>
          )}
        </Tabs>

        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            模板: {template.name}
          </Text>
          <Group gap="sm">
            <Button variant="light" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleApply}>
              套用此模板
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
