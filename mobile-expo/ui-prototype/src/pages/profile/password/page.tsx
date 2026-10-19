import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Step = 'verify' | 'reset' | 'done';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('verify');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-400' };
    if (score === 2) return { level: 2, label: '中', color: 'bg-amber-400' };
    if (score === 3) return { level: 3, label: '强', color: 'bg-emerald-400' };
    return { level: 4, label: '非常强', color: 'bg-emerald-500' };
  };

  const strength = getStrength(newPassword);

  const handleVerify = () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = '请输入当前密码';
    else if (currentPassword.length < 6) errs.currentPassword = '密码长度不正确';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep('reset');
  };

  const handleReset = () => {
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = '请输入新密码';
    else if (newPassword.length < 8) errs.newPassword = '密码至少8位';
    if (!confirmPassword) errs.confirmPassword = '请再次输入新密码';
    else if (newPassword !== confirmPassword) errs.confirmPassword = '两次密码不一致';
    if (newPassword && currentPassword && newPassword === currentPassword) {
      errs.newPassword = '新密码不能与当前密码相同';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep('done');
    showMessage('密码修改成功');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">修改密码</h1>
            <p className="text-violet-100 text-xs mt-0.5">定期更换密码保障账号安全</p>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 步骤指示器 */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === 'verify' ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-300/40' :
                step === 'reset' || step === 'done' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {step === 'reset' || step === 'done' ? <i className="ri-check-line text-sm"></i> : '1'}
              </div>
              <span className={`text-[10px] font-medium ${step === 'verify' ? 'text-violet-600' : 'text-slate-400'}`}>验证身份</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step === 'reset' || step === 'done' ? 'bg-emerald-400' : 'bg-slate-100'}`}></div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === 'reset' ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-300/40' :
                step === 'done' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {step === 'done' ? <i className="ri-check-line text-sm"></i> : '2'}
              </div>
              <span className={`text-[10px] font-medium ${step === 'reset' ? 'text-violet-600' : 'text-slate-400'}`}>设置新密码</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step === 'done' ? 'bg-emerald-400' : 'bg-slate-100'}`}></div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === 'done' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {step === 'done' ? <i className="ri-check-line text-sm"></i> : '3'}
              </div>
              <span className={`text-[10px] font-medium ${step === 'done' ? 'text-emerald-600' : 'text-slate-400'}`}>完成</span>
            </div>
          </div>
        </div>

        {/* Step 1 */}
        {step === 'verify' && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-slate-800">验证当前密码</h3>
            </div>
            <div className="px-4 py-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1.5 block">当前密码</label>
                <div className={`flex items-center bg-slate-50 rounded-xl px-3 py-3 border transition-colors ${errors.currentPassword ? 'border-red-300' : 'border-slate-100 focus-within:border-violet-400'}`}>
                  <div className="w-5 h-5 flex items-center justify-center mr-2.5">
                    <i className="ri-lock-line text-slate-400 text-base"></i>
                  </div>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setErrors(prev => ({ ...prev, currentPassword: '' })); }}
                    placeholder="请输入当前密码"
                    className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} className="w-5 h-5 flex items-center justify-center ml-2">
                    <i className={`${showCurrent ? 'ri-eye-off-line' : 'ri-eye-line'} text-slate-400 text-base`}></i>
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <i className="ri-error-warning-line"></i>{errors.currentPassword}
                  </p>
                )}
              </div>
              <button onClick={handleVerify} className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-300/40">
                下一步
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 'reset' && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-slate-800">设置新密码</h3>
            </div>
            <div className="px-4 py-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1.5 block">新密码</label>
                <div className={`flex items-center bg-slate-50 rounded-xl px-3 py-3 border transition-colors ${errors.newPassword ? 'border-red-300' : 'border-slate-100 focus-within:border-violet-400'}`}>
                  <div className="w-5 h-5 flex items-center justify-center mr-2.5">
                    <i className="ri-lock-password-line text-slate-400 text-base"></i>
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: '' })); }}
                    placeholder="至少8位，含字母和数字"
                    className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="w-5 h-5 flex items-center justify-center ml-2">
                    <i className={`${showNew ? 'ri-eye-off-line' : 'ri-eye-line'} text-slate-400 text-base`}></i>
                  </button>
                </div>
                {errors.newPassword && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><i className="ri-error-warning-line"></i>{errors.newPassword}</p>}
                {newPassword.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= strength.level ? strength.color : 'bg-slate-100'}`}></div>
                      ))}
                    </div>
                    <p className={`text-[10px] font-medium ${strength.level <= 1 ? 'text-red-400' : strength.level === 2 ? 'text-amber-400' : 'text-emerald-500'}`}>密码强度：{strength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1.5 block">确认新密码</label>
                <div className={`flex items-center bg-slate-50 rounded-xl px-3 py-3 border transition-colors ${errors.confirmPassword ? 'border-red-300' : 'border-slate-100 focus-within:border-violet-400'}`}>
                  <div className="w-5 h-5 flex items-center justify-center mr-2.5">
                    <i className="ri-shield-check-line text-slate-400 text-base"></i>
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                    placeholder="再次输入新密码"
                    className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="w-5 h-5 flex items-center justify-center ml-2">
                    <i className={`${showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} text-slate-400 text-base`}></i>
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><i className="ri-error-warning-line"></i>{errors.confirmPassword}</p>}
                {confirmPassword && newPassword === confirmPassword && !errors.confirmPassword && (
                  <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1"><i className="ri-checkbox-circle-line"></i>两次密码一致</p>
                )}
              </div>
              <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-xs font-semibold text-violet-700 mb-2">密码要求</p>
                <div className="space-y-1">
                  {[
                    { rule: '至少8个字符', pass: newPassword.length >= 8 },
                    { rule: '包含大写字母', pass: /[A-Z]/.test(newPassword) },
                    { rule: '包含数字', pass: /[0-9]/.test(newPassword) },
                    { rule: '包含特殊字符（推荐）', pass: /[^A-Za-z0-9]/.test(newPassword) },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-4 h-4 flex items-center justify-center rounded-full ${item.pass ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <i className={`text-[10px] ${item.pass ? 'ri-check-line text-emerald-500' : 'ri-subtract-line text-slate-300'}`}></i>
                      </div>
                      <span className={`text-[11px] ${item.pass ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{item.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStep('verify'); setErrors({}); }} className="flex-1 py-3.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">上一步</button>
                <button onClick={handleReset} className="flex-1 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-300/40">确认修改</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-4 py-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-300/40 mb-5">
                <i className="ri-shield-check-fill text-white text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">密码修改成功</h3>
              <p className="text-sm text-slate-400 text-center mb-8">您的密码已更新，请妥善保管新密码</p>
              <div className="w-full space-y-3">
                <button onClick={() => navigate('/profile')} className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-300/40">返回个人中心</button>
                <button onClick={() => { setStep('verify'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setErrors({}); }} className="w-full py-3.5 bg-slate-50 text-slate-500 text-sm font-semibold rounded-xl border border-slate-100">再次修改</button>
              </div>
            </div>
          </div>
        )}

        {step !== 'done' && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-amber-100 rounded-xl flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-amber-500 text-base"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">安全提示</p>
              <p className="text-[11px] text-amber-600 leading-relaxed">请勿使用生日、手机号等易猜测的密码，建议定期更换密码以保障账号安全。</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast 提示 */}
      <div className={`absolute top-28 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className={`backdrop-blur-sm text-white text-xs font-medium px-4 py-2.5 rounded-full flex items-center gap-2 shadow-xl ${toastType === 'success' ? 'bg-slate-800/90' : 'bg-red-500/90'}`}>
          <i className={`text-sm ${toastType === 'success' ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-white'}`}></i>
          {toastMsg}
        </div>
      </div>
    </div>
  );
}
