'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// 审核状态枚举
enum ReviewStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVISION = 'revision',
  FINAL = 'final'
}

// 审核动作枚举
enum ReviewAction {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_REVISION = 'request_revision',
  REVISE = 'revise',
  FINALIZE = 'finalize'
}

// 审核级别枚举
enum ReviewLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  FINAL = 'final'
}

// 类型定义
interface ReviewHistoryItem {
  id: string;
  report_id: string;
  reviewer_id: string;
  reviewer_name: string;
  review_level: ReviewLevel;
  action: ReviewAction;
  status: ReviewStatus;
  comments?: string;
  signature_data?: string;
  created_at: string;
  updated_at: string;
}

interface ReviewStatusData {
  report_id: string;
  current_status: ReviewStatus;
  current_level?: ReviewLevel;
  current_reviewer_id?: string;
  current_reviewer_name?: string;
  review_history: ReviewHistoryItem[];
  next_reviewers: Array<{id: string; name: string; level: string}>;
  can_edit: boolean;
  can_submit: boolean;
  can_review: boolean;
  estimated_completion?: string;
}

interface ReportReviewProps {
  reportId: string;
  onStatusChange?: (status: ReviewStatus) => void;
  onReviewComplete?: (result: any) => void;
}

const ReportReview: React.FC<ReportReviewProps> = ({
  reportId,
  onStatusChange,
  onReviewComplete
}) => {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [comments, setComments] = useState('');
  const [signatureData, setSignatureData] = useState('');

  // 获取审核状态
  const fetchReviewStatus = async () => {
    try {
      setLoading(true);
      // 模拟API调用
      const mockData: ReviewStatusData = {
        report_id: reportId,
        current_status: ReviewStatus.PENDING,
        current_level: ReviewLevel.PRIMARY,
        current_reviewer_id: 'reviewer_002',
        current_reviewer_name: '李主任',
        review_history: [
          {
            id: 'hist_001',
            report_id: reportId,
            reviewer_id: 'reviewer_001',
            reviewer_name: '张医生',
            review_level: ReviewLevel.PRIMARY,
            action: ReviewAction.SUBMIT,
            status: ReviewStatus.PENDING,
            comments: '报告已提交，请进行初审',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ],
        next_reviewers: [
          {id: 'reviewer_002', name: '李主任', level: 'primary'},
          {id: 'reviewer_003', name: '王教授', level: 'secondary'}
        ],
        can_edit: false,
        can_submit: false,
        can_review: true,
        estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      setReviewStatus(mockData);
    } catch (error) {
      console.error('获取审核状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 执行审核动作
  const performAction = async (action: ReviewAction) => {
    try {
      setActionLoading(true);
      
      // 模拟API调用
      const response = {
        success: true,
        message: getActionMessage(action),
        data: {
          action_id: `ACT_${Date.now()}`,
          report_id: reportId,
          action: action,
          comments: comments,
          signature_data: signatureData,
          performed_at: new Date().toISOString()
        }
      };
      
      if (response.success) {
        // 更新状态
        await fetchReviewStatus();
        setShowActionModal(false);
        setComments('');
        setSignatureData('');
        
        // 触发回调
        if (onReviewComplete) {
          onReviewComplete(response.data);
        }
        
        alert(response.message);
      }
    } catch (error) {
      console.error('执行审核动作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 获取动作消息
  const getActionMessage = (action: ReviewAction): string => {
    const messages = {
      [ReviewAction.APPROVE]: '报告审核通过',
      [ReviewAction.REJECT]: '报告审核被拒绝',
      [ReviewAction.REQUEST_REVISION]: '报告需要修改',
      [ReviewAction.FINALIZE]: '报告已最终确认',
      [ReviewAction.SUBMIT]: '报告已提交审核',
      [ReviewAction.REVISE]: '报告已修改并重新提交'
    };
    return messages[action] || '操作完成';
  };

  // 获取状态显示文本
  const getStatusText = (status: ReviewStatus): string => {
    const statusTexts = {
      [ReviewStatus.DRAFT]: '草稿',
      [ReviewStatus.PENDING]: '待审核',
      [ReviewStatus.IN_REVIEW]: '审核中',
      [ReviewStatus.APPROVED]: '已通过',
      [ReviewStatus.REJECTED]: '已拒绝',
      [ReviewStatus.REVISION]: '需修改',
      [ReviewStatus.FINAL]: '最终版本'
    };
    return statusTexts[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status: ReviewStatus): string => {
    const colors = {
      [ReviewStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ReviewStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ReviewStatus.IN_REVIEW]: 'bg-blue-100 text-blue-800',
      [ReviewStatus.APPROVED]: 'bg-green-100 text-green-800',
      [ReviewStatus.REJECTED]: 'bg-red-100 text-red-800',
      [ReviewStatus.REVISION]: 'bg-orange-100 text-orange-800',
      [ReviewStatus.FINAL]: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // 获取级别显示文本
  const getLevelText = (level: ReviewLevel): string => {
    const levelTexts = {
      [ReviewLevel.PRIMARY]: '初审',
      [ReviewLevel.SECONDARY]: '复审',
      [ReviewLevel.FINAL]: '终审'
    };
    return levelTexts[level] || level;
  };

  // 处理动作点击
  const handleActionClick = (action: ReviewAction) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };

  useEffect(() => {
    fetchReviewStatus();
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载审核状态...</span>
      </div>
    );
  }

  if (!reviewStatus) {
    return (
      <div className="text-center p-8 text-gray-500">
        无法获取审核状态
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 当前状态 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">审核状态</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reviewStatus.current_status)}`}>
            {getStatusText(reviewStatus.current_status)}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前级别</label>
            <p className="text-sm text-gray-900">
              {reviewStatus.current_level ? getLevelText(reviewStatus.current_level) : '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前审核员</label>
            <p className="text-sm text-gray-900">
              {reviewStatus.current_reviewer_name || '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计完成时间</label>
            <p className="text-sm text-gray-900">
              {reviewStatus.estimated_completion 
                ? new Date(reviewStatus.estimated_completion).toLocaleString()
                : '-'
              }
            </p>
          </div>
        </div>
      </div>

      {/* 审核动作 */}
      {reviewStatus.can_review && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">审核操作</h4>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              onClick={() => handleActionClick(ReviewAction.APPROVE)}
              className="bg-green-600 hover:bg-green-700"
            >
              <i className="ri-check-line mr-2"></i>
              通过
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleActionClick(ReviewAction.REJECT)}
            >
              <i className="ri-close-line mr-2"></i>
              拒绝
            </Button>
            <Button
              variant="warning"
              onClick={() => handleActionClick(ReviewAction.REQUEST_REVISION)}
            >
              <i className="ri-edit-line mr-2"></i>
              要求修改
            </Button>
            {reviewStatus.current_status === ReviewStatus.APPROVED && (
              <Button
                variant="info"
                onClick={() => handleActionClick(ReviewAction.FINALIZE)}
              >
                <i className="ri-award-line mr-2"></i>
                最终确认
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 审核历史 */}
      <div className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">审核历史</h4>
        <div className="space-y-4">
          {reviewStatus.review_history.map((item, index) => (
            <div key={item.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {item.reviewer_name} - {getLevelText(item.review_level)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getActionMessage(item.action)}
                </p>
                {item.comments && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    "{item.comments}"
                  </p>
                )}
                {item.signature_data && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      <i className="ri-verified-badge-line mr-1"></i>
                      已签名
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 动作确认模态框 */}
      {showActionModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              确认操作: {getActionMessage(selectedAction)}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核意见
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="请输入审核意见..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                电子签名
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <i className="ri-quill-pen-line text-2xl text-gray-400 mb-2"></i>
                <p className="text-sm text-gray-500">点击此处进行电子签名</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSignatureData('mock_signature_data')}
                >
                  添加签名
                </Button>
              </div>
              {signatureData && (
                <p className="text-sm text-green-600 mt-2">
                  <i className="ri-check-line mr-1"></i>
                  签名已添加
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowActionModal(false);
                  setComments('');
                  setSignatureData('');
                }}
                disabled={actionLoading}
              >
                取消
              </Button>
              <Button
                variant="default"
                onClick={() => performAction(selectedAction)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    处理中...
                  </>
                ) : (
                  '确认'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportReview;
