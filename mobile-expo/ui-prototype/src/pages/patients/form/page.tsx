import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsData } from '@/mocks/patients';

interface FormState {
  name: string;
  gender: string;
  birthDate: string;
  age: string;
  phone: string;
  patientId: string;
  note: string;
}

const emptyForm: FormState = {
  name: '',
  gender: '男',
  birthDate: '',
  age: '',
  phone: '',
  patientId: '',
  note: '',
};

function generatePatientId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `P${y}${m}${d}${seq}`;
}

function calcAge(birthDate: string): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
}

export default function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (isEdit) {
      const existing = patientsData.find((p) => p.id === id);
      if (existing) {
        setForm({
          name: existing.name.replace(/\*/g, ''),
          gender: existing.gender,
          birthDate: '',
          age: String(existing.age),
          phone: existing.phone.replace(/\*/g, ''),
          patientId: existing.id,
          note: existing.medicalHistory || '',
        });
      }
    } else {
      setForm((f) => ({ ...f, patientId: generatePatientId() }));
    }
  }, [id, isEdit]);

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'birthDate') next.age = calcAge(value);
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = '请输入患者姓名';
    if (!form.phone.trim()) {
      errs.phone = '请输入手机号';
    } else if (!/^1\d{10}$/.test(form.phone.trim())) {
      errs.phone = '请输入正确的 11 位手机号';
    }
    if (form.age) {
      const ageNum = Number(form.age);
      if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 150) errs.age = '请输入有效的年龄（0-150）';
    }
    if (!form.patientId.trim()) errs.patientId = '患者 ID 不能为空';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setToast(isEdit ? '患者信息已更新' : '患者已成功添加');
    setTimeout(() => navigate('/patients'), 1200);
  };

  const inputClass = (key: string) =>
    `w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:bg-white ${
      errors[key] ? 'border-red-300 bg-red-50/40' : 'border-slate-100'
    }`;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/patients')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white mr-3"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">{isEdit ? '编辑患者' : '新增患者'}</h1>
            <p className="text-violet-100 text-xs mt-0.5">
              {isEdit ? '修改患者基本信息' : '录入新患者档案信息'}
            </p>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 基本信息 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-slate-800">基本信息</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="请输入患者姓名"
                className={inputClass('name')}
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">性别</label>
              <div className="flex bg-slate-100 rounded-full p-1">
                {['男', '女'].map((g) => (
                  <button
                    key={g}
                    onClick={() => update('gender', g)}
                    className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                      form.gender === g
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">出生日期</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update('birthDate', e.target.value)}
                  className={inputClass('birthDate')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">年龄</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  placeholder="岁"
                  className={inputClass('age')}
                />
                {errors.age && <p className="text-xs text-red-400 mt-1">{errors.age}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                手机号 <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="请输入 11 位手机号"
                className={inputClass('phone')}
              />
              {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                患者 ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.patientId}
                onChange={(e) => update('patientId', e.target.value)}
                placeholder="自动生成，可修改"
                className={inputClass('patientId')}
              />
              {errors.patientId && (
                <p className="text-xs text-red-400 mt-1">{errors.patientId}</p>
              )}
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full"></div>
            <h2 className="text-sm font-bold text-slate-800">备注</h2>
          </div>
          <textarea
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            placeholder="既往病史、过敏史等（选填，最多 500 字）"
            maxLength={500}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:bg-white`}
          />
          <p className="text-right text-[10px] text-slate-400 mt-1">{form.note.length}/500</p>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <i className="ri-save-line text-base"></i>
          保存
        </button>
      </div>

      {/* toast 提示 */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-emerald-500 text-white text-sm font-medium rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-2 animate-pulse">
          <i className="ri-checkbox-circle-fill"></i>
          {toast}
        </div>
      )}
    </div>
  );
}