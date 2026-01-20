'use client';

import React, { useEffect, useState } from 'react';
import {
  getMyInvitations,
  respondToInvitation,
  TeamInvitationItem,
} from '@/services/teamService';

export default function TeamInvitations() {
  const [invitations, setInvitations] = useState<TeamInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    invitation: TeamInvitationItem | null;
    accept: boolean;
  }>({ open: false, invitation: null, accept: false });

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMyInvitations();
      setInvitations(response.items);
    } catch (err: any) {
      console.error('加载邀请失败:', err);
      setError(err.response?.data?.detail || '加载邀请失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleRespond = async (invitationId: number, accept: boolean) => {
    try {
      setProcessing(invitationId);
      setError(null);
      const response = await respondToInvitation(invitationId, accept);

      // 显示成功消息
      setSuccessMessage(response.message);

      // 重新加载邀请列表
      await loadInvitations();

      // 关闭确认对话框
      setConfirmDialog({ open: false, invitation: null, accept: false });

      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('处理邀请失败:', err);
      setError(err.response?.data?.detail || '处理邀请失败');
    } finally {
      setProcessing(null);
    }
  };

  const openConfirmDialog = (invitation: TeamInvitationItem, accept: boolean) => {
    setConfirmDialog({ open: true, invitation, accept });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, invitation: null, accept: false });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: '管理员',
      MEMBER: '成员',
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'ADMIN'
      ? 'rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700'
      : 'rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-error-warning-line text-red-500"></i>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-checkbox-circle-line text-green-500"></i>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* 邀请列表 */}
      {invitations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          <div className="text-center">
            <i className="ri-mail-line text-6xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无团队邀请</h3>
            <p className="text-sm text-gray-500">
              当有团队邀请您加入时，会在这里显示
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* 团队信息 */}
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-team-line text-blue-600 text-xl"></i>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {invitation.team_name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(invitation.role)}`}
                    >
                      {getRoleLabel(invitation.role)}
                    </span>
                  </div>

                  {invitation.team_description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {invitation.team_description}
                    </p>
                  )}

                  <div className="border-t border-gray-100 my-3"></div>

                  {/* 邀请人信息 */}
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-user-line text-gray-400 text-sm"></i>
                    <p className="text-sm text-gray-600">
                      邀请人：<span className="font-medium">{invitation.inviter_name || '未知'}</span>
                    </p>
                  </div>

                  {/* 邀请消息 */}
                  {invitation.message && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">邀请留言：</p>
                      <p className="text-sm text-gray-700">{invitation.message}</p>
                    </div>
                  )}

                  {/* 时间信息 */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <i className="ri-time-line"></i>
                      邀请时间：{formatDate(invitation.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-line"></i>
                      过期时间：{formatDate(invitation.expires_at)}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openConfirmDialog(invitation, true)}
                    disabled={processing === invitation.id}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="ri-checkbox-circle-line"></i>
                    <span>接受</span>
                  </button>
                  <button
                    onClick={() => openConfirmDialog(invitation, false)}
                    disabled={processing === invitation.id}
                    className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="ri-close-circle-line"></i>
                    <span>拒绝</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {confirmDialog.accept ? '接受邀请' : '拒绝邀请'}
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              {confirmDialog.accept
                ? `确定要接受加入团队"${confirmDialog.invitation?.team_name}"的邀请吗？`
                : `确定要拒绝加入团队"${confirmDialog.invitation?.team_name}"的邀请吗？`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmDialog}
                disabled={processing !== null}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={() =>
                  confirmDialog.invitation &&
                  handleRespond(confirmDialog.invitation.id, confirmDialog.accept)
                }
                disabled={processing !== null}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  confirmDialog.accept
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing !== null ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    处理中...
                  </span>
                ) : (
                  '确定'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

