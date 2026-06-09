import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  TextInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Group,
  Button,
  Text,
  Box,
  Center,
  Badge,
  ScrollArea,
  ThemeIcon,
  Divider,
  Select,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconTemplate,
  IconUpload,
  IconSparkles,
  IconClock,
  IconSortDescending,
  IconCopy,
  IconEye,
  IconFilter,
  IconStar,
} from '@tabler/icons-react';
import { TemplateCard } from './TemplateCard';
import { SaveTemplateModal } from './SaveTemplateModal';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { BatchApplyModal } from './BatchApplyModal';
import type { DesignTemplate, TemplateType, CanvasElement, PaperConfig, SceneCategory } from '../types';
import { SCENE_CATEGORIES } from '../types';
import {
  getAllTemplates,
  searchTemplates,
  saveTemplate,
  deleteTemplate,
  createTemplate,
  downloadTemplateFile,
  generateTemplateThumbnail,
  updateTemplate,
  importTemplate,
} from '../utils/templateStorage';
import {
  recommendTemplates,
  detectScene,
  getRecentTemplates,
  addRecentTemplate,
  sortTemplatesBySimilarity,
} from '../utils/templateRecommendation';
import { notifications } from '@mantine/notifications';

type SortType = 'similarity' | 'recent' | 'usage' | 'newest' | 'name';

interface TemplateLibraryModalProps {
  opened: boolean;
  onClose: () => void;
  onApplyTemplate: (template: DesignTemplate) => void;
  elements: CanvasElement[];
  paper: PaperConfig;
}

export function TemplateLibraryModal({
  opened,
  onClose,
  onApplyTemplate,
  elements,
  paper,
}: TemplateLibraryModalProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TemplateType>('all');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [saveModalOpened, setSaveModalOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DesignTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortType>('similarity');
  const [sceneFilter, setSceneFilter] = useState<SceneCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<DesignTemplate | null>(null);
  const [batchModalOpened, setBatchModalOpened] = useState(false);
  const [batchTemplate, setBatchTemplate] = useState<DesignTemplate | null>(null);
  const [detectedScene, setDetectedScene] = useState<ReturnType<typeof detectScene> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = () => {
    const allTemplates = getAllTemplates();
    setTemplates(allTemplates);
  };

  useEffect(() => {
    if (opened) {
      loadTemplates();
      setDetectedScene(detectScene(elements, paper));
    }
  }, [opened, elements, paper]);

  const recentTemplateIds = useMemo(() => getRecentTemplates(), [opened, templates]);

  const recommendations = useMemo(() => {
    if (templates.length === 0) return [];
    return recommendTemplates(templates, elements, paper, {
      limit: 6,
      type: filterType === 'all' ? 'all' : filterType,
    });
  }, [templates, elements, paper, filterType]);

  const filteredTemplates = useMemo(() => {
    const typeFilter = filterType === 'all' ? undefined : filterType;
    let result = searchTemplates(searchQuery, {
      category: activeCategory,
      type: typeFilter,
    });

    if (sceneFilter !== 'all') {
      const sceneLabel = SCENE_CATEGORIES.find((s) => s.value === sceneFilter)?.label;
      if (sceneLabel) {
        result = result.filter(
          (t) =>
            t.category === sceneLabel ||
            t.tags.some((tag) => tag.includes(sceneLabel) || sceneLabel.includes(tag))
        );
      }
    }

    switch (sortBy) {
      case 'similarity':
        result = sortTemplatesBySimilarity(result, elements, paper);
        break;
      case 'recent':
        const recentIds = getRecentTemplates();
        result = [...result].sort((a, b) => {
          const aIndex = recentIds.indexOf(a.id);
          const bIndex = recentIds.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        break;
      case 'usage':
        result = [...result].sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'newest':
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
    }

    return result;
  }, [searchQuery, filterType, activeCategory, templates, sortBy, sceneFilter, elements, paper]);

  const recentTemplates = useMemo(() => {
    const recentIds = getRecentTemplates();
    return recentIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is DesignTemplate => !!t);
  }, [templates, opened]);

  const handleSaveTemplate = async (options: {
    name: string;
    category: string;
    tags: string[];
    description: string;
    type: TemplateType;
  }) => {
    try {
      const thumbnail = await generateTemplateThumbnail(elements, paper);

      if (editingTemplate) {
        const updatedTemplate = createTemplate(elements, paper, {
          ...options,
          thumbnail,
        });
        updateTemplate(editingTemplate.id, {
          ...updatedTemplate,
          id: editingTemplate.id,
          createdAt: editingTemplate.createdAt,
          usageCount: editingTemplate.usageCount,
        });
        notifications.show({
          title: '更新成功',
          message: '模板信息和内容已更新',
          color: 'green',
        });
      } else {
        const template = createTemplate(elements, paper, {
          ...options,
          thumbnail,
        });
        saveTemplate(template);
        notifications.show({
          title: '保存成功',
          message: `模板 "${options.name}" 已保存`,
          color: 'green',
        });
      }

      loadTemplates();
      setEditingTemplate(null);
    } catch (e) {
      notifications.show({
        title: '保存失败',
        message: '模板保存失败，请重试',
        color: 'red',
      });
    }
  };

  const handleDeleteTemplate = (template: DesignTemplate) => {
    if (window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      deleteTemplate(template.id);
      loadTemplates();
      notifications.show({
        title: '已删除',
        message: `模板 "${template.name}" 已删除`,
        color: 'blue',
      });
    }
  };

  const handleEditTemplate = (template: DesignTemplate) => {
    setEditingTemplate(template);
    setSaveModalOpened(true);
  };

  const handleExportTemplate = (template: DesignTemplate) => {
    downloadTemplateFile(template);
    notifications.show({
      title: '导出成功',
      message: `模板 "${template.name}" 已导出`,
      color: 'green',
    });
  };

  const handleApplyTemplate = (template: DesignTemplate) => {
    addRecentTemplate(template.id);
    onApplyTemplate(template);
    onClose();
  };

  const handlePreviewTemplate = (template: DesignTemplate) => {
    setPreviewTemplate(template);
  };

  const handleBatchApply = (template: DesignTemplate) => {
    setBatchTemplate(template);
    setBatchModalOpened(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let importedTemplate = importTemplate(content);
        
        if (importedTemplate) {
          importedTemplate = {
            ...importedTemplate,
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0,
          };
          saveTemplate(importedTemplate);
          loadTemplates();
          notifications.show({
            title: '导入成功',
            message: `模板 "${importedTemplate.name}" 已导入`,
            color: 'green',
          });
        } else {
          notifications.show({
            title: '导入失败',
            message: '模板文件格式不正确',
            color: 'red',
          });
        }
      } catch (err) {
        notifications.show({
          title: '导入失败',
          message: '读取文件失败，请重试',
          color: 'red',
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return ['全部', ...Array.from(cats)];
  }, [templates]);

  const sortOptions = [
    { value: 'similarity', label: '智能匹配' },
    { value: 'recent', label: '最近使用' },
    { value: 'usage', label: '使用频率' },
    { value: 'newest', label: '最新创建' },
    { value: 'name', label: '名称排序' },
  ];

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="sm">
            <IconTemplate size={22} color="#228be6" />
            <Text fw={600} size="xl">
              模板库
            </Text>
            <Badge color="violet" variant="light" size="lg" leftSection={<IconSparkles size={12} />}>
              智能推荐
            </Badge>
          </Group>
        }
        size="xl"
        fullScreen
        style={{ maxWidth: 1400 }}
      >
        <Stack gap="md" h="calc(100vh - 120px)">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" style={{ flex: 1 }}>
              <TextInput
                placeholder="搜索模板名称、描述或标签..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, maxWidth: 400 }}
              />
              <SegmentedControl
                value={filterType}
                onChange={(val) => setFilterType(val as 'all' | TemplateType)}
                data={[
                  { value: 'all', label: '全部' },
                  { value: 'full', label: '完整模板' },
                  { value: 'style', label: '风格模板' },
                ]}
                size="sm"
              />
            </Group>
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconUpload size={16} />}
                onClick={handleImportClick}
              >
                导入模板
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setEditingTemplate(null);
                  setSaveModalOpened(true);
                }}
              >
                保存当前设计
              </Button>
            </Group>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </Group>

          {detectedScene && elements.length > 0 && (
            <Group gap="xs">
              <ThemeIcon size="sm" color="violet" variant="light">
                <IconSparkles size={14} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                智能识别当前场景为
              </Text>
              <Badge color="violet" variant="light" size="lg">
                {SCENE_CATEGORIES.find((s) => s.value === detectedScene.scene)?.label || '未知'}
              </Badge>
              <Text size="xs" c="dimmed">
                (置信度 {detectedScene.confidence}%)
              </Text>
              {detectedScene.indicators.length > 0 && (
                <Text size="xs" c="dimmed">
                  · {detectedScene.indicators[0]}
                </Text>
              )}
            </Group>
          )}

          {recommendations.length > 0 && elements.length > 0 && activeTab === 'all' && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon size="md" color="grape" variant="filled">
                    <IconSparkles size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    为你推荐
                  </Text>
                  <Text size="xs" c="dimmed">
                    基于当前设计智能匹配
                  </Text>
                </Group>
                <Button
                  variant="subtle"
                  size="xs"
                  rightSection={<IconEye size={14} />}
                  onClick={() => setActiveTab('recommendations')}
                >
                  查看更多
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
                {recommendations.slice(0, 6).map((rec) => (
                  <TemplateCard
                    key={rec.template.id}
                    template={rec.template}
                    onApply={handleApplyTemplate}
                    onDelete={handleDeleteTemplate}
                    onEdit={handleEditTemplate}
                    onExport={handleExportTemplate}
                    onBatchApply={handleBatchApply}
                    similarity={rec.similarity}
                    isRecommended={true}
                    matchLevel={rec.matchLevel}
                    showPreview={handlePreviewTemplate}
                  />
                ))}
              </SimpleGrid>
              <Divider my="md" />
            </Box>
          )}

          {recentTemplates.length > 0 && activeTab === 'all' && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon size="md" color="orange" variant="light">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    最近使用
                  </Text>
                  <Text size="xs" c="dimmed">
                    快速访问常用模板
                  </Text>
                </Group>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
                {recentTemplates.slice(0, 5).map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={handleApplyTemplate}
                    onDelete={handleDeleteTemplate}
                    onEdit={handleEditTemplate}
                    onExport={handleExportTemplate}
                    onBatchApply={handleBatchApply}
                    isRecent={true}
                    showPreview={handlePreviewTemplate}
                  />
                ))}
              </SimpleGrid>
              <Divider my="md" />
            </Box>
          )}

          <Group gap={4} grow wrap="nowrap" align="flex-start" style={{ flex: 1, minHeight: 0 }}>
            <Box style={{ width: 180, flexShrink: 0 }}>
              <Stack gap={2}>
                <Text size="xs" fw={500} c="dimmed" px="xs" py={4}>
                  浏览
                </Text>
                <Button
                  variant={activeTab === 'all' ? 'light' : 'subtle'}
                  size="sm"
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconTemplate size={14} />}
                  onClick={() => setActiveTab('all')}
                >
                  全部模板
                </Button>
                <Button
                  variant={activeTab === 'recommendations' ? 'light' : 'subtle'}
                  size="sm"
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconSparkles size={14} />}
                  onClick={() => setActiveTab('recommendations')}
                >
                  智能推荐
                  {recommendations.length > 0 && (
                    <Badge size="xs" color="grape" variant="filled" ml="auto">
                      {recommendations.length}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === 'recent' ? 'light' : 'subtle'}
                  size="sm"
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconClock size={14} />}
                  onClick={() => setActiveTab('recent')}
                >
                  最近使用
                </Button>

                <Text size="xs" fw={500} c="dimmed" px="xs" py={4} mt="md">
                  场景筛选
                </Text>
                <Stack gap={2}>
                  <Button
                    variant={sceneFilter === 'all' ? 'light' : 'subtle'}
                    size="sm"
                    fullWidth
                    justify="flex-start"
                    leftSection={<IconFilter size={14} />}
                    onClick={() => setSceneFilter('all')}
                  >
                    全部场景
                  </Button>
                  {SCENE_CATEGORIES.map((scene) => (
                    <Button
                      key={scene.value}
                      variant={sceneFilter === scene.value ? 'light' : 'subtle'}
                      size="sm"
                      fullWidth
                      justify="flex-start"
                      onClick={() => setSceneFilter(scene.value)}
                    >
                      {scene.label}
                    </Button>
                  ))}
                </Stack>

                <Text size="xs" fw={500} c="dimmed" px="xs" py={4} mt="md">
                  分类
                </Text>
                <ScrollArea h={150}>
                  <Stack gap={2}>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={activeCategory === cat ? 'light' : 'subtle'}
                        size="sm"
                        fullWidth
                        justify="flex-start"
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Box>

            <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Group justify="space-between" mb="xs">
                <Group gap="sm">
                  <Select
                    value={sortBy}
                    onChange={(val) => setSortBy(val as SortType)}
                    data={sortOptions}
                    size="sm"
                    leftSection={<IconSortDescending size={14} />}
                    style={{ width: 140 }}
                  />
                  <Text size="sm" c="dimmed">
                    共 {filteredTemplates.length} 个模板
                  </Text>
                </Group>
                <Group gap="sm">
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconCopy size={14} />}
                    onClick={() => {
                      if (filteredTemplates.length > 0) {
                        setBatchTemplate(filteredTemplates[0]);
                        setBatchModalOpened(true);
                      }
                    }}
                    disabled={filteredTemplates.length === 0}
                  >
                    批量套用
                  </Button>
                </Group>
              </Group>

              <ScrollArea style={{ flex: 1 }}>
                {activeTab === 'recommendations' ? (
                  recommendations.length > 0 ? (
                    <Stack gap="md">
                      <Box p="md" style={{ background: '#f8f0fc', borderRadius: 8, border: '1px solid #e599f7' }}>
                        <Group gap="sm" mb="sm">
                          <ThemeIcon color="grape" size="lg">
                            <IconSparkles size={20} />
                          </ThemeIcon>
                          <div>
                            <Text fw={600}>智能推荐说明</Text>
                            <Text size="sm" c="dimmed">
                              基于纸张尺寸、元素数量、标题正文比例、装饰密度和留白情况综合匹配
                            </Text>
                          </div>
                        </Group>
                        <SimpleGrid cols={3} spacing="sm">
                          {[
                            { label: '纸张尺寸匹配', desc: '尺寸和比例越接近分数越高' },
                            { label: '文字层级相似', desc: '标题正文比例影响阅读节奏' },
                            { label: '留白风格接近', desc: '边距比例反映版面呼吸感' },
                          ].map((item, i) => (
                            <Box key={i} p="sm" style={{ background: 'white', borderRadius: 6 }}>
                              <Text fw={500} size="sm">
                                {item.label}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {item.desc}
                              </Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </Box>
                      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                        {recommendations.map((rec) => (
                          <Stack key={rec.template.id} gap="xs">
                            <TemplateCard
                              template={rec.template}
                              onApply={handleApplyTemplate}
                              onDelete={handleDeleteTemplate}
                              onEdit={handleEditTemplate}
                              onExport={handleExportTemplate}
                              onBatchApply={handleBatchApply}
                              similarity={rec.similarity}
                              isRecommended={true}
                              matchLevel={rec.matchLevel}
                              showPreview={handlePreviewTemplate}
                            />
                            {rec.reasons.length > 0 && (
                              <Stack gap={2} p="xs" style={{ background: '#f8f9fa', borderRadius: 6 }}>
                                <Text size="xs" fw={500} c="dimmed">
                                  推荐理由
                                </Text>
                                {rec.reasons.slice(0, 2).map((reason) => (
                                  <Group key={reason.id} gap={4}>
                                    <IconStar size={10} color="#fab005" />
                                    <Text size="xs" lineClamp={1}>
                                      {reason.title}
                                    </Text>
                                  </Group>
                                ))}
                              </Stack>
                            )}
                          </Stack>
                        ))}
                      </SimpleGrid>
                    </Stack>
                  ) : (
                    <Center style={{ height: 300 }}>
                      <Stack align="center" gap="md">
                        <IconSparkles size={48} color="#adb5bd" />
                        <Stack gap={4} align="center">
                          <Text fw={500} size="lg">
                            暂无推荐
                          </Text>
                          <Text size="sm" c="dimmed" ta="center" maw={300}>
                            保存更多模板后，系统将为你智能推荐匹配的模板
                          </Text>
                        </Stack>
                      </Stack>
                    </Center>
                  )
                ) : activeTab === 'recent' ? (
                  recentTemplates.length > 0 ? (
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                      {recentTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onApply={handleApplyTemplate}
                          onDelete={handleDeleteTemplate}
                          onEdit={handleEditTemplate}
                          onExport={handleExportTemplate}
                          onBatchApply={handleBatchApply}
                          isRecent={true}
                          showPreview={handlePreviewTemplate}
                        />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Center style={{ height: 300 }}>
                      <Stack align="center" gap="md">
                        <IconClock size={48} color="#adb5bd" />
                        <Stack gap={4} align="center">
                          <Text fw={500} size="lg">
                            暂无最近使用
                          </Text>
                          <Text size="sm" c="dimmed" ta="center" maw={300}>
                            使用模板后，这里会显示你最近用过的模板
                          </Text>
                        </Stack>
                      </Stack>
                    </Center>
                  )
                ) : filteredTemplates.length > 0 ? (
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {filteredTemplates.map((template) => {
                      const similarity = sortBy === 'similarity'
                        ? recommendations.find((r) => r.template.id === template.id)?.similarity
                        : undefined;
                      const matchLevel = sortBy === 'similarity'
                        ? recommendations.find((r) => r.template.id === template.id)?.matchLevel
                        : undefined;
                      const isRecent = recentTemplateIds.includes(template.id);

                      return (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onApply={handleApplyTemplate}
                          onDelete={handleDeleteTemplate}
                          onEdit={handleEditTemplate}
                          onExport={handleExportTemplate}
                          onBatchApply={handleBatchApply}
                          similarity={similarity}
                          matchLevel={matchLevel}
                          isRecent={isRecent}
                          showPreview={handlePreviewTemplate}
                        />
                      );
                    })}
                  </SimpleGrid>
                ) : (
                  <Center style={{ height: 300 }}>
                    <Stack align="center" gap="md">
                      <IconTemplate size={48} color="#adb5bd" />
                      <Stack gap={4} align="center">
                        <Text fw={500} size="lg">
                          暂无模板
                        </Text>
                        <Text size="sm" c="dimmed" ta="center" maw={300}>
                          {searchQuery || filterType !== 'all' || activeCategory !== '全部' || sceneFilter !== 'all'
                            ? '没有找到匹配的模板，试试其他搜索条件'
                            : '还没有保存任何模板，点击"保存当前设计"开始创建'}
                        </Text>
                      </Stack>
                    </Stack>
                  </Center>
                )}
              </ScrollArea>
            </Box>
          </Group>

          <Group justify="space-between" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
            <Text size="sm" c="dimmed">
              共 {filteredTemplates.length} 个模板 · 最近使用 {recentTemplates.length} 个
            </Text>
            <Button variant="light" onClick={onClose}>
              关闭
            </Button>
          </Group>
        </Stack>
      </Modal>

      <SaveTemplateModal
        opened={saveModalOpened}
        onClose={() => {
          setSaveModalOpened(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        elements={elements}
        paper={paper}
        editingTemplate={editingTemplate}
      />

      <TemplatePreviewModal
        opened={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
        currentElements={elements}
        currentPaper={paper}
        onApply={handleApplyTemplate}
        reasons={recommendations.find((r) => r.template.id === previewTemplate?.id)?.reasons}
        matchLevel={recommendations.find((r) => r.template.id === previewTemplate?.id)?.matchLevel}
      />

      <BatchApplyModal
        opened={batchModalOpened}
        onClose={() => {
          setBatchModalOpened(false);
          setBatchTemplate(null);
          loadTemplates();
        }}
        template={batchTemplate}
      />
    </>
  );
}
