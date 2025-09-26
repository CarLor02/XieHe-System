'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// 签名类型枚举
enum SignatureType {
  HANDWRITTEN = 'handwritten',
  DIGITAL = 'digital',
  BIOMETRIC = 'biometric',
  PIN = 'pin'
}

// 类型定义
interface SignatureData {
  id: string;
  type: SignatureType;
  data: string;
  timestamp: string;
  signer_name: string;
  reason?: string;
  location?: string;
}

interface DigitalSignatureProps {
  documentId: string;
  documentType: string;
  signerName: string;
  onSignatureComplete?: (signature: SignatureData) => void;
  onSignatureCancel?: () => void;
  required?: boolean;
  signatureReason?: string;
  signatureLocation?: string;
}

const DigitalSignature: React.FC<DigitalSignatureProps> = ({
  documentId,
  documentType,
  signerName,
  onSignatureComplete,
  onSignatureCancel,
  required = false,
  signatureReason,
  signatureLocation
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<SignatureType>(SignatureType.HANDWRITTEN);
  const [pinCode, setPinCode] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  // 开始绘制
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (signatureType !== SignatureType.HANDWRITTEN) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  // 绘制过程
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureType !== SignatureType.HANDWRITTEN) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
      }
    }
  };

  // 结束绘制
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 清除签名
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setSignatureData('');
      }
    }
  };

  // 获取签名数据
  const getSignatureData = (): string => {
    const canvas = canvasRef.current;
    if (canvas && signatureType === SignatureType.HANDWRITTEN) {
      return canvas.toDataURL('image/png');
    }
    return signatureData;
  };

  // 创建签名
  const createSignature = async () => {
    try {
      setLoading(true);
      
      let finalSignatureData = '';
      
      if (signatureType === SignatureType.HANDWRITTEN) {
        if (!hasSignature) {
          alert('请先进行手写签名');
          return;
        }
        finalSignatureData = getSignatureData();
      } else if (signatureType === SignatureType.PIN) {
        if (!pinCode || pinCode.length < 4) {
          alert('请输入有效的PIN码');
          return;
        }
        finalSignatureData = btoa(pinCode); // 简单编码
      } else if (signatureType === SignatureType.DIGITAL) {
        // 模拟数字证书签名
        finalSignatureData = btoa(`digital_signature_${Date.now()}`);
      }

      // 模拟API调用创建签名
      const signatureInfo: SignatureData = {
        id: `SIG_${Date.now()}`,
        type: signatureType,
        data: finalSignatureData,
        timestamp: new Date().toISOString(),
        signer_name: signerName,
        reason: signatureReason,
        location: signatureLocation
      };

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onSignatureComplete) {
        onSignatureComplete(signatureInfo);
      }

      alert('签名创建成功！');
    } catch (error) {
      console.error('创建签名失败:', error);
      alert('签名创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理PIN码签名
  const handlePinSignature = () => {
    setShowPinInput(true);
  };

  // 处理数字证书签名
  const handleDigitalSignature = () => {
    // 模拟数字证书选择
    const confirmed = confirm('是否使用您的数字证书进行签名？');
    if (confirmed) {
      setSignatureData(btoa(`digital_cert_${Date.now()}`));
      setHasSignature(true);
    }
  };

  // 处理生物识别签名
  const handleBiometricSignature = () => {
    // 模拟生物识别
    const confirmed = confirm('请进行指纹或面部识别验证');
    if (confirmed) {
      setSignatureData(btoa(`biometric_${Date.now()}`));
      setHasSignature(true);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">电子签名</h3>
        <p className="text-sm text-gray-600">
          请选择签名方式并完成签名确认
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
      </div>

      {/* 签名类型选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">签名方式</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSignatureType(SignatureType.HANDWRITTEN)}
            className={`p-3 border rounded-lg text-center transition-colors ${
              signatureType === SignatureType.HANDWRITTEN
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <i className="ri-quill-pen-line text-xl mb-1"></i>
            <p className="text-sm">手写签名</p>
          </button>
          <button
            type="button"
            onClick={() => setSignatureType(SignatureType.DIGITAL)}
            className={`p-3 border rounded-lg text-center transition-colors ${
              signatureType === SignatureType.DIGITAL
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <i className="ri-shield-check-line text-xl mb-1"></i>
            <p className="text-sm">数字证书</p>
          </button>
          <button
            type="button"
            onClick={() => setSignatureType(SignatureType.BIOMETRIC)}
            className={`p-3 border rounded-lg text-center transition-colors ${
              signatureType === SignatureType.BIOMETRIC
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <i className="ri-fingerprint-line text-xl mb-1"></i>
            <p className="text-sm">生物识别</p>
          </button>
          <button
            type="button"
            onClick={() => setSignatureType(SignatureType.PIN)}
            className={`p-3 border rounded-lg text-center transition-colors ${
              signatureType === SignatureType.PIN
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <i className="ri-lock-password-line text-xl mb-1"></i>
            <p className="text-sm">PIN码</p>
          </button>
        </div>
      </div>

      {/* 签名区域 */}
      <div className="mb-6">
        {signatureType === SignatureType.HANDWRITTEN && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请在下方区域进行手写签名
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border border-gray-200 rounded cursor-crosshair w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <div className="flex justify-between mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                >
                  <i className="ri-eraser-line mr-2"></i>
                  清除
                </Button>
                <p className="text-sm text-gray-500 self-center">
                  {hasSignature ? '签名已完成' : '请在画布上签名'}
                </p>
              </div>
            </div>
          </div>
        )}

        {signatureType === SignatureType.PIN && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请输入您的PIN码
            </label>
            <div className="max-w-xs">
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入PIN码"
                maxLength={8}
              />
              <p className="text-sm text-gray-500 mt-1">
                PIN码长度应为4-8位
              </p>
            </div>
          </div>
        )}

        {signatureType === SignatureType.DIGITAL && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数字证书签名
            </label>
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <i className="ri-shield-check-line text-3xl text-blue-500 mb-2"></i>
              <p className="text-sm text-gray-600 mb-3">
                使用您的数字证书进行安全签名
              </p>
              <Button
                variant="outline"
                onClick={handleDigitalSignature}
              >
                <i className="ri-certificate-line mr-2"></i>
                选择证书签名
              </Button>
              {hasSignature && (
                <p className="text-sm text-green-600 mt-2">
                  <i className="ri-check-line mr-1"></i>
                  数字签名已完成
                </p>
              )}
            </div>
          </div>
        )}

        {signatureType === SignatureType.BIOMETRIC && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生物识别签名
            </label>
            <div className="border border-gray-200 rounded-lg p-4 text-center">
              <i className="ri-fingerprint-line text-3xl text-green-500 mb-2"></i>
              <p className="text-sm text-gray-600 mb-3">
                使用指纹或面部识别进行身份验证
              </p>
              <Button
                variant="outline"
                onClick={handleBiometricSignature}
              >
                <i className="ri-scan-line mr-2"></i>
                开始识别
              </Button>
              {hasSignature && (
                <p className="text-sm text-green-600 mt-2">
                  <i className="ri-check-line mr-1"></i>
                  生物识别验证成功
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 签名信息 */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">签名信息</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">签名人：</span>
            <span className="text-gray-900">{signerName}</span>
          </div>
          <div>
            <span className="text-gray-600">文档类型：</span>
            <span className="text-gray-900">{documentType}</span>
          </div>
          {signatureReason && (
            <div>
              <span className="text-gray-600">签名原因：</span>
              <span className="text-gray-900">{signatureReason}</span>
            </div>
          )}
          {signatureLocation && (
            <div>
              <span className="text-gray-600">签名地点：</span>
              <span className="text-gray-900">{signatureLocation}</span>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3">
        {onSignatureCancel && (
          <Button
            variant="outline"
            onClick={onSignatureCancel}
            disabled={loading}
          >
            取消
          </Button>
        )}
        <Button
          variant="default"
          onClick={createSignature}
          disabled={loading || (!hasSignature && signatureType === SignatureType.HANDWRITTEN)}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              创建签名中...
            </>
          ) : (
            <>
              <i className="ri-check-line mr-2"></i>
              确认签名
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DigitalSignature;
