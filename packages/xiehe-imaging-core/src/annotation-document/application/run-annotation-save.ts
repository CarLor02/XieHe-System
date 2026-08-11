import type { AnnotationSavePlan } from './prepare-annotation-save';
import { prepareAnnotationSave } from './prepare-annotation-save';

export interface AnnotationSavePort<TImageId, TResult> {
  save(input: {
    imageId: TImageId;
    expectedVersion: number;
    annotation: AnnotationSavePlan['document'];
  }): Promise<TResult>;
}

/** 端口驱动的保存应用用例；本地浏览器存储不属于保存事实源。 */
export async function runAnnotationSave<TImageId, TResult>(input: {
  imageId: TImageId;
  expectedVersion: number;
  snapshot: Parameters<typeof prepareAnnotationSave>[0];
  port: AnnotationSavePort<TImageId, TResult>;
}): Promise<{ plan: AnnotationSavePlan; result: TResult }> {
  const plan = prepareAnnotationSave(input.snapshot);
  const result = await input.port.save({
    imageId: input.imageId,
    expectedVersion: input.expectedVersion,
    annotation: plan.document,
  });
  return { plan, result };
}
