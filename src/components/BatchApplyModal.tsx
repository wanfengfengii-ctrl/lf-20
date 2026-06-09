import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Group,
  Stack,
  Text,
  Badge,
  Box,
  Button,
  Checkbox,
  ScrollArea,
  SimpleGrid,
  TextInput,
  ThemeIcon,
  Stepper,
  Divider,
  Alert,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconSearch,
  IconTemplate,
  IconSparkles,
  IconFileText,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { DesignTemplate, DesignItem, CanvasElement, PaperConfig } from '../types';
import { getDesignItems, updateDesignInLibrary } from '../utils/designStorage';
import { batchApplyTemplate, calculateTemplateSimilarity } from '../utils/templateRecommendation';
import { generateTemplateThumbnail } from '../utils/templateStorage';

interface BatchApplyModalProps {
  opened: boolean;
  onClose: () => void;
  template: DesignTemplate | null;
  onComplete?: (results: unknown[]) => void;
}

export function BatchApplyModal({
  opened,
  onClose,
  template,
  onComplete,
}: BatchApplyModalProps) {
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<
    {
      designId: string;
      designName: string;
      success: boolean;
      error?: string;
      diffSummary: { totalChanges: number; styleChanges: number; elementChanges: number };
    }[]
  >([]);

  useEffect(() => {
    if (opened) {
      const designItems = getDesignItems();
      setDesigns(designItems);
      setSelectedIds(new Set());
      setActiveStep(0);
      setBatchResults([]);
      setIsProcessing(false);
    }
  }, [opened]);

  const filteredDesigns = useMemo(() => {
    if (!searchQuery.trim()) return designs;
    const lowerQuery = searchQuery.toLowerCase();
    return designs.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerQuery)
    );
  }, [designs, searchQuery]);

  const toggleDesign = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredDesigns.length && filteredDesigns.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDesigns.map((d) => d.id)));
    }
  };

  const handleNextStep = () => {
    if (selectedIds.size === 0) {
      notifications.show({
        title: '请选择设计',
        message: '请至少选择一个设计稿进行批量套用',
        color: 'yellow',
      });
      return;
    }
    setActiveStep(1);
  };

  const handleBatchApply = async () => {
    if (!template || selectedIds.size === 0) return;

    setIsProcessing(true);

    try {
      const selectedDesigns = designs
        .filter((d) => selectedIds.has(d.id))
        .map((d) => ({
          id: d.id,
          name: d.name,
          elements: d.elements,
          paper: d.paper,
        }));

      const result = batchApplyTemplate(template, selectedDesigns);

      for (const r of result.results) {
        if (r.success) {
          const thumbnail = await generateTemplateThumbnail(r.elementsAfter, r.paperAfter);
          updateDesignInLibrary(r.designId, {
            elements: r.elementsAfter,
            paper: r.paperAfter,
            thumbnail,
          });
        }
      }

      setBatchResults(
        result.results.map((r) => ({
          designId: r.designId,
          designName: r.designName,
          success: r.success,
          error: r.error,
          diffSummary: {
            totalChanges: r.diff.summary.totalChanges,
            styleChanges: r.diff.summary.styleChanges,
            elementChanges: r.diff.summary.elementChanges,
          },
        }))
      );

      setActiveStep(2);

      notifications.show({
        title: '批量套用完成',
        message: `成功 ${result.successCount} 个，失败 ${result.failCount} 个`,
        color: result.failCount > 0 ? 'yellow' : 'green',
      });

      if (onComplete) {
        onComplete(result.results);
      }
    } catch (e) {
      notifications.show({
        title: '批量套用失败',
        message: '发生未知错误，请重试',
        color: 'red',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSimilarityScore = (elements: CanvasElement[], paper: PaperConfig): number => {
    if (!template) return 0;
    return calculateTemplateSimilarity(template, elements, paper).overallScore;
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!template) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconTemplate size={20} color="#228be6" />
          <Text fw={600} size="lg">
            批量套用模板
          </Text>
          <Badge color="blue" variant="light">
            {template.name}
          </Badge>
        </Group>
      }
      size="xl"
      closeOnClickOutside={!isProcessing}
      closeOnEscape={!isProcessing}
    >
      <Stack gap="lg" style={{ minHeight: 400 }}>
        <Stepper active={activeStep} size="sm">
          <Stepper.Step label="选择设计" description="选择要套用的设计稿">
            <Stack gap="md" mt="md">
              <Group grow>
                <TextInput
                  placeholder="搜索设计名称..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Group gap="sm">
                  <Button variant="light" size="sm" onClick={toggleAll}>
                    {selectedIds.size === filteredDesigns.length && filteredDesigns.length > 0
                      ? '取消全选'
                      : '全选'}
                  </Button>
                  <Badge size="lg" variant="light" color="blue">
                    已选 {selectedIds.size} / {designs.length}
                  </Badge>
                </Group>
              </Group>

              {designs.length === 0 ? (
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 60,
                  }}
                >
                  <ThemeIcon size="xl" color="gray" variant="light" radius="xl">
                    <IconFileText size={32} />
                  </ThemeIcon>
                  <Text fw={500} mt="md">
                    暂无设计稿
                  </Text>
                  <Text size="sm" c="dimmed" mt={4} ta="center">
                    请先保存一些设计到设计库
                  </Text>
                </Box>
              ) : (
                <ScrollArea h={320}>
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                    {filteredDesigns.map((design) => {
                      const score = getSimilarityScore(design.elements, design.paper);
                      const isSelected = selectedIds.has(design.id);
                      return (
                        <Box
                          key={design.id}
                          style={{
                            border: isSelected
                              ? '2px solid #228be6'
                              : '1px solid #e9ecef',
                            borderRadius: 8,
                            padding: 8,
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(34, 139, 230, 0.05)' : 'white',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => toggleDesign(design.id)}
                        >
                          <Group gap="xs" mb={6}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleDesign(design.id)}
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                              {design.name}
                            </Text>
                          </Group>
                          <Box
                            style={{
                              height: 80,
                              background: design.thumbnail || '#f0f0f0',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {design.thumbnail ? (
                              <img
                                src={design.thumbnail}
                                alt={design.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <Text size="xs" c="dimmed">
                                {design.paper.width}×{design.paper.height}
                              </Text>
                            )}
                          </Box>
                          <Group justify="space-between" mt={6}>
                            <Badge size="xs" variant="outline" color="gray">
                              {design.elements.length} 元素
                            </Badge>
                            <Group gap={4}>
                              <IconSparkles size={12} color="#adb5bd" />
                              <Text size="xs" c="dimmed">
                                {score}% 匹配
                              </Text>
                            </Group>
                          </Group>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </ScrollArea>
              )}
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="确认套用" description="预览变更后确认">
            <Stack gap="md" mt="md">
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="即将批量套用模板"
                color="blue"
              >
                将对 {selectedIds.size} 个设计稿套用模板 "{template.name}"
                （{template.type === 'full' ? '完整模板' : '风格模板'}），
                套用后原设计将被覆盖。
              </Alert>

              <Group>
                <ThemeIcon color="violet" variant="light" size="lg">
                  <IconSparkles size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={500} size="sm">
                    智能分析结果
                  </Text>
                  <Text size="xs" c="dimmed">
                    系统将自动统一字体层级、装饰规则和留白比例
                  </Text>
                </div>
              </Group>

              <SimpleGrid cols={3} spacing="md">
                <Stack gap={4} align="center" p="md" style={{ background: '#f8f9fa', borderRadius: 8 }}>
                  <Text fw={600} size="xl" c="blue">
                    {selectedIds.size}
                  </Text>
                  <Text size="xs" c="dimmed">
                    设计稿数量
                  </Text>
                </Stack>
                <Stack gap={4} align="center" p="md" style={{ background: '#f8f9fa', borderRadius: 8 }}>
                  <Text fw={600} size="xl" c="violet">
                    {template.type === 'full' ? '完整' : '风格'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    模板类型
                  </Text>
                </Stack>
                <Stack gap={4} align="center" p="md" style={{ background: '#f8f9fa', borderRadius: 8 }}>
                  <Text fw={600} size="xl" c="teal">
                    统一
                  </Text>
                  <Text size="xs" c="dimmed">
                    风格一致性
                  </Text>
                </Stack>
              </SimpleGrid>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="完成" description="查看套用结果">
            <Stack gap="md" mt="md">
              <Group>
                <ThemeIcon color="green" size="lg">
                  <IconCheck size={20} />
                </ThemeIcon>
                <Text fw={500}>
                  批量套用完成
                </Text>
                <Badge color="green" variant="light">
                  成功 {batchResults.filter((r) => r.success).length}
                </Badge>
                {batchResults.some((r) => !r.success) && (
                  <Badge color="red" variant="light">
                    失败 {batchResults.filter((r) => !r.success).length}
                  </Badge>
                )}
              </Group>

              <ScrollArea h={280}>
                <Stack gap="xs">
                  {batchResults.map((result) => (
                    <Group
                      key={result.designId}
                      justify="space-between"
                      p="sm"
                      style={{
                        background: result.success ? '#f6ffed' : '#fff2f0',
                        borderRadius: 6,
                        border: `1px solid ${result.success ? '#b7eb8f' : '#ffa39e'}`,
                      }}
                    >
                      <Group gap="sm">
                        {result.success ? (
                          <ThemeIcon size="sm" color="green">
                            <IconCheck size={12} />
                          </ThemeIcon>
                        ) : (
                          <ThemeIcon size="sm" color="red">
                            <IconX size={12} />
                          </ThemeIcon>
                        )}
                        <Text size="sm" fw={500}>
                          {result.designName}
                        </Text>
                      </Group>
                      {result.success ? (
                        <Group gap="md">
                          <Text size="xs" c="dimmed">
                            样式变更: {result.diffSummary.styleChanges}
                          </Text>
                          <Text size="xs" c="dimmed">
                            元素变更: {result.diffSummary.elementChanges}
                          </Text>
                          <Text size="xs" c="green" fw={500}>
                            共 {result.diffSummary.totalChanges} 处变更
                          </Text>
                        </Group>
                      ) : (
                        <Text size="xs" c="red">
                          {result.error}
                        </Text>
                      )}
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Divider />

        <Group justify="space-between">
          {activeStep === 0 && (
            <>
              <Button variant="light" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleNextStep} rightSection={<IconArrowRight size={16} />}>
                下一步
              </Button>
            </>
          )}
          {activeStep === 1 && (
            <>
              <Button variant="light" onClick={() => setActiveStep(0)}>
                上一步
              </Button>
              <Button
                onClick={handleBatchApply}
                loading={isProcessing}
                leftSection={<IconSparkles size={16} />}
                color="violet"
              >
                确认批量套用
              </Button>
            </>
          )}
          {activeStep === 2 && (
            <Group justify="flex-end" style={{ width: '100%' }}>
              <Button onClick={handleClose}>
                完成
              </Button>
            </Group>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
