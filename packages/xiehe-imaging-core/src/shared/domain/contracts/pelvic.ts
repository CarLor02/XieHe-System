export type FemoralHeadMode = 'single' | 'bilateral';
export type PelvicToolId = 'pi' | 'pt' | 'tpa';

/** PI/PT/TPA v2 持久化元数据，旧数据缺失时由读取边界兼容。 */
export interface PelvicMeasurementMetadata {
  schemaVersion: 2;
  femoralHeadMode: FemoralHeadMode;
}
