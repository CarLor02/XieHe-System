export type AvtReferenceLine = 'c7pl' | 'csvl';

export type AvtTarget =
  | {
      type: 'vertebra';
      vertebra: string;
    }
  | {
      type: 'disc';
      upperVertebra: string;
      lowerVertebra: string;
    };

/** AVT v2 持久化元数据，区分椎体/椎间盘目标及参考线。 */
export interface AvtMetadata {
  schemaVersion: 2;
  target: AvtTarget;
  referenceLine: AvtReferenceLine;
}

export type AvtPlacementStep =
  | {
      kind: 'keypoint';
      phase: 'reference' | 'target';
      label: string;
      keypointId: string;
      completedCount: number;
      totalCount: number;
    }
  | {
      kind: 'disc';
      label: string;
    };

export interface AvtPlacementSession {
  target: AvtTarget;
  step: AvtPlacementStep;
}

export type AvtPointLayout =
  | 'vertebra-csvl'
  | 'vertebra-c7pl'
  | 'disc-csvl'
  | 'disc-c7pl'
  | 'legacy-two-point'
  | 'legacy-six-point';
