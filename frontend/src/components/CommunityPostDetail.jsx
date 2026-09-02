import React, { useState, useEffect } from 'react';
import { communityApi } from '../api/communityApi';

// 커뮤니티 글 상세 화면.
// 목록에서 "글 상세보기"를 누르면 App.jsx 가 activeTab 을 바꾸면서 이 화면을 띄운다.
export default function CommunityPostDetail({ postId, onBack }) {
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // postId 가 없으면 조회할 대상이 없다.
    if (!postId) {
      setErrorMessage('글 번호가 없습니다.');
      setIsLoading(false);
      return;
    }

    async function loadPost() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await communityApi.getCommunityPost(postId);
        if (!data) {
          setErrorMessage('글을 찾을 수 없습니다. 삭제되었을 수 있습니다.');
        }
        setPost(data);
      } catch (error) {
        console.warn('글 상세 조회 실패:', error);
        // 백엔드는 없는 글에 404 를 돌려준다.
        setErrorMessage(
          error?.status === 404
            ? '글을 찾을 수 없습니다. 삭제되었을 수 있습니다.'
            : '글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
        );
      } finally {
        // 성공하든 실패하든 로딩 표시는 반드시 끈다.
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId]);

  return (
    <section style={{ padding: '20px 0 60px 0' }}>
      <button
        onClick={onBack}
        style={{
          padding: '8px 16px',
          fontSize: '13.5px',
          fontWeight: '700',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          color: '#64748b',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        ← 목록으로
      </button>

      {isLoading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          글을 불러오는 중입니다…
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', background: '#ffffff' }}>
          <p style={{ color: '#e11d48', fontWeight: '700', margin: 0 }}>{errorMessage}</p>
        </div>
      )}

      {!isLoading && !errorMessage && post && (
        <article className="glass-card" style={{ padding: '32px', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
              👤 {post.authorName}
              {post.petInfo && (
                <span style={{ color: '#64748b', fontWeight: '500' }}> ({post.petInfo})</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{post.timeAgo}</span>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', lineHeight: '1.4', marginBottom: '20px' }}>
            {post.title}
          </h2>

          {post.attachedReport && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#047857',
              fontWeight: '700',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📄 첨부 리포트:</span>
              <span>{post.attachedReport}</span>
            </div>
          )}

          {/* whiteSpace: pre-wrap 이라야 본문의 줄바꿈이 화면에도 그대로 보인다. */}
          <p style={{
            fontSize: '15px',
            color: '#334155',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            marginBottom: '24px'
          }}>
            {post.content}
          </p>

          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
            fontSize: '12.5px',
            color: '#64748b'
          }}>
            💬 댓글 {post.commentsCount ?? 0} · ❤️ 좋아요 {post.likesCount ?? 0}
          </div>
        </article>
      )}
    </section>
  );
}
