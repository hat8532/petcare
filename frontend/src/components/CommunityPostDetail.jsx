import React, { useState, useEffect } from 'react';
import { communityApi } from '../api/communityApi';

// 커뮤니티 글 상세 화면.
// 목록에서 "글 상세보기"를 누르면 App.jsx 가 activeTab 을 바꾸면서 이 화면을 띄운다.
export default function CommunityPostDetail({ postId, onBack, user, onOpenLogin }) {
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // 댓글은 글 본문과 별개로 불러오고 별개로 갱신되므로 상태를 따로 둔다.
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        // 댓글 조회는 실패해도 빈 배열이라 본문 표시를 막지 않는다.
        setComments(await communityApi.getComments(postId));
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

  // 댓글 작성. 목록을 다시 불러와 서버가 채워준 작성자 이름·시간을 반영한다.
  async function handleAddComment() {
    if (!user) {
      alert('로그인 후 댓글을 작성할 수 있습니다.');
      onOpenLogin?.();
      return;
    }

    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    // 등록 중에 버튼을 또 누르면 같은 댓글이 두 번 달린다.
    setIsSubmitting(true);
    try {
      await communityApi.createComment(postId, newComment.trim());
      setComments(await communityApi.getComments(postId));
      setNewComment('');
    } catch (error) {
      if (error?.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        onOpenLogin?.();
        return;
      }
      alert('댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('댓글을 삭제할까요?')) return;

    try {
      await communityApi.deleteComment(postId, commentId);
      setComments(await communityApi.getComments(postId));
    } catch (error) {
      // 403은 남의 댓글이라 거절된 것이라 로그인 화면으로 보내도 소용없다.
      if (error?.status === 403) {
        alert('본인이 작성한 댓글만 삭제할 수 있습니다.');
        return;
      }
      if (error?.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        onOpenLogin?.();
        return;
      }
      alert('댓글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

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
            💬 댓글 {comments.length} · ❤️ 좋아요 {post.likesCount ?? 0}
          </div>
        </article>
      )}

      {!isLoading && !errorMessage && post && (
        <section className="glass-card" style={{ padding: '28px 32px', background: '#ffffff', marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
            댓글 {comments.length}
          </h3>

          {comments.length === 0 && (
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 20px 0' }}>
              아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
            </p>
          )}

          {comments.map((c) => (
            <div key={c.id} style={{ borderTop: '1px solid #f1f5f9', padding: '14px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                  👤 {c.authorName}
                  <span style={{ color: '#64748b', fontWeight: '500', marginLeft: '8px', fontSize: '11.5px' }}>
                    {c.timeAgo}
                  </span>
                </div>

                {/* 내 댓글에만 삭제 버튼을 보여준다. 서버도 다시 확인하므로 이건 편의용이다. */}
                {user?.id === c.userId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      color: '#94a3b8',
                      fontFamily: 'inherit'
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>

              <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
                {c.content}
              </p>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isSubmitting) handleAddComment(); }}
              placeholder={user ? '댓글을 입력하세요' : '로그인 후 댓글을 작성할 수 있습니다'}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddComment}
              disabled={isSubmitting}
              style={{ padding: '9px 20px', fontSize: '13.5px', whiteSpace: 'nowrap' }}
            >
              {isSubmitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
