import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

export default function CommunitySection() {
  const [posts, setPosts] = useState([]);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');


  useEffect(() => {
    async function loadCommunity() {
      const data = await apiClient.getCommunityPosts();
      if (data && data.length > 0) {
        setPosts(data);
      } else {
        setPosts([
          {
            id: 1,
            authorName: '초코마미',
            petInfo: '초코 (푸들 4살)',
            title: '귀 뒤쪽 피부 습진 AI 진단 리포트 첨부해요! 비슷한 증상 경험 있으신 분 계실까요?',
            attachedReport: 'Vision AI: 농피증 (84.5%) · 위험도: CAUTION',
            commentsCount: 8,
            likesCount: 14,
            timeAgo: '10분 전'
          },
          {
            id: 2,
            authorName: '냥냥이아빠',
            petInfo: '나비 (코숏 2살)',
            title: '눈물 눈꼽 심해서 AI 진단해봤더니 안구 결막염 나왔는데 소독 꿀팁 공유합니다.',
            attachedReport: 'Vision AI: 급성 결막염 (78.2%) · 위험도: CAUTION',
            commentsCount: 12,
            likesCount: 29,
            timeAgo: '1시간 전'
          }
        ]);
      }
    }
    loadCommunity();
  }, []);

  return (
    <section id="community-section" style={{ padding: '60px 0', background: '#f8fafc' }}>
      <div className="container">
        <div className="section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '4px 12px', borderRadius: '9999px', display: 'inline-block', marginBottom: '8px' }}>
              REPORT ATTACHED COMMUNITY
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>반려인 케어 정보 공유 커뮤니티</h2>
            <p style={{ fontSize: '14.5px', color: '#64748b', marginTop: '4px', margin: 0 }}>자신의 AI 진단 리포트를 선택 첨부하여 비슷한 증상을 겪은 반려인들과 소통하고 노하우를 나눠보세요.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsWriteOpen(true)} style={{ padding: '10px 20px', fontSize: '13.5px' }}>
            ✏️ 새 글 작성하기
          </button>
        </div>
        {isWriteOpen && (
          <div style={{ padding: '24px', background: '#ffffff', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>새 글 작성</h4>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={4}
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', marginTop: '12px', resize: 'vertical', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setIsWriteOpen(false)}
                style={{ padding: '9px 18px', fontSize: '13.5px', fontWeight: '700', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', borderRadius: '8px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '13.5px' }}>
                게시하기
              </button>
            </div>


          </div>
        )}

        <div className="grid-2">
          {posts.map((p) => (
            <div key={p.id} className="glass-card" style={{ padding: '24px', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                  👤 {p.authorName} <span style={{ color: '#64748b', fontWeight: '500' }}>({p.petInfo})</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{p.timeAgo}</span>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.4', marginBottom: '12px' }}>{p.title}</h4>

              {/* Attached AI Diagnosis Report Card */}
              {p.attachedReport && (
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#047857',
                  fontWeight: '700',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📄 첨부 리포트:</span>
                  <span>{p.attachedReport}</span>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <div>💬 댓글 {p.commentsCount} · ❤️ 좋아요 {p.likesCount}</div>
                <span style={{ color: '#059669', fontWeight: '700', cursor: 'pointer' }}>글 상세보기 ➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
