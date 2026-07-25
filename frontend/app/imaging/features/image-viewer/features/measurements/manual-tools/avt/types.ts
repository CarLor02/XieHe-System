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

export interface AvtMetadata {
  schemaVersion: 2;
  target: AvtTarget;
  referenceLine: AvtReferenceLine;
}

export interface AvtDiscPlacementSession {
  target: Extract<AvtTarget, { type: 'disc' }>;
}

export type AvtPointLayout =
  | 'vertebra-csvl'
  | 'vertebra-c7pl'
  | 'disc-csvl'
  | 'disc-c7pl'
  | 'legacy-two-point'
  | 'legacy-six-point';
