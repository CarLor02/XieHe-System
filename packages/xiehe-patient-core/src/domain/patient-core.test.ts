import { describe, expect, it } from 'vitest';

import {
  createPatientQuery,
  extractBirthDateFromIdCard,
  getPatientSearchDisplay,
  validateIdCard,
} from '../index';

describe('patient core', () => {
  it('validates and extracts a Chinese ID card', () => {
    expect(validateIdCard('11010519491231002X')).toBe(true);
    expect(extractBirthDateFromIdCard('11010519491231002X')).toBe('1949-12-31');
  });

  it('builds patient filters and search display', () => {
    expect(
      createPatientQuery({
        page: 1,
        pageSize: 10,
        searchTerm: ' 张三 ',
        gender: '',
        ageRange: '20-40',
        status: '',
        hasImages: 'true',
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
    ).toMatchObject({
      search: '张三',
      age_min: 20,
      age_max: 40,
      has_images: true,
    });
    expect(
      getPatientSearchDisplay({ name: '张三', phone: null }).secondary
    ).toBe('手机号：未提供');
  });
});
