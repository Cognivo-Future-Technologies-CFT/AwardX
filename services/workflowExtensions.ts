import { Round, RoundEdge } from '../types/scheduleRounds';
import {
  InstalledWorkflowExtension,
  WorkflowExtension,
  WorkflowExtensionTemplate,
  RoundTemplate,
  RoundEdgeTemplate,
} from '../types/roundExtensions';
import { scheduleRoundsService } from './scheduleRoundsDb';

const INSTALLED_KEY = 'scheduleRounds_workflow_extensions_installed_v1';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeInstalledList(list: any): InstalledWorkflowExtension[] {
  if (!Array.isArray(list)) return [];

  const byId = new Map<string, InstalledWorkflowExtension>();
  for (const item of list) {
    const extensionId = String(item?.extensionId || '');
    const version = String(item?.version || '');
    const installedAt = String(item?.installedAt || '');
    if (!extensionId || !version) continue;

    // keep the latest (by installedAt) if duplicates exist
    const existing = byId.get(extensionId);
    if (!existing) {
      byId.set(extensionId, { extensionId, version, installedAt: installedAt || nowIso() });
      continue;
    }
    const existingTs = Date.parse(existing.installedAt || '') || 0;
    const incomingTs = Date.parse(installedAt || '') || 0;
    if (incomingTs >= existingTs) {
      byId.set(extensionId, { extensionId, version, installedAt: installedAt || nowIso() });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTs = Date.parse(a.installedAt || '') || 0;
    const bTs = Date.parse(b.installedAt || '') || 0;
    return bTs - aTs;
  });
}

function setInstalledWorkflowExtensions(list: InstalledWorkflowExtension[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INSTALLED_KEY, JSON.stringify(normalizeInstalledList(list)));
}

export function getMarketplaceExtensions(): WorkflowExtension[] {
  return MARKETPLACE_EXTENSIONS;
}

export function getInstalledWorkflowExtensions(): InstalledWorkflowExtension[] {
  if (typeof window === 'undefined') return [];
  const raw = safeJsonParse<any>(localStorage.getItem(INSTALLED_KEY), []);
  const normalized = normalizeInstalledList(raw);
  // Self-heal corrupted/duplicate data.
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    setInstalledWorkflowExtensions(normalized);
  }
  return normalized;
}

export function isWorkflowExtensionInstalled(extensionId: string): boolean {
  return getInstalledWorkflowExtensions().some(e => e.extensionId === extensionId);
}

export function installWorkflowExtension(extension: WorkflowExtension): void {
  if (typeof window === 'undefined') return;
  const current = getInstalledWorkflowExtensions();
  const existingIdx = current.findIndex(e => e.extensionId === extension.id);
  const installedAt = nowIso();
  const next: InstalledWorkflowExtension[] =
    existingIdx >= 0
      ? current.map((e, idx) =>
          idx === existingIdx
            ? {
                extensionId: extension.id,
                version: extension.version,
                // keep original installedAt if present
                installedAt: e.installedAt || installedAt,
              }
            : e
        )
      : [...current, { extensionId: extension.id, version: extension.version, installedAt }];

  setInstalledWorkflowExtensions(next);
}

export function uninstallWorkflowExtension(extensionId: string): void {
  if (typeof window === 'undefined') return;
  const current = getInstalledWorkflowExtensions();
  const next = current.filter(e => e.extensionId !== extensionId);
  setInstalledWorkflowExtensions(next);
}

function generateEdgeId(i: number) {
  return `edge-${Date.now()}-${i}`;
}

function maxPosition(rounds: Round[]): { x: number; y: number } {
  const positions = rounds.map(r => r.position).filter(Boolean) as Array<{ x: number; y: number }>;
  if (positions.length === 0) return { x: 100, y: 100 };
  return positions.reduce(
    (acc, p) => ({ x: Math.max(acc.x, p.x), y: Math.max(acc.y, p.y) }),
    { x: positions[0].x, y: positions[0].y }
  );
}

type ApplyResult = { createdRounds: Round[]; createdEdges: RoundEdge[] };

export async function applyWorkflowExtensionToProgram(opts: {
  extension: WorkflowExtension;
  programId: string;
  existingRounds: Round[];
  existingEdges: RoundEdge[];
}): Promise<ApplyResult> {
  const { extension, programId, existingRounds, existingEdges } = opts;

  const template = extension.template;
  const baseOrder = existingRounds.length;
  const anchor = maxPosition(existingRounds);
  const baseOffset = { x: anchor.x + 450, y: 80 };

  // Create rounds first so we can map template IDs -> real IDs.
  const templateToReal = new Map<string, Round>();
  const deferredStartConditions: Array<{ templateRoundId: string; afterTemplateRoundId: string }> = [];

  for (let i = 0; i < template.rounds.length; i++) {
    const tr = template.rounds[i];

    let startCondition: Round['startCondition'];
    if (tr.startCondition.type === 'after_previous') {
      const upstream = templateToReal.get(tr.startCondition.roundId);
      if (upstream) {
        startCondition = { type: 'after_previous', roundId: upstream.id };
      } else {
        // Create now, patch later once we have the referenced round.
        startCondition = { type: 'manual_trigger' };
        deferredStartConditions.push({
          templateRoundId: tr.templateId,
          afterTemplateRoundId: tr.startCondition.roundId,
        });
      }
    } else {
      startCondition = tr.startCondition;
    }

    const endCondition: Round['endCondition'] = tr.endCondition;

    const created = await scheduleRoundsService.createRound({
      programId,
      name: tr.name,
      type: tr.type,
      description: tr.description,
      evaluationLogic: tr.evaluationLogic,
      evaluatorStrategy: tr.evaluatorStrategy,
      blindEvaluation: tr.blindEvaluation,
      startCondition,
      endCondition,
      shortlistConfig: tr.shortlistConfig,
      order: baseOrder + i,
      status: 'draft',
      version: 1,
      metadata: tr.metadata,
      inputPorts: tr.inputPorts,
      outputPorts: tr.outputPorts,
      position: tr.position
        ? { x: tr.position.x + baseOffset.x, y: tr.position.y + baseOffset.y }
        : { x: baseOffset.x + (i % 3) * 360, y: baseOffset.y + Math.floor(i / 3) * 360 },
    });

    templateToReal.set(tr.templateId, created);
  }

  // Patch deferred start conditions (if any).
  for (const item of deferredStartConditions) {
    const round = templateToReal.get(item.templateRoundId);
    const upstream = templateToReal.get(item.afterTemplateRoundId);
    if (!round || !upstream) continue;

    await scheduleRoundsService.updateRound({
      ...round,
      startCondition: { type: 'after_previous', roundId: upstream.id },
      updatedAt: nowIso(),
      version: (round.version || 1) + 1,
    });
  }

  // Create edges in localStorage, remapping template round IDs -> real round IDs.
  const createdEdges: RoundEdge[] = template.edges.map((te, idx) => {
    const source = templateToReal.get(te.sourceTemplateRoundId);
    const target = templateToReal.get(te.targetTemplateRoundId);
    if (!source || !target) {
      throw new Error(`Extension template edge references unknown rounds (${te.templateId}).`);
    }

    return {
      id: generateEdgeId(idx),
      programId,
      sourceRoundId: source.id,
      targetRoundId: target.id,
      sourceHandle: te.sourceHandle,
      targetHandle: te.targetHandle,
      condition: te.condition,
      order: te.order,
      dataStream: te.dataStream,
      name: te.name,
      createdAt: nowIso(),
    };
  });

  const nextEdges = [...existingEdges, ...createdEdges];
  await scheduleRoundsService.saveEdges(programId, nextEdges);

  return { createdRounds: Array.from(templateToReal.values()), createdEdges };
}

function tplRound(base: Partial<RoundTemplate> & Pick<RoundTemplate, 'templateId' | 'name'>): RoundTemplate {
  return {
    templateId: base.templateId,
    name: base.name,
    type: base.type ?? 'jury',
    description: base.description,
    evaluationLogic: base.evaluationLogic ?? 'scoring',
    evaluatorStrategy: base.evaluatorStrategy ?? 'all_judges',
    blindEvaluation: base.blindEvaluation ?? false,
    startCondition: base.startCondition ?? { type: 'manual_trigger' },
    endCondition: base.endCondition ?? { type: 'manual_close' },
    shortlistConfig:
      base.shortlistConfig ?? ({ enabled: false, method: 'percentage', value: 50, visibility: ['admin'] } as any),
    order: base.order ?? 0,
    status: base.status ?? 'draft',
    version: base.version ?? 1,
    metadata: base.metadata,
    inputPorts: base.inputPorts,
    outputPorts: base.outputPorts,
    position: base.position,
  };
}

function tplEdge(
  base: Partial<RoundEdgeTemplate> &
    Pick<RoundEdgeTemplate, 'templateId' | 'sourceTemplateRoundId' | 'targetTemplateRoundId'>
): RoundEdgeTemplate {
  return {
    templateId: base.templateId,
    sourceTemplateRoundId: base.sourceTemplateRoundId,
    targetTemplateRoundId: base.targetTemplateRoundId,
    sourceHandle: base.sourceHandle ?? 'output-0',
    targetHandle: base.targetHandle ?? 'input-0',
    condition: base.condition,
    order: base.order ?? 0,
    dataStream: base.dataStream,
    name: base.name,
  };
}

function templateClassicAwardsPipeline(): WorkflowExtensionTemplate {
  const intake = 'intake';
  const compliance = 'compliance';
  const jury1 = 'jury-1';
  const jury2 = 'jury-2';
  const winners = 'winners';

  return {
    rounds: [
      tplRound({
        templateId: intake,
        name: 'Intake & Deduplication',
        type: 'custom',
        description: 'Normalize submissions, dedupe, and route into review.',
        evaluationLogic: 'voting',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'auto_close', evaluationCount: 1 },
        position: { x: 0, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'To Compliance', dataStreams: ['all'] }],
      }),
      tplRound({
        templateId: compliance,
        name: 'Eligibility & Compliance Gate',
        type: 'compliance',
        description: 'Disqualify non-compliant entries before judging.',
        evaluationLogic: 'voting',
        startCondition: { type: 'after_previous', roundId: intake },
        endCondition: { type: 'manual_close' },
        position: { x: 420, y: 0 },
        outputPorts: [
          { id: 'output-0', name: 'Eligible', dataStreams: ['eligible'] },
          { id: 'output-1', name: 'Ineligible', dataStreams: ['ineligible'] },
        ],
      }),
      tplRound({
        templateId: jury1,
        name: 'Jury Round 1 (Scoring)',
        type: 'jury',
        description: 'Broad scoring to shortlist down.',
        evaluationLogic: 'scoring',
        startCondition: { type: 'after_previous', roundId: compliance },
        endCondition: { type: 'auto_close', evaluationCount: 5 },
        shortlistConfig: { enabled: true, method: 'percentage', value: 30, visibility: ['admin', 'judges'] },
        position: { x: 840, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Shortlisted', dataStreams: ['shortlisted'] }],
      }),
      tplRound({
        templateId: jury2,
        name: 'Jury Round 2 (Consensus)',
        type: 'jury',
        description: 'Deep review with discussion and consensus.',
        evaluationLogic: 'scoring',
        startCondition: { type: 'after_previous', roundId: jury1 },
        endCondition: { type: 'manual_close' },
        position: { x: 1260, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Finalists', dataStreams: ['finalists'] }],
      }),
      tplRound({
        templateId: winners,
        name: 'Winners & Publication',
        type: 'custom',
        description: 'Finalize winners list and publish results.',
        evaluationLogic: 'ranking',
        startCondition: { type: 'after_previous', roundId: jury2 },
        endCondition: { type: 'manual_close' },
        position: { x: 1680, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Published', dataStreams: ['published'] }],
      }),
    ],
    edges: [
      tplEdge({ templateId: 'e1', sourceTemplateRoundId: intake, targetTemplateRoundId: compliance, order: 0, name: 'Route' }),
      tplEdge({
        templateId: 'e2',
        sourceTemplateRoundId: compliance,
        targetTemplateRoundId: jury1,
        order: 0,
        sourceHandle: 'output-0',
        dataStream: 'eligible',
        name: 'Eligible',
      }),
      tplEdge({
        templateId: 'e3',
        sourceTemplateRoundId: jury1,
        targetTemplateRoundId: jury2,
        order: 0,
        dataStream: 'shortlisted',
        name: 'Shortlist',
      }),
      tplEdge({
        templateId: 'e4',
        sourceTemplateRoundId: jury2,
        targetTemplateRoundId: winners,
        order: 0,
        dataStream: 'finalists',
        name: 'Finalize',
      }),
    ],
  };
}

function templatePublicChoiceBoost(): WorkflowExtensionTemplate {
  const prescreen = 'prescreen';
  const publicVote = 'public-vote';
  const juryFinal = 'jury-final';

  return {
    rounds: [
      tplRound({
        templateId: prescreen,
        name: 'Prescreen (Yes/No)',
        type: 'jury',
        description: 'Quick yes/no to filter obviously non-competitive entries.',
        evaluationLogic: 'voting',
        endCondition: { type: 'auto_close', evaluationCount: 3 },
        position: { x: 0, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Approved', dataStreams: ['approved'] }],
      }),
      tplRound({
        templateId: publicVote,
        name: 'Public Choice Voting',
        type: 'public',
        description: 'Let the public vote; feed results into final jury round.',
        evaluationLogic: 'ranking',
        startCondition: { type: 'after_previous', roundId: prescreen },
        endCondition: { type: 'fixed_datetime', datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
        position: { x: 420, y: 180 },
        outputPorts: [{ id: 'output-0', name: 'Top Voted', dataStreams: ['top_voted'] }],
      }),
      tplRound({
        templateId: juryFinal,
        name: 'Jury Final (Weighted)',
        type: 'jury',
        description: 'Combine public vote signal with jury scoring.',
        evaluationLogic: 'scoring',
        startCondition: { type: 'after_previous', roundId: publicVote },
        endCondition: { type: 'manual_close' },
        position: { x: 840, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Winners', dataStreams: ['winners'] }],
      }),
    ],
    edges: [
      tplEdge({
        templateId: 'e1',
        sourceTemplateRoundId: prescreen,
        targetTemplateRoundId: publicVote,
        order: 0,
        dataStream: 'approved',
        name: 'Open to Public',
      }),
      tplEdge({
        templateId: 'e2',
        sourceTemplateRoundId: publicVote,
        targetTemplateRoundId: juryFinal,
        order: 0,
        dataStream: 'top_voted',
        name: 'Vote Signal',
      }),
    ],
  };
}

function templateRapidFireHackathon(): WorkflowExtensionTemplate {
  const qualifier = 'qualifier';
  const semifinals = 'semifinals';
  const finals = 'finals';

  return {
    rounds: [
      tplRound({
        templateId: qualifier,
        name: 'Qualifier (Auto-close)',
        type: 'jury',
        evaluationLogic: 'scoring',
        endCondition: { type: 'auto_close', evaluationCount: 2 },
        description: 'Fast scoring pass to seed the bracket.',
        position: { x: 0, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Seeded', dataStreams: ['seeded'] }],
      }),
      tplRound({
        templateId: semifinals,
        name: 'Semifinals (Shortlist)',
        type: 'jury',
        evaluationLogic: 'ranking',
        startCondition: { type: 'after_previous', roundId: qualifier },
        endCondition: { type: 'manual_close' },
        shortlistConfig: { enabled: true, method: 'fixed_count', value: 10, visibility: ['admin', 'judges'] },
        position: { x: 420, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Finalists', dataStreams: ['finalists'] }],
      }),
      tplRound({
        templateId: finals,
        name: 'Finals (Consensus)',
        type: 'jury',
        evaluationLogic: 'scoring',
        startCondition: { type: 'after_previous', roundId: semifinals },
        endCondition: { type: 'manual_close' },
        description: 'Final discussion + consensus decision.',
        position: { x: 840, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Winners', dataStreams: ['winners'] }],
      }),
    ],
    edges: [
      tplEdge({ templateId: 'e1', sourceTemplateRoundId: qualifier, targetTemplateRoundId: semifinals, order: 0, dataStream: 'seeded' }),
      tplEdge({ templateId: 'e2', sourceTemplateRoundId: semifinals, targetTemplateRoundId: finals, order: 0, dataStream: 'finalists' }),
    ],
  };
}

function templateComplianceFirst(): WorkflowExtensionTemplate {
  const compliance = 'compliance';
  const investigation = 'investigation';
  const jury = 'jury';
  const publish = 'publish';

  return {
    rounds: [
      tplRound({
        templateId: compliance,
        name: 'Compliance Scan',
        type: 'compliance',
        evaluationLogic: 'voting',
        description: 'Automated/assisted compliance scan before any judging.',
        endCondition: { type: 'auto_close', evaluationCount: 1 },
        position: { x: 0, y: 0 },
        outputPorts: [
          { id: 'output-0', name: 'Pass', dataStreams: ['pass'] },
          { id: 'output-1', name: 'Flag', dataStreams: ['flagged'] },
        ],
      }),
      tplRound({
        templateId: investigation,
        name: 'Flag Investigation',
        type: 'custom',
        evaluationLogic: 'voting',
        description: 'Manual review of flagged items.',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'manual_close' },
        position: { x: 420, y: 220 },
        outputPorts: [{ id: 'output-0', name: 'Cleared', dataStreams: ['cleared'] }],
      }),
      tplRound({
        templateId: jury,
        name: 'Jury Review (Rubric)',
        type: 'jury',
        evaluationLogic: 'scoring',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'manual_close' },
        position: { x: 420, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Approved', dataStreams: ['approved'] }],
      }),
      tplRound({
        templateId: publish,
        name: 'Publication Checklist',
        type: 'custom',
        evaluationLogic: 'voting',
        startCondition: { type: 'after_previous', roundId: jury },
        endCondition: { type: 'manual_close' },
        position: { x: 840, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Published', dataStreams: ['published'] }],
      }),
    ],
    edges: [
      tplEdge({
        templateId: 'e1',
        sourceTemplateRoundId: compliance,
        targetTemplateRoundId: jury,
        order: 0,
        sourceHandle: 'output-0',
        dataStream: 'pass',
        name: 'Pass',
      }),
      tplEdge({
        templateId: 'e2',
        sourceTemplateRoundId: compliance,
        targetTemplateRoundId: investigation,
        order: 1,
        sourceHandle: 'output-1',
        dataStream: 'flagged',
        name: 'Flag',
      }),
      tplEdge({
        templateId: 'e3',
        sourceTemplateRoundId: investigation,
        targetTemplateRoundId: jury,
        order: 0,
        dataStream: 'cleared',
        name: 'Cleared',
      }),
      tplEdge({
        templateId: 'e4',
        sourceTemplateRoundId: jury,
        targetTemplateRoundId: publish,
        order: 0,
        dataStream: 'approved',
        name: 'Publish',
      }),
    ],
  };
}

function templateBranchingCategories(): WorkflowExtensionTemplate {
  const intake = 'intake';
  const creative = 'creative';
  const impact = 'impact';
  const final = 'final';

  return {
    rounds: [
      tplRound({
        templateId: intake,
        name: 'Intake Router',
        type: 'custom',
        evaluationLogic: 'scoring',
        description: 'Split entries into different streams for specialized review.',
        position: { x: 0, y: 0 },
        outputPorts: [
          { id: 'output-0', name: 'Creative', dataStreams: ['creative'] },
          { id: 'output-1', name: 'Impact', dataStreams: ['impact'] },
        ],
      }),
      tplRound({
        templateId: creative,
        name: 'Creative Excellence',
        type: 'jury',
        evaluationLogic: 'scoring',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'manual_close' },
        position: { x: 420, y: -120 },
        outputPorts: [{ id: 'output-0', name: 'Creative Finalists', dataStreams: ['creative_finalists'] }],
      }),
      tplRound({
        templateId: impact,
        name: 'Impact & Outcomes',
        type: 'jury',
        evaluationLogic: 'scoring',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'manual_close' },
        position: { x: 420, y: 120 },
        outputPorts: [{ id: 'output-0', name: 'Impact Finalists', dataStreams: ['impact_finalists'] }],
      }),
      tplRound({
        templateId: final,
        name: 'Grand Jury Final',
        type: 'jury',
        evaluationLogic: 'scoring',
        startCondition: { type: 'manual_trigger' },
        endCondition: { type: 'manual_close' },
        position: { x: 840, y: 0 },
        outputPorts: [{ id: 'output-0', name: 'Winners', dataStreams: ['winners'] }],
      }),
    ],
    edges: [
      tplEdge({
        templateId: 'e1',
        sourceTemplateRoundId: intake,
        targetTemplateRoundId: creative,
        order: 0,
        sourceHandle: 'output-0',
        dataStream: 'creative',
        name: 'Creative Stream',
      }),
      tplEdge({
        templateId: 'e2',
        sourceTemplateRoundId: intake,
        targetTemplateRoundId: impact,
        order: 1,
        sourceHandle: 'output-1',
        dataStream: 'impact',
        name: 'Impact Stream',
      }),
      tplEdge({
        templateId: 'e3',
        sourceTemplateRoundId: creative,
        targetTemplateRoundId: final,
        order: 0,
        dataStream: 'creative_finalists',
        name: 'Creative Finalists',
      }),
      tplEdge({
        templateId: 'e4',
        sourceTemplateRoundId: impact,
        targetTemplateRoundId: final,
        order: 1,
        dataStream: 'impact_finalists',
        name: 'Impact Finalists',
      }),
    ],
  };
}

const MARKETPLACE_EXTENSIONS: WorkflowExtension[] = [
  {
    id: 'awardx.classic-awards-pipeline',
    name: 'Classic Awards Pipeline',
    description: 'A clean 5-step awards flow: Intake → Compliance → Scoring → Consensus → Publish.',
    author: 'AwardX Labs',
    version: '1.0.0',
    tags: ['Featured', 'Awards', 'Jury', 'Shortlist'],
    difficulty: 'Beginner',
    featured: true,
    estimatedSetupMinutes: 5,
    template: templateClassicAwardsPipeline(),
  },
  {
    id: 'awardx.public-choice-boost',
    name: 'Public Choice Boost',
    description: 'Blend public voting with a final weighted jury decision.',
    author: 'AwardX Labs',
    version: '1.0.0',
    tags: ['Public', 'Voting', 'Hybrid'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 8,
    template: templatePublicChoiceBoost(),
  },
  {
    id: 'awardx.rapid-fire-hackathon',
    name: 'Rapid-Fire Hackathon',
    description: 'Fast qualifier → semifinals shortlist → consensus finals. Great for time-boxed events.',
    author: 'AwardX Labs',
    version: '1.0.0',
    tags: ['Hackathon', 'Speed', 'Shortlist'],
    difficulty: 'Beginner',
    estimatedSetupMinutes: 6,
    template: templateRapidFireHackathon(),
  },
  {
    id: 'awardx.compliance-first',
    name: 'Compliance First',
    description: 'Put compliance up front with a flagged investigation branch before judging.',
    author: 'AwardX Labs',
    version: '1.0.0',
    tags: ['Compliance', 'Risk', 'Branching'],
    difficulty: 'Intermediate',
    estimatedSetupMinutes: 10,
    template: templateComplianceFirst(),
  },
  {
    id: 'awardx.branching-categories',
    name: 'Branching Categories',
    description: 'Split entries into specialized judging streams (Creative vs Impact) and reunify for a grand final.',
    author: 'AwardX Labs',
    version: '1.0.0',
    tags: ['Branching', 'Streams', 'Advanced'],
    difficulty: 'Advanced',
    estimatedSetupMinutes: 12,
    template: templateBranchingCategories(),
  },
];

