import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsData } from '../../mocks/patients';
import EmptyState from '@/components/base/EmptyState';
import PageHeader from '@/components/feature/PageHeader';
import SearchBar from '@/components/base/SearchBar';
import FilterSheet from '@/components/feature/FilterSheet';
import BottomTabBar from '@/components/feature/BottomTabBar';

export default function Patients() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [genderFilter, setGenderFilter] = useState('全部');
  const [showGenderFilter, setShowGenderFilter] = useState(false);

  const filteredPatients = patientsData.filter(patient => {
    const matchSearch = patient.name.includes(searchText) || 
                       patient.id.includes(searchText) || 
                       patient.phone.includes(searchText);
    const matchGender = genderFilter === '全部' || patient.gender === genderFilter;
    return matchSearch && matchGender;
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <PageHeader
        title="患者中心"
        subtitle={`${filteredPatients.length} 位患者`}
        right={
          <button 
            onClick={() => navigate('/patients/add')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
          >
            <i className="ri-add-line text-xl"></i>
          </button>
        }
      >
        <SearchBar value={searchText} onChange={setSearchText} placeholder="搜索患者姓名、ID或手机号" />
      </PageHeader>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowGenderFilter(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
              genderFilter !== '全部' 
                ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30' 
                : 'bg-white text-slate-600 shadow-sm border border-slate-100'
            }`}
          >
            <i className="ri-filter-3-line text-sm"></i>
            <span>性别: {genderFilter}</span>
          </button>
        </div>

        {filteredPatients.length === 0 ? (
          <EmptyState
            icon="ri-user-search-line"
            title="未找到匹配的患者"
            description="试试调整搜索关键词或筛选条件"
            actionText="清除筛选"
            actionIcon="ri-filter-off-line"
            onAction={() => { setSearchText(''); setGenderFilter('全部'); }}
          />
        ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="bg-white rounded-xl px-3.5 py-3 shadow-sm shadow-slate-200/60 border border-slate-100 flex items-center gap-3"
            >
              {/* 左侧信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-sm font-bold text-slate-800 leading-none">{patient.name}</h3>
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full leading-none ${
                    patient.gender === '男' ? 'bg-violet-50 text-violet-600' : 'bg-pink-50 text-pink-600'
                  }`}>
                    {patient.gender}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{patient.age}岁</span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <i className="ri-phone-line text-slate-400 text-[11px]"></i>
                    {patient.phone}
                  </span>
                </div>
              </div>

              {/* 右侧操作按钮 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => navigate(`/patients/edit/${patient.id}`)}
                  className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors"
                >
                  <i className="ri-edit-line text-sm"></i>
                </button>
                <button
                  onClick={() => navigate(`/patients/detail/${patient.id}`)}
                  className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 text-white rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/30 hover:shadow-md transition-all"
                >
                  <i className="ri-eye-line text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 性别筛选弹窗 */}
      <FilterSheet
        open={showGenderFilter}
        title="选择性别"
        options={['全部', '男', '女']}
        value={genderFilter}
        onSelect={setGenderFilter}
        onClose={() => setShowGenderFilter(false)}
      />

      {/* 底部导航栏 */}
      <BottomTabBar />
    </div>
  );
}
