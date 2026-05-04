import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogoEmblem } from '../components/Logo';

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
};

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const PostCard = ({ post }) => {
  const [reaction, setReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(post.topComment ? [post.topComment] : []);
  let reactionTimer = null;

  const handleLikeHold = () => {
    reactionTimer = setTimeout(() => setShowReactions(true), 400);
  };

  const handleLikeRelease = () => {
    clearTimeout(reactionTimer);
    if (!showReactions) {
      if (reaction) {
        setReaction(null);
        setLikeCount(prev => prev - 1);
      } else {
        setReaction('👍');
        setLikeCount(prev => prev + 1);
      }
    }
  };

  const pickReaction = (r) => {
    if (reaction === r) {
      setReaction(null);
      setLikeCount(prev => prev - 1);
    } else {
      if (!reaction) setLikeCount(prev => prev + 1);
      setReaction(r);
    }
    setShowReactions(false);
  };

  const submitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments(prev => [...prev, { user: 'คุณ', text: comment.trim() }]);
    setComment('');
  };

  return (
    <div className="fb-post-card">
      {/* Post Header */}
      <div className="fb-post-header">
        <div className="fb-avatar">{post.user.avatar}</div>
        <div className="fb-post-meta">
          <div className="fb-post-author">
            {post.user.name}
            {post.type === 'ad' && <span className="fb-sponsored-tag">ได้รับการสนับสนุน</span>}
          </div>
          <div className="fb-post-time">
            {post.user.time} · {post.user.privacy}
            {post.user.isGroup && <span className="fb-group-badge"> · กลุ่ม</span>}
          </div>
        </div>
        <button className="fb-more-btn">···</button>
      </div>

      {/* Post Content */}
      <div className="fb-post-content">{post.content}</div>

      {/* Product / Image Visual */}
      {post.product && (
        <div className="fb-product-visual" style={{ background: post.product.gradient }}>
          <div className="fb-product-emoji">{post.product.emoji}</div>
          <div className="fb-product-details">
            <div className="fb-product-name">{post.product.name}</div>
            <div className="fb-product-price">{post.product.price}</div>
            <button className="fb-shop-btn">🛒 ซื้อเลย</button>
          </div>
        </div>
      )}
      {post.image && !post.product && (
        <div className="fb-image-visual" style={{ background: post.image.gradient }}>
          <div className="fb-image-emoji">{post.image.emoji}</div>
          <div className="fb-image-caption">{post.image.caption}</div>
        </div>
      )}

      {/* Reaction Summary */}
      <div className="fb-reaction-bar">
        <div className="fb-reaction-summary">
          {reaction && <span>{reaction}</span>}
          {!reaction && <span>👍</span>}
          <span>❤️ 😂</span>
          <span className="fb-reaction-count">{formatNumber(likeCount)}</span>
        </div>
        <div className="fb-engagement-counts">
          <span>{formatNumber(post.comments)} ความคิดเห็น</span>
          <span>{formatNumber(post.shares)} แชร์</span>
        </div>
      </div>

      <div className="fb-divider" />

      {/* Action Buttons */}
      <div className="fb-action-row">
        <div
          className={`fb-action-btn ${reaction ? 'reacted' : ''}`}
          onMouseDown={handleLikeHold}
          onMouseUp={handleLikeRelease}
          onMouseLeave={() => { clearTimeout(reactionTimer); setShowReactions(false); }}
          style={{ position: 'relative' }}
        >
          {showReactions && (
            <div className="fb-reaction-picker">
              {REACTIONS.map(r => (
                <button key={r} className="fb-reaction-option" onClick={() => pickReaction(r)}>{r}</button>
              ))}
            </div>
          )}
          <span>{reaction || '👍'}</span>
          <span style={{ color: reaction ? '#1877f2' : 'inherit' }}>
            {reaction ? reaction === '👍' ? 'ถูกใจ' : reaction === '❤️' ? 'รัก' : reaction === '😂' ? 'ฮา' : reaction === '😮' ? 'ตะลึง' : reaction === '😢' ? 'เศร้า' : 'โกรธ' : 'ถูกใจ'}
          </span>
        </div>
        <button className="fb-action-btn" onClick={() => setShowCommentBox(v => !v)}>
          <span>💬</span><span>ความคิดเห็น</span>
        </button>
        <button className="fb-action-btn">
          <span>↗️</span><span>แชร์</span>
        </button>
      </div>

      {/* Comments Section */}
      {showCommentBox && (
        <div className="fb-comments-section">
          {comments.map((c, i) => (
            <div key={i} className="fb-comment">
              <div className="fb-comment-avatar">😊</div>
              <div className="fb-comment-bubble">
                <span className="fb-comment-user">{c.user}</span>
                <span className="fb-comment-text">{c.text}</span>
              </div>
            </div>
          ))}
          <form className="fb-comment-form" onSubmit={submitComment}>
            <div className="fb-comment-avatar">👩‍💼</div>
            <input
              className="fb-comment-input"
              placeholder="เขียนความคิดเห็น..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </form>
        </div>
      )}
    </div>
  );
};

const StoryCard = ({ story }) => (
  <div className="fb-story-card" style={{ background: story.gradient }}>
    <div className="fb-story-avatar">{story.avatar}</div>
    <div className="fb-story-label">{story.label}</div>
    {story.id === '1' && <div className="fb-story-add">+</div>}
  </div>
);

const FacebookFeedPage = () => {
  const [feed, setFeed] = useState([]);
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('home');
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get('http://localhost:3001/facebookFeed'),
      axios.get('http://localhost:3001/facebookStories'),
    ]).then(([feedRes, storiesRes]) => {
      setFeed(feedRes.data);
      setStories(storiesRes.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const NAV_ITEMS = [
    { id: 'home', icon: '🏠', label: 'หน้าแรก' },
    { id: 'watch', icon: '▶️', label: 'วิดีโอ' },
    { id: 'marketplace', icon: '🛒', label: 'Marketplace' },
    { id: 'groups', icon: '👥', label: 'กลุ่ม' },
    { id: 'gaming', icon: '🎮', label: 'เกม' },
  ];

  return (
    <div className="fb-app">
      {/* Top Navbar */}
      <header className="fb-navbar">
        <div className="fb-navbar-left">
          <div className="fb-logo" onClick={() => navigate('/dashboard')}
               style={{ background: 'transparent', border: 'none' }}>
            <LogoEmblem size="sm" />
          </div>
          <div className="fb-search-box">
            <span className="fb-search-icon">🔍</span>
            <input
              className="fb-search-input"
              placeholder="ค้นหาใน OpenThai AI"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <nav className="fb-navbar-center">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`fb-nav-btn ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
              title={item.label}
            >
              <span className="fb-nav-icon">{item.icon}</span>
              {activeNav === item.id && <div className="fb-nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="fb-navbar-right">
          <button className="fb-icon-btn" onClick={() => navigate('/dashboard')}>← กลับ</button>
          <button className="fb-icon-btn" title="เมนู">⋮⋮⋮</button>
          <button className="fb-icon-btn" title="แจ้งเตือน">🔔</button>
          <button className="fb-icon-btn" title="Messenger">💬</button>
          <div className="fb-profile-btn">👩‍💼</div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="fb-main-layout">
        {/* Left Sidebar */}
        <aside className="fb-sidebar-left">
          <div className="fb-sidebar-profile">
            <div className="fb-sidebar-avatar">👩‍💼</div>
            <span>ซุ้ยใจ</span>
          </div>
          <div className="fb-sidebar-divider" />
          {[
            { icon: '👥', label: 'เพื่อน' },
            { icon: '🛒', label: 'Marketplace' },
            { icon: '👥', label: 'กลุ่ม' },
            { icon: '▶️', label: 'Watch' },
            { icon: '🇹🇭', label: 'OTOP Community' },
            { icon: '📅', label: 'กิจกรรม' },
            { icon: '🔖', label: 'ที่บันทึกไว้' },
          ].map((item, i) => (
            <div key={i} className="fb-sidebar-item">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          <div className="fb-sidebar-divider" />
          <div className="fb-sidebar-section-title">ทางลัด</div>
          {[
            { icon: '🧵', label: 'กลุ่มผ้าไหมไทย' },
            { icon: '🌶️', label: 'ชุมชนอาหาร OTOP' },
            { icon: '☕', label: 'กาแฟดอยไทย' },
          ].map((item, i) => (
            <div key={i} className="fb-sidebar-item">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </aside>

        {/* Feed Column */}
        <main className="fb-feed-column">
          {isLoading ? (
            <div className="fb-loading">
              <div className="fb-loading-spinner">⏳</div>
              <p>กำลังโหลด feed...</p>
            </div>
          ) : (
            <>
              {/* Stories */}
              <div className="fb-stories-row">
                {stories.map(s => <StoryCard key={s.id} story={s} />)}
              </div>

              {/* Create Post Box */}
              <div className="fb-create-post">
                <div className="fb-create-avatar">👩‍💼</div>
                <button className="fb-create-input-btn">
                  คุณกำลังคิดอะไรอยู่?
                </button>
              </div>
              <div className="fb-create-post-actions">
                <button className="fb-create-action-btn">🎥 วิดีโอสด</button>
                <button className="fb-create-action-btn">🖼️ รูปภาพ/วิดีโอ</button>
                <button className="fb-create-action-btn">😊 ความรู้สึก</button>
              </div>

              {/* Posts */}
              {feed.map(post => <PostCard key={post.id} post={post} />)}
            </>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="fb-sidebar-right">
          <div className="fb-sidebar-section-title">ผู้ติดต่อ</div>
          {[
            { avatar: '🧵', name: 'ร้านผ้าไหมไทย', online: true },
            { avatar: '🌶️', name: 'น้ำพริกป้าแดง', online: true },
            { avatar: '☕', name: 'กาแฟดอยไทย', online: false },
            { avatar: '✨', name: 'เซรั่มข้าวไทย', online: true },
            { avatar: '🏺', name: 'เครื่องปั้นดินเผา', online: false },
          ].map((c, i) => (
            <div key={i} className="fb-contact-item">
              <div className="fb-contact-avatar">
                {c.avatar}
                <div className={`fb-online-dot ${c.online ? 'online' : ''}`} />
              </div>
              <span>{c.name}</span>
            </div>
          ))}

          <div className="fb-sidebar-divider" style={{ margin: '16px 0' }} />
          <div className="fb-sidebar-section-title">กลุ่มของคุณ</div>
          {[
            { icon: '🇹🇭', name: 'OTOP ไทยแท้', members: '12.4K' },
            { icon: '🌿', name: 'สมุนไพรไทยออร์แกนิก', members: '8.1K' },
            { icon: '🎨', name: 'งานหัตถกรรมไทย', members: '5.6K' },
          ].map((g, i) => (
            <div key={i} className="fb-group-item">
              <div className="fb-group-icon">{g.icon}</div>
              <div>
                <div className="fb-group-name">{g.name}</div>
                <div className="fb-group-members">{g.members} สมาชิก</div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default FacebookFeedPage;
