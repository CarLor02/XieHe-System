import { getAnnotationTypeId } from '../../../shared-rules';
import {
  buildCobbEndpointPointIds,
  buildResolvedCobbMeasurement,
  normalizeCobbVertebra,
} from '../../../shared-rules';
import type { CobbResolver } from '../../../shared-rules';
import { invalid, resolved } from '../../../shared-rules';
import { isApProjectionExamType } from '@xiehe/imaging-core/anatomy';

const AP_COBB_TYPE_PATTERN =
  /^cobb(?:\d+|-thoracic|-lumbar|-thoracolumbar|-auto\d+)?$/;
const AP_COBB_RESOLVER_ID = 'ap-cobb';

function matchesApCobb(
  measurement: Parameters<CobbResolver['matchesDescriptor']>[0],
  context: Parameters<CobbResolver['matchesDescriptor']>[1]
): boolean {
  return (
    isApProjectionExamType(context.examType) &&
    AP_COBB_TYPE_PATTERN.test(getAnnotationTypeId(measurement.type))
  );
}

function resolveApEndpointPointIds(
  measurement: Parameters<CobbResolver['resolveEndpointPointIds']>[0]
) {
  return buildCobbEndpointPointIds(
    normalizeCobbVertebra(measurement.upperVertebra),
    normalizeCobbVertebra(measurement.lowerVertebra)
  );
}

/** 正位和左右曲位共享 AP 终板点序；检查类型优先于历史 type 文本。 */
export const AP_COBB_RESOLVER: CobbResolver = {
  id: AP_COBB_RESOLVER_ID,
  matchesDescriptor: matchesApCobb,
  supports: matchesApCobb,
  resolveEndpointPointIds: resolveApEndpointPointIds,
  resolve(measurement) {
    const upperVertebra = normalizeCobbVertebra(measurement.upperVertebra);
    const lowerVertebra = normalizeCobbVertebra(measurement.lowerVertebra);
    const value = buildResolvedCobbMeasurement({
      resolverId: AP_COBB_RESOLVER_ID,
      measurement,
      examView: 'ap',
      layout: 'ap-generic',
      endpointPointIds: resolveApEndpointPointIds(measurement),
      displayName: measurement.type,
      upperVertebra,
      lowerVertebra,
    });
    return value
      ? resolved(value)
      : invalid('AP Cobb 必须包含四个有效点，且上下端椎不能相同');
  },
};
