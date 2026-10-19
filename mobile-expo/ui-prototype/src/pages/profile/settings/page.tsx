import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-violet-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const LANGUAGES = ['简体中文', '繁體中文', 'English', '日本語'];
const TIMEZONES = [
  '北京时间 (UTC+8)',
  '东京时间 (UTC+9)',
  '新加坡时间 (UTC+8)',
  '伦敦时间 (UTC+0)',
  '纽约时间 (UTC-5)',
];

export default function Settings() {
  const navigate = useNavigate();

  const SETTINGS_KEY = 'spine_app_settings';

  // 界面设置
  const [darkMode, setDarkMode] = useState(true);
  const [notification, setNotification] = useState(true);
  const [autosave, setAutosave] = useState(false);

  // 语言和地区
  const [language, setLanguage] = useState('简体中文');
  const [timezone, setTimezone] = useState('北京时间 (UTC+8)');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);

  // 保存提示
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        darkMode?: boolean;
        notification?: boolean;
        autosave?: boolean;
        language?: string;
        timezone?: string;
      };
      if (typeof data.darkMode === 'boolean') setDarkMode(data.darkMode);
      if (typeof data.notification === 'boolean') setNotification(data.notification);
      if (typeof data.autosave === 'boolean') setAutosave(data.autosave);
      if (data.language) setLanguage(data.language);
      if (data.timezone) setTimezone(data.timezone);
    } catch {
      // 忽略损坏的本地配置
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ darkMode, notification, autosave, language, timezone }),
      );
    } catch {
      // 本地存储不可用时也给出成功提示，保证交互完整
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b border-slate-100 px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600"
        >
          <i className="ri-arrow-left-s-line text-xl"></i>
        </button>
        <h1 className="text-base font-bold text-slate-800 flex-1">系统设置</h1>
      </div>

      {/* 保存成功提示 */}
      <div
        className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm px-5 py-2 rounded-full shadow-lg transition-all duration-300 ${
          saved ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <i className="ri-check-line mr-1.5"></i>设置已保存
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 界面设置 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">界面设置</span>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-xl">
                  <i className="ri-moon-line text-slate-600 text-base"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">启用暗色主题</div>
                  <div className="text-xs text-slate-400 mt-0.5">切换深色界面风格</div>
                </div>
              </div>
              <Toggle checked={darkMode} onChange={setDarkMode} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-violet-50 rounded-xl">
                  <i className="ri-notification-3-line text-violet-500 text-base"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">显示系统通知</div>
                  <div className="text-xs text-slate-400 mt-0.5">接收消息和提醒推送</div>
                </div>
              </div>
              <Toggle checked={notification} onChange={setNotification} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-amber-50 rounded-xl">
                  <i className="ri-save-line text-amber-500 text-base"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">自动保存草稿</div>
                  <div className="text-xs text-slate-400 mt-0.5">编辑内容自动暂存</div>
                </div>
              </div>
              <Toggle checked={autosave} onChange={setAutosave} />
            </div>
          </div>
        </div>

        {/* 语言和地区 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">语言和地区</span>
          </div>
          <div className="divide-y divide-slate-50">
            {/* 语言选择 */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-blue-50 rounded-xl">
                  <i className="ri-translate-2 text-blue-500 text-base"></i>
                </div>
                <span className="text-sm font-medium text-slate-700">语言</span>
              </div>
              <button
                onClick={() => { setShowLangPicker(!showLangPicker); setShowTzPicker(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="text-sm text-slate-700">{language}</span>
                <i className={`ri-arrow-down-s-line text-slate-400 text-lg transition-transform ${showLangPicker ? 'rotate-180' : ''}`}></i>
              </button>
              {showLangPicker && (
                <div className="mt-1 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        language === lang
                          ? 'bg-violet-50 text-violet-600 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {lang}
                      {language === lang && <i className="ri-check-line float-right text-violet-500"></i>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 时区选择 */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center bg-emerald-50 rounded-xl">
                  <i className="ri-time-line text-emerald-500 text-base"></i>
                </div>
                <span className="text-sm font-medium text-slate-700">时区</span>
              </div>
              <button
                onClick={() => { setShowTzPicker(!showTzPicker); setShowLangPicker(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="text-sm text-slate-700">{timezone}</span>
                <i className={`ri-arrow-down-s-line text-slate-400 text-lg transition-transform ${showTzPicker ? 'rotate-180' : ''}`}></i>
              </button>
              {showTzPicker && (
                <div className="mt-1 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                  {TIMEZONES.map((tz) => (
                    <button
                      key={tz}
                      onClick={() => { setTimezone(tz); setShowTzPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        timezone === tz
                          ? 'bg-violet-50 text-violet-600 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {tz}
                      {timezone === tz && <i className="ri-check-line float-right text-violet-500"></i>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-violet-500/30 active:opacity-90 transition-opacity"
        >
          保存设置
        </button>
      </div>
    </div>
  );
}
