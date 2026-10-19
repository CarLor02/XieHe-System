
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('isLoggedIn', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-fuchsia-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
      
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/30 rotate-3">
            <img 
              src="https://public.readdy.ai/ai/img_res/e12feeb2-785e-45be-b81e-833d68e5de13.png" 
              alt="Logo" 
              className="w-14 h-14 object-contain -rotate-3"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">协和医疗</h1>
          <p className="text-sm text-slate-500 mt-2">脊柱医疗影像管理系统</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-7 border border-white/50">
          <h2 className="text-xl font-bold text-slate-800 mb-6">欢迎登录</h2>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-600 mb-2">账号</label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="请输入账号"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white text-sm transition-all"
                required
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-violet-400 to-violet-500 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-white text-xs"></i>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-600 mb-2">密码</label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="请输入密码"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white text-sm transition-all"
                required
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center">
                <i className="ri-lock-line text-white text-xs"></i>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.remember}
                  onChange={(e) => setFormData({...formData, remember: e.target.checked})}
                  className="opacity-0 absolute w-5 h-5"
                />
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  formData.remember 
                    ? 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-md shadow-violet-500/30' 
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  {formData.remember && <i className="ri-check-line text-white text-xs"></i>}
                </div>
              </div>
              <span className="text-sm text-slate-600 ml-2">记住密码</span>
            </label>
            <button type="button" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              忘记密码?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 active:scale-[0.98]"
          >
            登录
          </button>

          <div className="text-center mt-6">
            <span className="text-sm text-slate-500">还没有账户? </span>
            <button type="button" className="text-sm text-violet-600 hover:text-violet-700 font-semibold">
              立即注册
            </button>
          </div>
        </form>
        
        <p className="text-center text-xs text-slate-400 mt-6">© 2024 协和医疗 版权所有</p>
      </div>
    </div>
  );
}
