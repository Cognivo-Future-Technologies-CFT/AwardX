import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Save, UserCheck, AlertTriangle } from 'lucide-react';
import { Program, Category, Judge } from '../../services/models';
import { db } from '../../services/database';
import { Button } from '../Button';
import { toast } from 'sonner';
import { isAutoAssignJudging } from '../../lib/judgingType';

interface JudgeCategoryMappingViewProps {
  activeEvent: Program | null;
}

type MappableCategory = {
  id: string;
  label: string;
  parentTitle?: string;
};

function buildMappableCategories(categories: Category[]): MappableCategory[] {
  const parents = categories.filter((category) => !category.parentId);
  const childrenByParent = new Map<string, Category[]>();

  categories.forEach((category) => {
    if (!category.parentId) return;
    childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) || []), category]);
  });

  const rows: MappableCategory[] = [];
  parents.forEach((parent) => {
    const children = childrenByParent.get(parent.id) || [];
    if (children.length > 0) {
      children.forEach((child) => {
        rows.push({
          id: child.id,
          label: `${parent.title} → ${child.title}`,
          parentTitle: parent.title,
        });
      });
    } else {
      rows.push({ id: parent.id, label: parent.title });
    }
  });

  categories.forEach((category) => {
    if (category.parentId && !parents.some((parent) => parent.id === category.parentId)) {
      rows.push({ id: category.id, label: category.title });
    }
  });

  return rows;
}

export const JudgeCategoryMappingView: React.FC<JudgeCategoryMappingViewProps> = ({ activeEvent }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const mappableCategories = useMemo(() => buildMappableCategories(categories), [categories]);
  const autoAssign = isAutoAssignJudging(activeEvent?.judgingType);

  const loadData = useCallback(async () => {
    if (!activeEvent?.id) return;
    setLoading(true);
    try {
      const [loadedCategories, loadedJudges] = await Promise.all([
        db.getCategories(activeEvent.id),
        db.getJudges(activeEvent.id),
      ]);
      setCategories(loadedCategories);
      setJudges(loadedJudges);

      const nextMapping: Record<string, string[]> = {};
      loadedJudges.forEach((judge) => {
        (judge.categoryIds || []).forEach((categoryId) => {
          if (!nextMapping[categoryId]) nextMapping[categoryId] = [];
          if (!nextMapping[categoryId].includes(judge.id)) {
            nextMapping[categoryId].push(judge.id);
          }
        });
      });
      setMapping(nextMapping);
      setDirty(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load category mapping');
    } finally {
      setLoading(false);
    }
  }, [activeEvent?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleJudge = (categoryId: string, judgeId: string) => {
    setMapping((prev) => {
      const current = prev[categoryId] || [];
      const exists = current.includes(judgeId);
      const next = exists ? current.filter((id) => id !== judgeId) : [...current, judgeId];
      return { ...prev, [categoryId]: next };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!activeEvent?.id) return;
    setSaving(true);
    try {
      await db.saveJudgeCategoryMapping(activeEvent.id, mapping);
      toast.success('Category mappings saved');
      setDirty(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a program to manage judge category mapping.
      </div>
    );
  }

  if (!autoAssign) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Parallel judging is active</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Judge → Category mapping applies only to programs using Auto Assign Judging.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Auto Assign Judging</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Judge → Category Mapping</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Assign judges to the categories they should score. Judges only see submissions from their assigned categories.
          </p>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="shrink-0 transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save mappings'}
        </Button>
      </div>

      {judges.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>Invite judges before assigning categories. You can update mappings anytime.</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading categories and judges…
        </div>
      ) : mappableCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No categories yet</p>
          <p className="mt-1 text-sm text-slate-500">Create categories in Awards before mapping judges.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mappableCategories.map((category, index) => {
            const assignedJudgeIds = mapping[category.id] || [];
            return (
              <section
                key={category.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                style={{
                  animation: 'fadeIn 220ms ease-out forwards',
                  animationDelay: `${Math.min(index, 8) * 40}ms`,
                  opacity: 0,
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{category.label}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {assignedJudgeIds.length} judge{assignedJudgeIds.length === 1 ? '' : 's'} assigned
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {judges.length === 0 ? (
                      <span className="text-sm text-slate-400">No judges available</span>
                    ) : (
                      judges.map((judge) => {
                        const selected = assignedJudgeIds.includes(judge.id);
                        return (
                          <button
                            key={judge.id}
                            type="button"
                            onClick={() => toggleJudge(category.id, judge.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] ${
                              selected
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {selected && <UserCheck className="h-3.5 w-3.5" />}
                            {judge.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          section { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
};
