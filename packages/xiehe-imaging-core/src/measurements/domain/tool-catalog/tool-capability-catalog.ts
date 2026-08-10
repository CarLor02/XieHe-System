import {
  isAnteriorExamType,
  isBendingExamType,
  isLateralExamType,
} from '../../../shared/domain/anatomy';
import type {
  ToolAnnotationCategory,
  ToolCapability,
  ToolExamKind,
  ToolToolbarSection,
} from './tool-capability';

const AP_ONLY = ['ap'] as const;
const LATERAL_ONLY = ['lateral'] as const;
const AP_AND_BENDING = ['ap', 'bending'] as const;
const GENERIC_ONLY = ['generic'] as const;
const ALL_EXAMS = ['ap', 'lateral', 'bending', 'generic'] as const;

function fixedTool(
  id: string,
  pointsNeeded: number,
  annotationCategory: ToolAnnotationCategory,
  toolbarSection: ToolToolbarSection,
  supportedExamKinds: readonly ToolExamKind[],
  interactionKind: ToolToolbarSection = toolbarSection
): ToolCapability {
  return {
    id,
    pointsNeeded,
    annotationCategory,
    toolbarSection,
    interactionKind,
    supportedExamKinds,
    pointCollection: 'fixed',
  };
}

function dynamicTool(
  id: string,
  annotationCategory: ToolAnnotationCategory,
  toolbarSection: ToolToolbarSection,
  supportedExamKinds: readonly ToolExamKind[],
  interactionKind: ToolToolbarSection = toolbarSection
): ToolCapability {
  return {
    id,
    pointsNeeded: 0,
    annotationCategory,
    toolbarSection,
    interactionKind,
    supportedExamKinds,
    pointCollection: 'dynamic',
  };
}

export const AP_MEASUREMENT_TOOL_IDS = [
  't1-tilt',
  'cobb',
  'ca',
  'po',
  'css',
  'avt',
  'tts',
  'lld',
  'hemipelvic-width-ratio',
  'ts',
] as const;

export const LATERAL_MEASUREMENT_TOOL_IDS = [
  't1-slope',
  'tk-t2-t5',
  'tk-t5-t12',
  't10-l2',
  'll-l1-s1',
  'll-l1-l4',
  'll-l4-s1',
  'tpa',
  'sva',
  'pi',
  'pt',
  'ss',
  'cl',
  'lateral-cobb',
] as const;

export const AUXILIARY_TOOL_IDS = [
  'circle',
  'ellipse',
  'rectangle',
  'arrow',
  'polygon',
  'aux-length',
  'aux-angle',
  'aux-horizontal-line',
  'aux-vertical-line',
] as const;

export const GENERIC_MEASUREMENT_TOOL_IDS = [
  'length',
  'angle',
  'vertebra-center',
] as const;

const capabilities = [
  fixedTool('t1-tilt', 2, 'measurement', 'measurement', AP_ONLY),
  fixedTool('cobb', 4, 'measurement', 'measurement', AP_AND_BENDING),
  fixedTool('ca', 2, 'measurement', 'measurement', AP_ONLY),
  fixedTool('po', 2, 'measurement', 'measurement', AP_ONLY),
  fixedTool('css', 2, 'measurement', 'measurement', AP_ONLY),
  fixedTool('avt', 6, 'measurement', 'measurement', AP_ONLY),
  fixedTool('tts', 4, 'measurement', 'measurement', AP_ONLY),
  fixedTool('lld', 2, 'measurement', 'measurement', AP_ONLY),
  fixedTool('hemipelvic-width-ratio', 4, 'measurement', 'measurement', AP_ONLY),
  fixedTool('ts', 6, 'measurement', 'measurement', AP_ONLY),
  fixedTool('t1-slope', 2, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('tk-t2-t5', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('tk-t5-t12', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('t10-l2', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('ll-l1-s1', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('ll-l1-l4', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('ll-l4-s1', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('tpa', 7, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('sva', 5, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('pi', 3, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('pt', 3, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('ss', 2, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('cl', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('lateral-cobb', 4, 'measurement', 'measurement', LATERAL_ONLY),
  fixedTool('length', 2, 'measurement', 'measurement', GENERIC_ONLY),
  fixedTool('angle', 3, 'measurement', 'measurement', GENERIC_ONLY),
  fixedTool(
    'vertebra-center',
    4,
    'auxiliary',
    'measurement',
    GENERIC_ONLY,
    'auxiliary'
  ),
  dynamicTool('circle', 'auxiliary', 'auxiliary', ALL_EXAMS),
  dynamicTool('ellipse', 'auxiliary', 'auxiliary', ALL_EXAMS),
  dynamicTool('rectangle', 'auxiliary', 'auxiliary', ALL_EXAMS),
  dynamicTool('arrow', 'auxiliary', 'auxiliary', ALL_EXAMS),
  dynamicTool('polygon', 'auxiliary', 'auxiliary', ALL_EXAMS),
  fixedTool('aux-length', 2, 'auxiliary', 'auxiliary', ALL_EXAMS),
  fixedTool('aux-angle', 4, 'measurement', 'auxiliary', ALL_EXAMS),
  fixedTool('aux-horizontal-line', 2, 'auxiliary', 'auxiliary', ALL_EXAMS),
  fixedTool('aux-vertical-line', 2, 'auxiliary', 'auxiliary', ALL_EXAMS),
] as const;

export const TOOL_CAPABILITIES: ReadonlyMap<string, ToolCapability> = new Map(
  capabilities.map(capability => [capability.id, capability])
);

export function getToolCapability(toolId: string): ToolCapability | undefined {
  return TOOL_CAPABILITIES.get(toolId);
}

export function getExamKind(examType: string): ToolExamKind {
  if (isAnteriorExamType(examType)) return 'ap';
  if (isLateralExamType(examType)) return 'lateral';
  if (isBendingExamType(examType)) return 'bending';
  return 'generic';
}

export function getToolIdsForExamType(examType: string): string[] {
  const kind = getExamKind(examType);
  const measurementIds =
    kind === 'ap'
      ? AP_MEASUREMENT_TOOL_IDS
      : kind === 'lateral'
        ? LATERAL_MEASUREMENT_TOOL_IDS
        : kind === 'bending'
          ? (['cobb'] as const)
          : GENERIC_MEASUREMENT_TOOL_IDS;
  return [...measurementIds, ...AUXILIARY_TOOL_IDS];
}

export function getToolCapabilitiesForExamType(
  examType: string
): ToolCapability[] {
  return getToolIdsForExamType(examType).flatMap(toolId => {
    const capability = getToolCapability(toolId);
    return capability ? [capability] : [];
  });
}

export function isAuxiliaryToolbarTool(toolId: string): boolean {
  return getToolCapability(toolId)?.toolbarSection === 'auxiliary';
}

export function isAuxiliaryAnnotationTool(toolId: string): boolean {
  return getToolCapability(toolId)?.annotationCategory === 'auxiliary';
}

export function isAuxiliaryInteractionTool(toolId: string): boolean {
  return getToolCapability(toolId)?.interactionKind === 'auxiliary';
}
