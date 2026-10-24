export const genderOptions = ['男', '女', '未知'].map(value => ({
  value,
  label: value,
}));

export const genderFilterOptions = [
  { value: '', label: '全部性别' },
  ...genderOptions,
];
