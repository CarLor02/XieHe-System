
import { useState } from 'react';
import { annotationData, annotationHistory } from '../../../mocks/annotations';

interface AnnotationReportProps {
  onClose: () => void;
}

export default function AnnotationReport({ onClose }: AnnotationReportProps) {
  const [activeSection, setActiveSection] = useState<'summary' | 'history'>('summary');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
              <i className="ri-file-chart-line text-white text-lg"></i>
            </div>
            <div>
              <h2 className="text-gray-800 font-semibold">标注报告</h2>
              <p className="text-gray-400 text-xs">患者: {annotationData.patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
            <i className="ri-close-line text-gray-500"></i>
          </button>
        </div>

        {/* 标签切换 */}
        <div className="px-4 py-3 flex gap-2 border-b border-gray-100">
          <button 
            onClick={() => setActiveSection('summary')}
            className={`px-4 py-2 rounded-full text-sm ${activeSection === 'summary' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            测量汇总
          </button>
          <button 
            onClick={() => setActiveSection('history')}
            className={`px-4 py-2 rounded-full text-sm ${activeSection === 'history' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            操作历史
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeSection === 'summary' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4">
                <h3 className="text-gray-700 font-medium text-sm mb-3 flex items-center gap-2">
                  <i className="ri-information-line text-violet-500"></i>
                  基本信息
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-gray-400 text-xs">影像ID</p><p className="text-gray-700 text-sm font-medium">{annotationData.imageId}</p></div>
                  <div><p className="text-gray-400 text-xs">检查类型</p><p className="text-gray-700 text-sm font-medium">{annotationData.checkType}</p></div>
                  <div><p className="text-gray-400 text-xs">患者ID</p><p className="text-gray-700 text-sm font-medium">{annotationData.patientId}</p></div>
                  <div><p className="text-gray-400 text-xs">文件名</p><p className="text-gray-700 text-sm font-medium truncate">{annotationData.fileName}</p></div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-gray-700 font-medium text-sm mb-3 flex items-center gap-2">
                  <i className="ri-ruler-line text-emerald-500"></i>
                  测量结果
                </h3>
                <div className="space-y-2">
                  {annotationData.measurements.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600 text-sm">{item.type}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
                <h3 className="text-gray-700 font-medium text-sm mb-3 flex items-center gap-2">
                  <i className="ri-lightbulb-line text-amber-500"></i>
                  AI诊断建议
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-fill text-emerald-500 mt-0.5"></i>
                    <p className="text-gray-600 text-sm">脊柱侧弯角度在正常范围内，建议定期复查</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-fill text-emerald-500 mt-0.5"></i>
                    <p className="text-gray-600 text-sm">骨盆倾斜度轻微，可通过物理治疗改善</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="ri-information-fill text-violet-500 mt-0.5"></i>
                    <p className="text-gray-600 text-sm">建议3个月后复查，观察变化趋势</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-3">
              {annotationHistory.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.operator === 'AI辅助' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'}`}>
                        <i className={`${item.operator === 'AI辅助' ? 'ri-robot-line' : 'ri-user-line'} text-white text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-gray-700 text-sm font-medium">{item.operator}</p>
                        <p className="text-gray-400 text-xs">{item.time}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-sm mb-1">{item.action}</p>
                    <p className="text-violet-500 text-xs font-medium">{item.result}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
          <button className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 text-sm font-medium flex items-center justify-center gap-2">
            <i className="ri-download-line"></i>
            导出PDF
          </button>
          <button className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2">
            <i className="ri-share-line"></i>
            分享报告
          </button>
        </div>
      </div>
    </div>
  );
}
