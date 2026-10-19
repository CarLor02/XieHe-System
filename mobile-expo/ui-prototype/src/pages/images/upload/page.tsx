import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const sources = [
  { key: 'camera', label: '拍照', icon: 'ri-camera-line', gradient: 'from-violet-500 to-purple-600' },
  { key: 'album', label: '相册', icon: 'ri-image-add-line', gradient: 'from-sky-400 to-blue-500' },
  { key: 'file', label: '文件', icon: 'ri-folder-open-line', gradient: 'from-emerald-400 to-teal-500' },
];

const imageTypes = [
  { label: '正面', color: 'bg-violet-50 text-violet-600', dot: 'bg-violet-400' },
  { label: '侧面', color: 'bg-sky-50 text-sky-600', dot: 'bg-sky-400' },
  { label: '左侧曲位', color: 'bg-teal-50 text-teal-600', dot: 'bg-teal-400' },
  { label: '右侧曲位', color: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-400' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImageUpload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [source, setSource] = useState('');
  const [imageType, setImageType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [previewUrl]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleSelectSource = (key: string) => {
    setSource(key);
    setDone(false);
    setProgress(0);
    const input = inputRef.current;
    if (!input) return;
    if (key === 'camera') {
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
    } else if (key === 'album') {
      input.accept = 'image/*';
      input.removeAttribute('capture');
    } else {
      input.accept = '.dcm,.dicom,.png,.jpg,.jpeg';
      input.removeAttribute('capture');
    }
    input.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDone(false);
    setProgress(0);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl('');
    }
    e.target.value = '';
  };

  const startUpload = () => {
    if (!file) {
      showToast('请先选择影像文件');
      return;
    }
    if (!imageType) {
      showToast('请选择影像类型');
      return;
    }
    setUploading(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 12 + 3;
        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setUploading(false);
          setDone(true);
          return 100;
        }
        return next;
      });
    }, 180);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/images')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white mr-3"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">上传影像</h1>
            <p className="text-violet-100 text-xs mt-0.5">上传脊柱正位 / 侧位 / 曲位 X 光影像</p>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 完成状态 */}
        {done ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <i className="ri-checkbox-circle-fill text-emerald-500 text-5xl"></i>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">上传成功</h2>
            <p className="text-sm text-slate-400 mb-8">影像已上传，等待 AI 分析</p>
            <div className="w-full space-y-3">
              <button
                onClick={() => navigate('/image-annotation')}
                className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-400/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-magic-line text-base"></i>
                去标注分析
              </button>
              <button
                onClick={() => navigate('/images')}
                className="w-full py-3.5 bg-white text-slate-600 text-sm font-semibold rounded-2xl border border-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-file-list-3-line text-base"></i>
                返回影像列表
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 来源选择 */}
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-700 mb-3">选择来源</h2>
              <div className="grid grid-cols-3 gap-3">
                {sources.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => handleSelectSource(s.key)}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border transition-all active:scale-95 ${
                      source === s.key && file
                        ? 'bg-violet-50 border-violet-200 shadow-sm'
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}
                    >
                      <i className={`${s.icon} text-white text-xl`}></i>
                    </div>
                    <span className="text-xs font-medium text-slate-600">{s.label}</span>
                  </button>
                ))}
              </div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 文件预览 */}
            {file && (
              <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-slate-200">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="预览"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-file-unknow-line text-slate-400 text-2xl"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate mb-1">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl('');
                    }}
                    className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              </div>
            )}

            {/* 类型选择 */}
            <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">
                  影像类型 <span className="text-red-400">*</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {imageTypes.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setImageType(t.label)}
                    className={`px-3 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      imageType === t.label
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow-md shadow-violet-500/30'
                        : `${t.color} border-slate-100`
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${imageType === t.label ? 'bg-white' : t.dot}`}></span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 上传进度 */}
            {uploading && (
              <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">正在上传...</span>
                  <span className="text-xs font-bold text-violet-600">{Math.floor(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 上传按钮 */}
            <button
              onClick={startUpload}
              disabled={uploading}
              className={`w-full py-3.5 rounded-2xl text-sm font-semibold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                uploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-400/30'
              }`}
            >
              <i className="ri-upload-cloud-2-line text-base"></i>
              {uploading ? '上传中...' : '开始上传'}
            </button>
          </>
        )}
      </div>

      {/* toast 提示 */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800/95 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2">
          <i className="ri-error-warning-line text-amber-400"></i>
          {toast}
        </div>
      )}
    </div>
  );
}
