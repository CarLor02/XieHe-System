import { readFileSync } from 'fs';
import { join } from 'path';
import { expect, it } from '@jest/globals';

const responsivePageFiles = [
  'app/dashboard/page.tsx',
  'app/imaging/features/image-list/components/ImageGrid.tsx',
  'app/imaging/features/search-filters/components/ImagingSearchFilters.tsx',
  'app/upload/page.tsx',
  'app/patients/add/page.tsx',
  'app/patients/edit/EditPatient.tsx',
  'app/patients/detail/PatientDetail.tsx',
  'app/model-center/page.tsx',
  'app/permissions/ModelPermissions.tsx',
  'app/permissions/DataPermissions.tsx',
  'app/reports/export/page.tsx',
  'app/reports/review/page.tsx',
  'app/reports/analytics/page.tsx',
  'app/admin/errors/page.tsx',
  'app/sync/page.tsx',
];

it('uses responsive grid classes on primary business pages', () => {
  for (const relativePath of responsivePageFiles) {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8');

    expect(source).not.toMatch(/grid grid-cols-(2|3|4)\b/);
  }
});
