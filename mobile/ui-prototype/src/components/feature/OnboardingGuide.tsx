import { useState, useEffect } from 'react';

interface OnboardingStep {
  id: number;
  title: string;
  desc: string;
  icon: string;
  highlight?: string;
  position: 'center' | 'bottom' | 'top';
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: '欢迎使用脊柱影像分析系统',
    desc: '专为脊柱科医生设计的智能影像分析平台，让我们快速了解核心功能。',
    icon: 'ri-hospital-line',
    position: 'center',
  },
  {
    id: 2,
    title: '工作台 — 掌握全局',
    desc: '在这里查看今日数据概览、待处理任务和近期动态，快速了解工作进展。',
    icon: 'ri-dashboard-line',
    highlight: 'tab-dashboard',
    position: 'bottom',
  },
  {
    id: 3,
    title: '患者中心 — 管理患者',
    desc: '查看所有患者信息、历史影像记录，支持快速搜索和筛选。',
    icon: 'ri-user-heart-line',
    highlight: 'tab-patients',
    position: 'bottom',
  },
  {
    id: 4,
    title: '影像中心 — 上传与分析',
    desc: '上传 X 光片，按类型和状态筛选，点击「标注分析」进入智能标注工作台。',
    icon: 'ri-image-line',
    highlight: 'tab-images',
    position: 'bottom',
  },
  {
    id: 5,
    title: '待处理任务 — 快速响应',
    desc: '工作台中的待处理任务按优先级排序，点击右侧箭头可直接进入标注页面。',
    icon: 'ri-task-line',
    highlight: 'pending-tasks',
    position: 'top',
  },
  {
    id: 6,
    title: '一切就绪！',
    desc: '您已了解系统的核心功能。如需帮助，可随时在个人中心查看使用指南。',
    icon: 'ri-check-double-line',
    position: 'center',
  },
];

const ONBOARDING_KEY = 'spine_onboarding_done';

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const current = steps[step];

  const goNext = () => {
    if (step < steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep(s => s + 1);
        setAnimating(false);
      }, 200);
    } else {
      finish();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setAnimating(true);
      setTimeout(() => {
        setStep(s => s - 1);
        setAnimating(false);
      }, 200);
    }
  };

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const cardPositionClass =
    current.position === 'bottom'
      ? 'bottom-24 left-4 right-4'
      : current.position === 'top'
      ? 'top-48 left-4 right-4'
      : 'top-1/2 left-4 right-4 -translate-y-1/2';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={finish} />

      {/* 引导卡片 */}
      <div
        className={`absolute ${cardPositionClass} transition-all duration-200 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={current.position === 'center' ? { transform: 'translateY(-50%)' } : {}}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* 顶部进度条 */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* 图标 */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-400/30">
              <i className={`${current.icon} text-white text-2xl`}></i>
            </div>

            {/* 步骤指示 */}
            <div className="flex items-center gap-1.5 mb-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 bg-violet-500'
                      : i < step
                      ? 'w-3 bg-violet-300'
                      : 'w-3 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* 文字内容 */}
            <h3 className="text-lg font-bold text-slate-800 mb-2 leading-snug">{current.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{current.desc}</p>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={finish}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1"
              >
                跳过引导
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={goPrev}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <i className="ri-arrow-left-line text-base"></i>
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="px-5 h-10 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-md shadow-violet-400/30 hover:shadow-lg transition-all active:scale-95"
                >
                  <span>{isLast ? '开始使用' : '下一步'}</span>
                  <i className={`${isLast ? 'ri-rocket-line' : 'ri-arrow-right-line'} text-sm`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 小箭头指示（底部位置时向下指向 tabbar） */}
        {current.position === 'bottom' && (
          <div className="flex justify-center mt-2">
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <div className="w-0.5 h-4 bg-white/60 rounded-full"></div>
              <i className="ri-arrow-down-line text-white/80 text-lg"></i>
            </div>
          </div>
        )}
        {current.position === 'top' && (
          <div className="flex justify-center -mt-1 mb-2 order-first">
            <div className="flex flex-col-reverse items-center gap-1 animate-bounce">
              <div className="w-0.5 h-4 bg-white/60 rounded-full"></div>
              <i className="ri-arrow-up-line text-white/80 text-lg"></i>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
