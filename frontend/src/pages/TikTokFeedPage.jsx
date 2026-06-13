import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const VideoCard = ({ item, isActive }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [showHeart, setShowHeart] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showCaption, setShowCaption] = useState(false);

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <div className="tiktok-card" onDoubleClick={handleDoubleTap}>
      {/* Video Background */}
      <div
        className="tiktok-video-bg"
        style={{ background: item.gradient }}
      >
        <div className="tiktok-product-visual">
          <div className="product-emoji-big">{item.emoji}</div>
          <div className="product-name-overlay">{item.product}</div>
          <div className="product-hook">{item.hook}</div>
        </div>

        {/* AI Badge */}
        <div className="ai-badge">⚡ AI Generated</div>

        {/* Double tap heart animation */}
        {showHeart && (
          <div className="heart-animation">❤️</div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="tiktok-bottom-info">
        <div className="user-info">
          <div className="user-avatar">{item.user.avatar}</div>
          <div>
            <div className="user-name">{item.user.name}</div>
            <div className="user-handle">{item.user.handle}</div>
          </div>
          <button
            className={`follow-btn ${following ? 'following' : ''}`}
            onClick={() => setFollowing(prev => !prev)}
          >
            {following ? 'ติดตามแล้ว' : '+ ติดตาม'}
          </button>
        </div>

        <div className="caption-area" onClick={() => setShowCaption(prev => !prev)}>
          <p className={`caption-text ${showCaption ? 'expanded' : ''}`}>
            {item.caption}
          </p>
          {!showCaption && <span className="see-more">...ดูเพิ่ม</span>}
        </div>

        <div className="product-price-bar">
          <div className="price-info">
            <span className="price-current">{item.price}</span>
            <span className="price-original">{item.originalPrice}</span>
            <span className="category-tag">{item.category}</span>
          </div>
          <div className="rating-info">
            ⭐ {item.rating} · ขายแล้ว {formatNumber(item.sold)}
          </div>
        </div>

        <div className="hashtag-row">
          {item.hashtags.slice(0, 3).map((tag, i) => (
            <span key={i} className="hashtag-chip">{tag}</span>
          ))}
        </div>

        <button className="buy-now-btn">
          🛒 ซื้อเลย · {item.price}
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="tiktok-actions">
        <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
          <span className="action-count">{formatNumber(likeCount)}</span>
        </button>

        <button className="action-btn">
          <span className="action-icon">💬</span>
          <span className="action-count">{formatNumber(item.comments)}</span>
        </button>

        <button className="action-btn">
          <span className="action-icon">↗️</span>
          <span className="action-count">{formatNumber(item.shares)}</span>
        </button>

        <button
          className={`action-btn ${saved ? 'saved' : ''}`}
          onClick={() => setSaved(prev => !prev)}
        >
          <span className="action-icon">{saved ? '🔖' : '📎'}</span>
          <span className="action-count">{formatNumber(item.saves)}</span>
        </button>

        <button className="action-btn">
          <span className="action-icon spinning">🎵</span>
          <span className="action-count">เสียง</span>
        </button>
      </div>
    </div>
  );
};

const TikTokFeedPage = () => {
  const [feed, setFeed] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('foryou');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:3001/tiktokFeed')
      .then(res => {
        setFeed(res.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      const index = Math.round(scrollTop / cardHeight);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="tiktok-app">
      {/* Top Navigation */}
      <div className="tiktok-topnav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← กลับ
        </button>
        <div className="tiktok-tabs">
          <button
            className={`tiktok-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            กำลังติดตาม
          </button>
          <button
            className={`tiktok-tab ${activeTab === 'foryou' ? 'active' : ''}`}
            onClick={() => setActiveTab('foryou')}
          >
            สำหรับคุณ
          </button>
          <button
            className={`tiktok-tab ${activeTab === 'otop' ? 'active' : ''}`}
            onClick={() => setActiveTab('otop')}
          >
            🇹🇭 OTOP
          </button>
        </div>
        <button className="tiktok-search-btn">🔍</button>
      </div>

      {/* Feed Container */}
      {isLoading ? (
        <div className="tiktok-loading">
          <div className="loading-spinner">⏳</div>
          <p>กำลังโหลด feed...</p>
        </div>
      ) : (
        <div className="tiktok-feed-container" ref={containerRef}>
          {feed.map((item, index) => (
            <VideoCard
              key={item.id}
              item={item}
              isActive={index === activeIndex}
            />
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="tiktok-bottomnav">
        <button className="bottom-nav-btn active">
          <span>🏠</span>
          <span>หน้าแรก</span>
        </button>
        <button className="bottom-nav-btn">
          <span>🔍</span>
          <span>ค้นหา</span>
        </button>
        <button className="bottom-nav-btn create-btn">
          <span className="create-icon">+</span>
        </button>
        <button className="bottom-nav-btn">
          <span>📦</span>
          <span>Shop</span>
        </button>
        <button className="bottom-nav-btn">
          <span>👤</span>
          <span>โปรไฟล์</span>
        </button>
      </div>
    </div>
  );
};

export default TikTokFeedPage;
