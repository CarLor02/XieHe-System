import { expect, it } from '@jest/globals';

import { getToolCompletionDerivationRules } from './tool-completion-derivation';

function typeIds(completedToolType: string, examType: string): string[] {
  return getToolCompletionDerivationRules(completedToolType, examType)
    .map(rule => rule.typeId)
    .sort();
}

it('derives PT and SS from the complete PI dependency set', () => {
  expect(typeIds('pi', '侧位X光片')).toEqual(['pt', 'ss']);
  expect(typeIds('pt', '侧位X光片')).toEqual(['pi', 'ss']);
});

it('does not derive PI or PT from the smaller SS dependency set', () => {
  expect(typeIds('ss', '侧位X光片')).toEqual([]);
});

it('derives only measurements whose dependencies stay inside the completed tool', () => {
  expect(typeIds('tpa', '侧位X光片')).toEqual(['pi', 'pt', 'ss', 't1-slope']);
  expect(typeIds('ts', '正位X光片')).toEqual(['css']);
});

it('does not apply a tool binding rule to another exam view', () => {
  expect(typeIds('pi', '正位X光片')).toEqual([]);
});
