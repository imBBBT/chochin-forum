/* =========================================================
   Global Resolution Scaling Engine (Base: 2560x1440 QHD)
   ========================================================= */
(function initResolutionScaling() {
  const BASE_WIDTH = 2560;
  let resizeRaf = null;

  function updateScale() {
    const screenWidth = window.innerWidth;
    if (screenWidth > 960) {
      const scale = screenWidth / BASE_WIDTH;
      document.documentElement.style.zoom = scale;
    } else {
      document.documentElement.style.zoom = '1';
    }
  }

  updateScale();
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(updateScale);
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScale);
  }
})();

/* =========================================================
   Low-Spec Optimization Mode Engine
   ========================================================= */
(function initLowSpecEngine() {
  const LOW_SPEC_KEY = 'chochin_low_spec_mode';
  const isEnabled = localStorage.getItem(LOW_SPEC_KEY) === 'true';
  if (isEnabled) {
    document.documentElement.classList.add('low-spec-mode');
  }
})();

/* =========================================================
   Theme Accent Customization Engine
   ========================================================= */
(function initThemeAccentEngine() {
  const THEME_KEY = 'chochin_theme_accent';
  const DEFAULT_ACCENT = '#38bdf8'; // 기본값: 모던 스카이블루 (보라색 제거)

  function hexToRgb(hex) {
    let cleanHex = String(hex || '').replace(/^#/, '').trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num) || cleanHex.length !== 6) return { r: 56, g: 189, b: 248 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  window.setForumThemeAccent = function (hexColor, save = true) {
    if (!hexColor || !/^#[0-9A-Fa-f]{3,6}$/.test(hexColor)) {
      hexColor = DEFAULT_ACCENT;
    }
    const rgb = hexToRgb(hexColor);
    const root = document.documentElement;
    root.style.setProperty('--forum-accent', hexColor);
    root.style.setProperty('--forum-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty('--forum-accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`);
    root.style.setProperty('--forum-accent-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
    root.style.setProperty('--forum-accent-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`);

    if (save) {
      localStorage.setItem(THEME_KEY, hexColor);
    }
  };

  window.getForumThemeAccent = function () {
    return localStorage.getItem(THEME_KEY) || DEFAULT_ACCENT;
  };

  // 즉시 저장된 테마 색상 적용
  window.setForumThemeAccent(window.getForumThemeAccent(), false);
})();

window.escapeHtml = function (text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

window.debounce = function (func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

window.showForumToast = function (message) {
  let toast = document.getElementById('forum-toast-elem');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'forum-toast-elem';
    toast.className = 'forum-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
};

window.toggleLowSpecMode = function () {
  const LOW_SPEC_KEY = 'chochin_low_spec_mode';
  const isCurrentlyLow = document.documentElement.classList.contains('low-spec-mode');
  const newState = !isCurrentlyLow;

  if (newState) {
    document.documentElement.classList.add('low-spec-mode');
    localStorage.setItem(LOW_SPEC_KEY, 'true');
    window.showForumToast(' 저사양 최적화 모드: 켜짐 (렉 감소)');
  } else {
    document.documentElement.classList.remove('low-spec-mode');
    localStorage.setItem(LOW_SPEC_KEY, 'false');
    window.showForumToast(' 저사양 최적화 모드: 꺼짐 (고화질)');
  }

  if (window.updateLowSpecButtonText) {
    window.updateLowSpecButtonText();
  }
  window.dispatchEvent(new CustomEvent('forumLowSpecModeChanged', { detail: { enabled: newState } }));
};

window.isLowSpecMode = function () {
  return document.documentElement.classList.contains('low-spec-mode');
};

window.updateLowSpecButtonText = function () {
  const isLow = window.isLowSpecMode();
  const btn = document.querySelector('.option-item-low-spec');
  if (btn) {
    btn.textContent = isLow ? '저사양 모드: ON' : '저사양 모드: OFF';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const optionBtn = document.querySelector('.optionbutton');
  const optionMenu = document.querySelector('.optionmenu');

  const body = document.body; // body 요소 참조

  // 닉네임 관련 요소 및 로직
  const optionItems = document.querySelectorAll('.option-item');
  const accountItem = document.querySelector('.option-item-account') || optionItems[0];
  const bgSettingItem = document.querySelector('.option-item-bg') || optionItems[1];
  let lowSpecItem = document.querySelector('.option-item-low-spec');

  if (!lowSpecItem && optionMenu) {
    lowSpecItem = document.createElement('button');
    lowSpecItem.className = 'option-item option-item-low-spec';
    optionMenu.appendChild(lowSpecItem);
  }

  if (lowSpecItem) {
    window.updateLowSpecButtonText();
    lowSpecItem.addEventListener('click', () => {
      window.toggleLowSpecMode();
      if (optionMenu) optionMenu.classList.remove('active');
      body.classList.remove('menu-open');
    });
  }

  const bgElement = document.querySelector('.bg');
  const headerNicknameDisplay = document.querySelector('.header-nickname'); // 헤더 내 닉네임 표시 요소

  // Enable smooth mouse drag & wheel scrolling for header buttons on narrow screens
  const navContainer = document.querySelector('.header-main-buttons');
  if (navContainer) {
    let isDown = false;
    let startX;
    let scrollLeft;

    navContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - navContainer.offsetLeft;
      scrollLeft = navContainer.scrollLeft;
    });
    navContainer.addEventListener('mouseleave', () => { isDown = false; });
    navContainer.addEventListener('mouseup', () => { isDown = false; });
    navContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - navContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      navContainer.scrollLeft = scrollLeft - walk;
    });

    navContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        navContainer.scrollLeft += e.deltaY;
      }
    }, { passive: true });
  }

  // --- Mobile Dedicated UI Shell Engine ---
  (function initMobileUI() {
    const isMobile = () => window.innerWidth <= 960;
    const header = document.querySelector('header.header') || document.querySelector('header');
    let brandLogo = header ? header.querySelector('.mobile-brand-title') : null;

    const syncBrandLogo = () => {
      if (!header) return;
      if (isMobile()) {
        if (!brandLogo) {
          const isSub = window.location.pathname.toLowerCase().includes('/level/');
          const homeLink = isSub ? '../index.html' : 'index.html';
          brandLogo = document.createElement('a');
          brandLogo.className = 'mobile-brand-title';
          brandLogo.href = homeLink;
          brandLogo.innerHTML = '<span class="brand-dot"></span><span>초친 포럼</span>';
          header.insertBefore(brandLogo, header.firstChild);
        } else {
          brandLogo.style.display = 'flex';
        }
      } else {
        if (brandLogo) {
          brandLogo.style.display = 'none';
        }
      }
    };

    syncBrandLogo();
    window.addEventListener('resize', syncBrandLogo);

    if (!document.querySelector('.mobile-bottom-nav')) {
      const curPath = window.location.pathname.toLowerCase();
      const isSub = curPath.includes('/level/');
      const nav = document.createElement('nav');
      nav.className = 'mobile-bottom-nav';
      nav.setAttribute('aria-label', '모바일 전용 내비게이션');

      const tabs = [
        {
          label: '홈',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
          href: 'index.html',
          test: p => p.endsWith('index.html') || p.endsWith('/') || p.endsWith('/chochin-forum/')
        },
        {
          label: '레벨',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
          href: 'level.html',
          test: p => p.includes('level')
        },
        {
          label: '맵 팩',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
          href: 'maps.html',
          test: p => p.includes('maps')
        },
        {
          label: '랭킹',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
          href: 'ranking.html',
          test: p => p.includes('ranking')
        },
        {
          label: '도구',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
          href: 'tools.html',
          test: p => p.includes('tools')
        },
        {
          label: '제출',
          iconSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
          href: 'submit.html',
          test: p => p.includes('submit')
        }
      ];

      nav.innerHTML = tabs.map(tab => {
        const isActive = tab.test(curPath);
        let href = tab.href;
        if (isSub) {
          href = (tab.href === 'level.html') ? '../level.html' : '../' + tab.href;
        }
        return `
          <a href="${href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
            <span class="mobile-nav-icon">${tab.iconSvg}</span>
            <span class="mobile-nav-label">${tab.label}</span>
          </a>
        `;
      }).join('');

      document.body.appendChild(nav);
    }
  })();

  // Nickname Modal Elements
  const nicknameModalOverlay = document.querySelector(
    '.nickname-modal-overlay',
  );
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameSubmitBtn = document.getElementById('nickname-submit-btn');
  const nicknameCancelBtn = document.getElementById('nickname-cancel-btn');

  // Background Modal Elements
  const bgModalOverlay = document.querySelector('.bg-modal-overlay');
  const bgColor1Input = document.getElementById('bg-color1');
  const bgColor1Hex = document.getElementById('bg-color1-hex');
  const bgColor2Input = document.getElementById('bg-color2');
  const bgColor2Hex = document.getElementById('bg-color2-hex');
  const bgAngleInput = document.getElementById('bg-angle');
  const bgTypeToggle = document.getElementById('bg-type-toggle');
  const bgColor2Group = document.getElementById('bg-color2-group');
  const bgAngleGroup = document.getElementById('bg-angle-group');
  const bgSubmitBtn = document.getElementById('bg-submit-btn');
  const bgResetBtn = document.getElementById('bg-reset-btn');
  const bgCancelBtn = document.getElementById('bg-cancel-btn');

  window.debounce = function (fn, wait = 150) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  window.getBasePoints = function (rankIndex) {
    if (rankIndex === 1) return 250;
    if (rankIndex === 2) return 225;
    if (rankIndex === 3) return 200;
    if (rankIndex === 4) return 175;
    if (rankIndex >= 5 && rankIndex <= 7) return 150;
    if (rankIndex >= 8 && rankIndex <= 10) return 125;
    if (rankIndex >= 11 && rankIndex <= 15) return 100;
    if (rankIndex >= 16 && rankIndex <= 20) return 80;
    return 10;
  };

  window.calcPlayerLevelPoints = function (level, rankIndex, playerNickname) {
    if (!playerNickname || !level) return 0;
    const target = String(playerNickname).trim().toLowerCase();
    if (!target) return 0;
    const base = window.getBasePoints(rankIndex);

    const verifier = (level.verifier || '').trim().toLowerCase();
    const clears = Array.isArray(level.clears) ? level.clears : [];

    // Verifier gets 1.5x points
    if (verifier && verifier === target) {
      return base * 1.5;
    }

    if (clears.length > 0) {
      // Only 100% clears (or clears without percent explicitly specified) are counted as clears
      const fullClears = clears.filter(c => {
        if (!c) return false;
        if (c.percent == null) return true;
        const num = parseFloat(String(c.percent).replace(/[^0-9.]/g, ''));
        return !isNaN(num) && num >= 100;
      });

      if (fullClears.length > 0) {
        const firstClearer = (fullClears[0].player || fullClears[0].user || fullClears[0].name || '').trim().toLowerCase();
        // First Victor gets 1.3x points
        if (firstClearer === target) {
          return base * 1.3;
        }
        const isFullClearer = fullClears.some(c => {
          const p = (c.player || c.user || c.name || '').trim().toLowerCase();
          return p === target;
        });
        if (isFullClearer) {
          return base * 1.0;
        }
      }
    }

    return 0;
  };

  let _pointsDataPromise = null;
  let _cachedPointsResult = null;

  window.invalidatePointsCache = function () {
    _cachedPointsResult = null;
    _pointsDataPromise = null;
  };

  window.calculateAllPlayerPoints = async function (forceRefresh = false) {
    if (forceRefresh) {
      window.invalidatePointsCache();
    }
    if (!forceRefresh && _cachedPointsResult) {
      return _cachedPointsResult;
    }
    if (!forceRefresh && _pointsDataPromise) {
      return _pointsDataPromise;
    }

    _pointsDataPromise = (async () => {
      try {
        const getJsonUrl = (file) => {
          const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
          if (path.includes('/level/')) {
            return file;
          }
          return `level/${file}`;
        };

        const [classicRes, challengeRes, platformerRes] = await Promise.all([
          fetch(getJsonUrl('classic.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
          fetch(getJsonUrl('challenge.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
          fetch(getJsonUrl('platformer.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] }))
        ]);

        const getLevels = (data, mode) => {
          if (window.applyDevCustomData) {
            return window.applyDevCustomData(data.levels ?? [], data.history ?? [], mode).levels;
          }
          return data.levels || [];
        };

        _cachedPointsResult = {
          classicLevels: getLevels(classicRes, 'classic'),
          challengeLevels: getLevels(challengeRes, 'challenge'),
          platformerLevels: getLevels(platformerRes, 'platformer')
        };
        return _cachedPointsResult;
      } catch (err) {
        console.error("Points calculation fetch error:", err);
        return { classicLevels: [], challengeLevels: [], platformerLevels: [] };
      } finally {
        _pointsDataPromise = null;
      }
    })();

    return _pointsDataPromise;
  };

  window.updateNicknameDisplay = async (name) => {
    if (!headerNicknameDisplay) return;
    const targetName = name || localStorage.getItem('forumNickname') || '';
    if (!targetName) {
      headerNicknameDisplay.textContent = '';
      return;
    }
    headerNicknameDisplay.innerHTML = `<span class="nick-name-text">${window.escapeHtml ? window.escapeHtml(targetName) : targetName}</span>`;

    const { classicLevels, challengeLevels, platformerLevels } = await window.calculateAllPlayerPoints(true);

    let total = 0;
    (classicLevels || []).forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, targetName);
    });
    (challengeLevels || []).forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, targetName);
    });
    (platformerLevels || []).forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, targetName);
    });

    const formattedPt = Math.round(total).toLocaleString();
    headerNicknameDisplay.innerHTML = `<span class="nick-name-text">${window.escapeHtml ? window.escapeHtml(targetName) : targetName}</span> <span class="header-user-pt-badge" title="종합 포인트 (Classic + Challenge + Platformer)">${formattedPt} PT</span>`;
  };

  // Listen to dev data or nickname updates to immediately sync header points
  window.addEventListener('devDataUpdated', () => {
    window.updateNicknameDisplay();
  });
  window.addEventListener('forumNicknameChanged', (e) => {
    window.updateNicknameDisplay(e.detail?.nickname);
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'forumNickname' || (e.key && e.key.startsWith('dev_custom_'))) {
      window.updateNicknameDisplay();
    }
  });

  // ==========================================
  // Account Profiles & Cross-Device Sync Engine
  // ==========================================
  const PROFILES_KEY = 'chochin_account_profiles';
  const RECENT_ACCOUNTS_KEY = 'chochin_recent_accounts';

  function getAccountProfiles() {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveAccountProfile(nickname, config = {}) {
    if (!nickname || !nickname.trim()) return;
    const nameKey = nickname.trim().toLowerCase();
    const profiles = getAccountProfiles();
    const existing = profiles[nameKey] || {};

    profiles[nameKey] = {
      nickname: nickname.trim(),
      accent: config.accent || existing.accent || (window.getForumThemeAccent ? window.getForumThemeAccent() : '#38bdf8'),
      bgColor1: config.bgColor1 || existing.bgColor1 || localStorage.getItem('forumBgColor1') || '#404040',
      bgColor2: config.bgColor2 || existing.bgColor2 || localStorage.getItem('forumBgColor2') || '#202020',
      bgAngle: config.bgAngle || existing.bgAngle || localStorage.getItem('forumBgAngle') || '135',
      bgIsGradient: config.bgIsGradient !== undefined ? config.bgIsGradient : (existing.bgIsGradient !== undefined ? existing.bgIsGradient : (localStorage.getItem('forumBgIsGradient') !== 'false')),
      isLowSpec: config.isLowSpec !== undefined ? config.isLowSpec : (existing.isLowSpec !== undefined ? existing.isLowSpec : (window.isLowSpecMode ? window.isLowSpecMode() : false)),
      updatedAt: Date.now()
    };
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    addRecentAccount(nickname.trim());
  }

  function loadAccountProfile(nickname) {
    if (!nickname || !nickname.trim()) return false;
    const profiles = getAccountProfiles();
    const profile = profiles[nickname.trim().toLowerCase()];
    if (!profile) return false;

    // 1. 테마 시그니처 색상 불러오기
    if (profile.accent && window.setForumThemeAccent) {
      window.setForumThemeAccent(profile.accent, true);
    }
    // 2. 배경 설정 불러오기
    const c1 = profile.bgColor1 || '#404040';
    const c2 = profile.bgColor2 || '#202020';
    const angle = profile.bgAngle || '135';
    const isGradient = profile.bgIsGradient !== false;
    localStorage.setItem('forumBgColor1', c1);
    localStorage.setItem('forumBgColor2', c2);
    localStorage.setItem('forumBgAngle', angle);
    localStorage.setItem('forumBgIsGradient', isGradient);
    updateBackground(c1, c2, angle, isGradient);

    if (bgColor1Input) bgColor1Input.value = c1;
    if (bgColor1Hex) bgColor1Hex.value = c1;
    if (bgColor2Input) bgColor2Input.value = c2;
    if (bgColor2Hex) bgColor2Hex.value = c2;
    if (bgAngleInput) bgAngleInput.value = angle;
    if (bgTypeToggle) {
      bgTypeToggle.checked = isGradient;
      toggleBgInputVisibility(isGradient);
    }
    // 3. 저사양 모드 동기화
    if (profile.isLowSpec !== undefined && window.isLowSpecMode && window.isLowSpecMode() !== profile.isLowSpec) {
      window.toggleLowSpecMode();
    }
    return true;
  }

  function getRecentAccounts() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY) || '[]');
      const cur = localStorage.getItem('forumNickname');
      if (cur && !list.some(n => n.toLowerCase() === cur.toLowerCase())) {
        list.unshift(cur);
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  function addRecentAccount(nickname) {
    if (!nickname || !nickname.trim()) return;
    const name = nickname.trim();
    let list = getRecentAccounts().filter(n => n.toLowerCase() !== name.toLowerCase());
    list.unshift(name);
    if (list.length > 8) list = list.slice(0, 8);
    localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(list));
  }

  // 기기 간 동기화 코드 생성
  window.generateDeviceSyncCode = function () {
    const curNick = localStorage.getItem('forumNickname') || '';
    const data = {
      n: curNick,
      a: window.getForumThemeAccent ? window.getForumThemeAccent() : '#38bdf8',
      b1: localStorage.getItem('forumBgColor1') || '#404040',
      b2: localStorage.getItem('forumBgColor2') || '#202020',
      ag: localStorage.getItem('forumBgAngle') || '135',
      g: localStorage.getItem('forumBgIsGradient') !== 'false',
      l: window.isLowSpecMode ? window.isLowSpecMode() : false,
      t: Date.now()
    };
    try {
      const json = JSON.stringify(data);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return 'CF:' + b64;
    } catch (e) {
      return '';
    }
  };

  // 동기화 코드 적용
  window.applyDeviceSyncCode = function (codeStr) {
    if (!codeStr || !codeStr.trim()) return { success: false, msg: '동기화 코드를 입력해주세요.' };
    let raw = codeStr.trim();
    if (raw.startsWith('CF:')) raw = raw.slice(3);

    try {
      const json = decodeURIComponent(escape(atob(raw)));
      const data = JSON.parse(json);

      if (data.n) {
        localStorage.setItem('forumNickname', data.n);
        updateNicknameDisplay(data.n);
        window.dispatchEvent(new CustomEvent('forumNicknameChanged', { detail: { nickname: data.n } }));
      }
      if (data.a && window.setForumThemeAccent) {
        window.setForumThemeAccent(data.a, true);
      }
      if (data.b1) localStorage.setItem('forumBgColor1', data.b1);
      if (data.b2) localStorage.setItem('forumBgColor2', data.b2);
      if (data.ag) localStorage.setItem('forumBgAngle', data.ag);
      if (data.g !== undefined) localStorage.setItem('forumBgIsGradient', data.g);

      updateBackground(data.b1 || '#404040', data.b2 || '#202020', data.ag || '135', data.g !== false);
      if (bgColor1Input) bgColor1Input.value = data.b1 || '#404040';
      if (bgColor1Hex) bgColor1Hex.value = data.b1 || '#404040';
      if (bgColor2Input) bgColor2Input.value = data.b2 || '#202020';
      if (bgColor2Hex) bgColor2Hex.value = data.b2 || '#202020';
      if (bgAngleInput) bgAngleInput.value = data.ag || '135';
      if (bgTypeToggle) {
        bgTypeToggle.checked = data.g !== false;
        toggleBgInputVisibility(data.g !== false);
      }

      if (data.l !== undefined && window.isLowSpecMode && window.isLowSpecMode() !== data.l) {
        window.toggleLowSpecMode();
      }

      if (data.n) {
        saveAccountProfile(data.n, {
          accent: data.a,
          bgColor1: data.b1,
          bgColor2: data.b2,
          bgAngle: data.ag,
          bgIsGradient: data.g,
          isLowSpec: data.l
        });
      }

      return { success: true, nickname: data.n };
    } catch (err) {
      return { success: false, msg: '올바르지 않은 동기화 코드입니다.' };
    }
  };

  // URL ?sync=... 쿼리 파라미터 자동 로드 확인
  (function checkUrlSyncParam() {
    const params = new URLSearchParams(window.location.search);
    const syncCode = params.get('sync');
    if (syncCode) {
      const res = window.applyDeviceSyncCode(syncCode);
      if (res.success) {
        const url = new URL(window.location.href);
        url.searchParams.delete('sync');
        window.history.replaceState({}, '', url.toString());
        if (window.showForumToast) {
          window.showForumToast(`[${res.nickname}] 설정이 성공적으로 동기화되었습니다!`);
        }
      }
    }
  })();

  // 초기 로드 시 저장된 닉네임 확인
  const showNicknameModal = () => {
    nicknameModalOverlay.classList.add('active');
    const currentNickname = localStorage.getItem('forumNickname') || '';
    nicknameInput.value = currentNickname;

    // 모달 내부 동적 구성 (서브텍스트, 최근 계정 칩, 동기화 박스 보장)
    const modalBox = nicknameModalOverlay.querySelector('.nickname-input-box');
    if (modalBox) {
      let subText = modalBox.querySelector('.account-modal-subtext');
      if (!subText) {
        subText = document.createElement('p');
        subText.className = 'account-modal-subtext';
        subText.innerHTML = '계정을 선택하면 해당 계정의 시그니처 색상과 배경 설정이 자동으로 로드됩니다.';
        const h2 = modalBox.querySelector('h2');
        if (h2 && h2.nextSibling) {
          modalBox.insertBefore(subText, h2.nextSibling);
        }
      }

      let recentSection = modalBox.querySelector('.account-recent-section');
      if (!recentSection) {
        recentSection = document.createElement('div');
        recentSection.className = 'account-recent-section';
        modalBox.insertBefore(recentSection, nicknameInput);
      }

      const recents = getRecentAccounts();
      if (recents.length > 0) {
        recentSection.style.display = 'block';
        recentSection.innerHTML = `
          <span class="account-section-label">최근 사용한 계정 (클릭 시 설정 자동 로드)</span>
          <div class="account-chips-grid">
            ${recents.map(acc => `
              <button type="button" class="account-chip ${acc.toLowerCase() === currentNickname.toLowerCase() ? 'active' : ''}" data-nick="${window.escapeHtml(acc)}">
                <span>👤</span><span>${window.escapeHtml(acc)}</span>
              </button>
            `).join('')}
          </div>
        `;
        recentSection.querySelectorAll('.account-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const chosen = chip.dataset.nick;
            nicknameInput.value = chosen;
            recentSection.querySelectorAll('.account-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadAccountProfile(chosen); // 클릭 즉시 해당 계정의 설정 로드
            if (window.showForumToast) {
              window.showForumToast(`'${chosen}' 계정의 설정을 불러왔습니다.`);
            }
          });
        });
      } else {
        recentSection.style.display = 'none';
      }

      let syncBox = modalBox.querySelector('.sync-box');
      if (!syncBox) {
        const divider = document.createElement('div');
        divider.className = 'sync-divider';
        syncBox = document.createElement('div');
        syncBox.className = 'sync-box';
        syncBox.innerHTML = `
          <div class="sync-desc">
            현재 기기의 계정 및 시그니처 색상·배경 설정을 다른 기기로 즉시 전송하거나 불러올 수 있습니다.
          </div>
          <div class="sync-actions-row">
            <button type="button" class="sync-btn" id="account-copy-sync-btn">설정 코드 복사</button>
            <input type="text" class="sync-code-input" id="account-paste-sync-input" placeholder="코드 붙여넣기" spellcheck="false">
            <button type="button" class="sync-btn primary" id="account-apply-sync-btn">불러오기</button>
          </div>
        `;
        const modalButtons = modalBox.querySelector('.modal-buttons');
        modalBox.insertBefore(divider, modalButtons);
        modalBox.insertBefore(syncBox, modalButtons);

        const copyBtn = syncBox.querySelector('#account-copy-sync-btn');
        const pasteInput = syncBox.querySelector('#account-paste-sync-input');
        const applyBtn = syncBox.querySelector('#account-apply-sync-btn');

        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            const code = window.generateDeviceSyncCode();
            if (code) {
              try {
                await navigator.clipboard.writeText(code);
                if (window.showForumToast) window.showForumToast('동기화 코드가 복사되었습니다! 다른 기기에서 불러오세요.');
                else alert('동기화 코드가 복사되었습니다!');
              } catch (_) {
                prompt('아래 동기화 코드를 복사하세요:', code);
              }
            }
          });
        }

        if (applyBtn && pasteInput) {
          applyBtn.addEventListener('click', () => {
            const val = pasteInput.value.trim();
            const res = window.applyDeviceSyncCode(val);
            if (res.success) {
              if (window.showForumToast) window.showForumToast(`[${res.nickname}] 계정 설정이 성공적으로 동기화되었습니다!`);
              else alert(`[${res.nickname}] 계정 설정이 성공적으로 동기화되었습니다!`);
              hideNicknameModal();
            } else {
              alert(res.msg || '동기화 코드를 확인해주세요.');
            }
          });
        }
      }
    }

    nicknameInput.focus();
  };

  // Function to hide the nickname modal
  const hideNicknameModal = () => {
    nicknameModalOverlay.classList.remove('active');
  };

  // 배경 복구 함수 (저장된 값으로 되돌림)
  const revertBgToSaved = () => {
    const c1 = localStorage.getItem('forumBgColor1') || '#404040';
    const c2 = localStorage.getItem('forumBgColor2') || '#202020';
    const angle = localStorage.getItem('forumBgAngle') || '135';
    const isGradient = localStorage.getItem('forumBgIsGradient') !== 'false';

    updateBackground(c1, c2, angle, isGradient);

    // 입력 필드 값도 동기화
    bgColor1Input.value = c1;
    bgColor1Hex.value = c1;
    bgColor2Input.value = c2;
    bgColor2Hex.value = c2;
    bgAngleInput.value = angle;
    bgTypeToggle.checked = isGradient;
    toggleBgInputVisibility(isGradient);
    bgModalOverlay.classList.remove('active');
  };

  const toggleBgInputVisibility = (isGradient) => {
    bgColor2Group.style.display = isGradient ? 'flex' : 'none';
    bgAngleGroup.style.display = isGradient ? 'flex' : 'none';
  };

  const updateBackground = (c1, c2, angle, isGradient) => {
    if (bgElement) {
      if (isGradient) {
        bgElement.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
      } else {
        bgElement.style.background = c1;
      }
    }
  };

  // 초기 로드 시 저장된 닉네임 확인
  const savedNickname = localStorage.getItem('forumNickname');
  if (savedNickname) {
    updateNicknameDisplay(savedNickname);
    saveAccountProfile(savedNickname); // 초기 프로필 보장
  } else {
    // 닉네임이 없을 경우 헤더 닉네임 표시를 비워둠
    if (headerNicknameDisplay) {
      headerNicknameDisplay.textContent = '';
    }
  }

  // 초기 로드 시 저장된 배경 확인
  const savedBgColor1 = localStorage.getItem('forumBgColor1') || '#404040';
  const savedBgColor2 = localStorage.getItem('forumBgColor2') || '#202020';
  const savedBgAngle = localStorage.getItem('forumBgAngle') || '135';
  const savedBgIsGradient =
    localStorage.getItem('forumBgIsGradient') !== 'false';

  updateBackground(
    savedBgColor1,
    savedBgColor2,
    savedBgAngle,
    savedBgIsGradient,
  );
  bgColor1Input.value = savedBgColor1;
  bgColor1Hex.value = savedBgColor1;
  bgColor2Input.value = savedBgColor2;
  bgColor2Hex.value = savedBgColor2;
  bgAngleInput.value = savedBgAngle;
  bgTypeToggle.checked = savedBgIsGradient;
  toggleBgInputVisibility(savedBgIsGradient);

  // '계정 선택' 버튼 클릭 시 모달 표시
  accountItem.addEventListener('click', () => {
    showNicknameModal();
    // 옵션 메뉴가 열려있다면 닫기
    optionMenu.classList.remove('active');
    body.classList.remove('menu-open');
  });

  // '배경 설정' 버튼 클릭 시 모달 표시
  bgSettingItem.addEventListener('click', () => {
    bgModalOverlay.classList.add('active');
    optionMenu.classList.remove('active');
    body.classList.remove('menu-open');
  });

  // 닉네임 모달 '확인' 버튼 클릭 시
  nicknameSubmitBtn.addEventListener('click', () => {
    const name = nicknameInput.value.trim();
    if (name !== '') {
      localStorage.setItem('forumNickname', name);
      // 기존에 저장된 해당 유저의 설정이 있으면 불러오고, 없으면 현재 설정을 해당 유저 프로필에 저장
      const loaded = loadAccountProfile(name);
      if (!loaded) {
        saveAccountProfile(name);
      }
      updateNicknameDisplay(name);
      window.dispatchEvent(new CustomEvent('forumNicknameChanged', { detail: { nickname: name } }));
      hideNicknameModal();
      if (window.showForumToast) {
        window.showForumToast(`[${name}] 계정으로 변경되었습니다.`);
      }
    } else {
      alert('닉네임을 입력해주세요.');
    }
  });

  // 닉네임 모달 '취소' 버튼 클릭 시
  nicknameCancelBtn.addEventListener('click', () => {
    hideNicknameModal();
  });

  // 실시간 미리보기 이벤트 리스너 추가
  const previewBg = () => {
    updateBackground(
      bgColor1Input.value,
      bgColor2Input.value,
      bgAngleInput.value,
      bgTypeToggle.checked,
    );
  };

  // Color Pickers & Hex Inputs Sync
  const syncColorAndHex = (colorInput, hexInput) => {
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value.toUpperCase();
      previewBg();
    });
    hexInput.addEventListener('input', () => {
      const val = hexInput.value;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        colorInput.value = val;
        previewBg();
      }
    });
  };

  syncColorAndHex(bgColor1Input, bgColor1Hex);
  syncColorAndHex(bgColor2Input, bgColor2Hex);
  bgAngleInput.addEventListener('input', previewBg);
  bgTypeToggle.addEventListener('change', () => {
    toggleBgInputVisibility(bgTypeToggle.checked);
    previewBg();
  });

  // 배경 모달 '적용' 버튼 클릭 시
  bgSubmitBtn.addEventListener('click', () => {
    const c1 = bgColor1Input.value;
    const c2 = bgColor2Input.value;
    const angle = bgAngleInput.value;
    const isGradient = bgTypeToggle.checked;

    localStorage.setItem('forumBgColor1', c1);
    localStorage.setItem('forumBgColor2', c2);
    localStorage.setItem('forumBgAngle', angle);
    localStorage.setItem('forumBgIsGradient', isGradient);

    const curNick = localStorage.getItem('forumNickname');
    if (curNick) {
      saveAccountProfile(curNick, { bgColor1: c1, bgColor2: c2, bgAngle: angle, bgIsGradient: isGradient });
    }

    updateBackground(c1, c2, angle, isGradient);
    bgModalOverlay.classList.remove('active');
  });

  // 배경 모달 '초기화' 버튼 클릭 시
  bgResetBtn.addEventListener('click', () => {
    bgColor1Input.value = '#404040';
    bgColor1Hex.value = '#404040';
    bgColor2Input.value = '#202020';
    bgColor2Hex.value = '#202020';
    bgAngleInput.value = '135';
    bgTypeToggle.checked = true;
    toggleBgInputVisibility(true);
    previewBg();
  });

  // 배경 모달 '취소' 버튼 클릭 시
  bgCancelBtn.addEventListener('click', () => {
    revertBgToSaved();
  });

  // 안전한 모달 오버레이 닫기 헬퍼 (모달 내부에서 텍스트를 드래그하다가 바깥에서 마우스를 떼었을 때 화면이 꺼지는 버그 방지)
  function attachSafeOverlayClose(overlayElement, closeCallback) {
    if (!overlayElement) return;
    let isMouseDownOnOverlay = false;

    overlayElement.addEventListener('mousedown', (e) => {
      isMouseDownOnOverlay = (e.target === overlayElement);
    });

    overlayElement.addEventListener('click', (e) => {
      if (e.target === overlayElement && isMouseDownOnOverlay) {
        closeCallback();
      }
      isMouseDownOnOverlay = false;
    });
  }

  // ==========================================
  // 테마 시그니처 색상 커스텀 모달 및 옵션 메뉴 연동
  // ==========================================
  let themeModalOverlay = document.querySelector('.theme-modal-overlay');
  if (!themeModalOverlay) {
    themeModalOverlay = document.createElement('div');
    themeModalOverlay.className = 'theme-modal-overlay';
    themeModalOverlay.innerHTML = `
      <div class="theme-modal-box">
        <h2>시그니처 색상 설정</h2>
        <p class="theme-modal-desc">포럼의 시그니처 강조 색상을 원하는 색으로 커스텀하세요.<br>아래 프리셋을 선택하거나 직접 색상을 지정할 수 있습니다.</p>
        
        <div class="theme-presets-grid">
          <button class="theme-color-chip" data-color="#38bdf8" style="background:#38bdf8;" title="스카이 블루 (기본)"></button>
          <button class="theme-color-chip" data-color="#10b981" style="background:#10b981;" title="에메랄드 그린"></button>
          <button class="theme-color-chip" data-color="#f59e0b" style="background:#f59e0b;" title="앰버 골드"></button>
          <button class="theme-color-chip" data-color="#f43f5e" style="background:#f43f5e;" title="로즈 핑크"></button>
          <button class="theme-color-chip" data-color="#ef4444" style="background:#ef4444;" title="크림슨 레드"></button>
          <button class="theme-color-chip" data-color="#e2e8f0" style="background:#e2e8f0;" title="쿨 실버"></button>
          <button class="theme-color-chip" data-color="#a855f7" style="background:#a855f7;" title="사이버 퍼플"></button>
        </div>

        <div class="theme-custom-row">
          <input type="color" id="theme-color-picker" value="${window.getForumThemeAccent()}">
          <input type="text" id="theme-color-hex" value="${window.getForumThemeAccent()}" maxlength="7" spellcheck="false">
        </div>

        <div class="theme-modal-buttons">
          <button class="theme-modal-btn primary" id="theme-save-btn">적용</button>
          <button class="theme-modal-btn" id="theme-reset-btn">초기화</button>
          <button class="theme-modal-btn" id="theme-cancel-btn">취소</button>
        </div>
      </div>
    `;
    document.body.appendChild(themeModalOverlay);
  }

  const themePicker = themeModalOverlay.querySelector('#theme-color-picker');
  const themeHexInput = themeModalOverlay.querySelector('#theme-color-hex');
  const themeChips = themeModalOverlay.querySelectorAll('.theme-color-chip');
  const themeSaveBtn = themeModalOverlay.querySelector('#theme-save-btn');
  const themeResetBtn = themeModalOverlay.querySelector('#theme-reset-btn');
  const themeCancelBtn = themeModalOverlay.querySelector('#theme-cancel-btn');

  let themeInitialColor = window.getForumThemeAccent();
  let themeCurrentColor = themeInitialColor;

  const updateThemeUI = (color) => {
    themeCurrentColor = color;
    const lower = color.toLowerCase();
    themeChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.color.toLowerCase() === lower);
    });
    if (themePicker) themePicker.value = color;
    if (themeHexInput) themeHexInput.value = color.toUpperCase();
  };

  const openThemeModal = () => {
    themeInitialColor = window.getForumThemeAccent();
    updateThemeUI(themeInitialColor);
    themeModalOverlay.classList.add('active');
  };

  const closeThemeModal = () => {
    themeModalOverlay.classList.remove('active');
  };

  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const c = chip.dataset.color;
      updateThemeUI(c);
      window.setForumThemeAccent(c, false); // 라이브 프리뷰
    });
  });

  if (themePicker) {
    themePicker.addEventListener('input', () => {
      const c = themePicker.value;
      updateThemeUI(c);
      window.setForumThemeAccent(c, false);
    });
  }

  if (themeHexInput) {
    themeHexInput.addEventListener('input', () => {
      let val = themeHexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        updateThemeUI(val);
        window.setForumThemeAccent(val, false);
      }
    });
  }

  if (themeSaveBtn) {
    themeSaveBtn.addEventListener('click', () => {
      window.setForumThemeAccent(themeCurrentColor, true);
      const curNick = localStorage.getItem('forumNickname');
      if (curNick) {
        saveAccountProfile(curNick, { accent: themeCurrentColor });
      }
      closeThemeModal();
      if (window.showForumToast) window.showForumToast('시그니처 색상이 성공적으로 변경되었습니다.');
    });
  }

  if (themeResetBtn) {
    themeResetBtn.addEventListener('click', () => {
      updateThemeUI('#38bdf8');
      window.setForumThemeAccent('#38bdf8', false);
    });
  }

  if (themeCancelBtn) {
    themeCancelBtn.addEventListener('click', () => {
      window.setForumThemeAccent(themeInitialColor, false);
      closeThemeModal();
    });
  }

  // 옵션 메뉴에 '테마 색상 설정' 버튼 추가
  if (optionMenu && !optionMenu.querySelector('.option-item-theme')) {
    const themeOptionItem = document.createElement('button');
    themeOptionItem.className = 'option-item option-item-theme';
    themeOptionItem.textContent = '테마 색상 설정';
    if (bgSettingItem && bgSettingItem.nextSibling) {
      optionMenu.insertBefore(themeOptionItem, bgSettingItem.nextSibling);
    } else {
      optionMenu.appendChild(themeOptionItem);
    }

    themeOptionItem.addEventListener('click', () => {
      optionMenu.classList.remove('active');
      body.classList.remove('menu-open');
      openThemeModal();
    });
  }

  // 모달 오버레이 안전 닫기 바인딩
  attachSafeOverlayClose(nicknameModalOverlay, hideNicknameModal);
  attachSafeOverlayClose(bgModalOverlay, revertBgToSaved);
  attachSafeOverlayClose(themeModalOverlay, () => {
    window.setForumThemeAccent(themeInitialColor, false);
    closeThemeModal();
  });

  // Escape 키 누르면 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideNicknameModal();
      if (bgModalOverlay && bgModalOverlay.classList.contains('active')) {
        revertBgToSaved();
      }
      if (themeModalOverlay && themeModalOverlay.classList.contains('active')) {
        window.setForumThemeAccent(themeInitialColor, false);
        closeThemeModal();
      }
    }
  });

  // 옵션 버튼 클릭 시 메뉴 토글
  optionBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 클릭 이벤트가 윈도우로 퍼지는 것을 방지
    optionMenu.classList.toggle('active');
    body.classList.toggle('menu-open', optionMenu.classList.contains('active')); // body에 'menu-open' 클래스 토글
  });

  // 메뉴 바깥 클릭 시 닫기 (드래그 시 닫힘 방지)
  let isMouseDownOutsideMenu = false;
  window.addEventListener('mousedown', (e) => {
    isMouseDownOutsideMenu = (
      !optionBtn.contains(e.target) &&
      !optionMenu.contains(e.target) &&
      !(nicknameModalOverlay && nicknameModalOverlay.contains(e.target)) &&
      !(bgModalOverlay && bgModalOverlay.contains(e.target)) &&
      !(themeModalOverlay && themeModalOverlay.contains(e.target))
    );
  });

  window.addEventListener('click', (e) => {
    if (
      isMouseDownOutsideMenu &&
      !optionBtn.contains(e.target) &&
      !optionMenu.contains(e.target) &&
      !(nicknameModalOverlay && nicknameModalOverlay.contains(e.target)) &&
      !(bgModalOverlay && bgModalOverlay.contains(e.target)) &&
      !(themeModalOverlay && themeModalOverlay.contains(e.target))
    ) {
      optionMenu.classList.remove('active');
      body.classList.remove('menu-open');
    }
    isMouseDownOutsideMenu = false;
  });

  // 개발자 도구 모달 프레임워크 (뉴스 기능은 index.js 담당)
  const devOverlay = document.querySelector('.dev-modal-overlay');
  const devPwSection = document.getElementById('dev-password-section');
  const devContentSection = document.getElementById('dev-content-section');
  const devPwInput = document.getElementById('dev-pw-input');
  const devPwSubmit = document.getElementById('dev-pw-submit');
  const devPwCancel = document.getElementById('dev-pw-cancel');
  const devCloseBtn = document.getElementById('dev-close-btn');
  const devMainControls = document.getElementById('dev-main-controls');
  const devConsole = document.querySelector('.dev-console');
  const devLogClearBtn = document.getElementById('dev-log-clear-btn');

  window.formatLevelLength = function (rawLength) {
    if (!rawLength || rawLength === '-') return '-';
    const str = String(rawLength).trim();

    if (/^(short|medium|long|xl|xxl|xxxl)$/i.test(str)) {
      return str;
    }

    let totalSeconds = 0;
    let minutes = 0;
    let seconds = 0;
    let parsedSuccess = false;

    if (str.includes('m') || str.includes('분')) {
      const mMatch = str.match(/(\d+)\s*(?:m|분)/i);
      const sMatch = str.match(/(?:m|분)\s*(\d+)\s*(?:s|초)?/i) || str.match(/(\d+)\s*(?:s|초)/i);
      if (mMatch) {
        minutes = parseInt(mMatch[1], 10) || 0;
        seconds = sMatch ? (parseInt(sMatch[1], 10) || 0) : 0;
        totalSeconds = minutes * 60 + seconds;
        parsedSuccess = true;
      }
    } else {
      const sMatch = str.match(/(\d+)/);
      if (sMatch) {
        totalSeconds = parseInt(sMatch[1], 10) || 0;
        minutes = Math.floor(totalSeconds / 60);
        seconds = totalSeconds % 60;
        parsedSuccess = true;
      }
    }

    if (!parsedSuccess || totalSeconds <= 0) {
      return str;
    }

    let category = '';
    if (totalSeconds >= 20 && totalSeconds <= 29) {
      category = 'Short';
    } else if (totalSeconds >= 30 && totalSeconds <= 59) {
      category = 'Medium';
    } else if (totalSeconds >= 60 && totalSeconds <= 119) {
      category = 'Long';
    } else if (totalSeconds >= 120) {
      category = 'XL';
    } else {
      category = 'Tiny';
    }

    const timeFormatted = minutes > 0
      ? `${minutes}분 ${seconds}초`
      : `${seconds}초`;

    return `${timeFormatted} (${category})`;
  };

  window.GitHubSyncEngine = {
    getConfig() {
      return {
        token: (localStorage.getItem('dev_gh_token') || '').trim(),
        owner: (localStorage.getItem('dev_gh_owner') || '').trim(),
        repo: (localStorage.getItem('dev_gh_repo') || '').trim()
      };
    },

    validateData(filePath, data) {
      const errors = [];
      const warnings = [];

      if (data === undefined || data === null) {
        errors.push('동기화할 데이터가 비어있습니다 (null/undefined).');
        return { isValid: false, errors, warnings };
      }

      if (filePath.endsWith('news.json')) {
        if (!Array.isArray(data)) {
          errors.push('뉴스 데이터는 배열(Array) 형식이어야 합니다.');
        } else {
          data.forEach((item, i) => {
            if (!item.content || !String(item.content).trim()) {
              errors.push(`[뉴스 #${i + 1}] 내용이 비어있습니다.`);
            }
            if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
              warnings.push(`[뉴스 #${i + 1}] 날짜 포맷(YYYY-MM-DD)이 올바르지 않습니다: "${item.date}"`);
            }
          });
        }
      } else if (filePath.endsWith('mappack.json')) {
        if (!Array.isArray(data)) {
          errors.push('맵 팩 데이터는 배열(Array) 형식이어야 합니다.');
        } else {
          const idSet = new Set();
          data.forEach((pack, i) => {
            if (!pack.title || !String(pack.title).trim()) {
              errors.push(`[맵 팩 #${i + 1}] 맵 팩 제목이 누락되었습니다.`);
            }
            if (pack.id) {
              if (idSet.has(pack.id)) {
                warnings.push(`[맵 팩 #${i + 1} "${pack.title}"] 중복된 ID(${pack.id})가 있습니다.`);
              }
              idSet.add(pack.id);
            }
            if (!Array.isArray(pack.levels) || pack.levels.length === 0) {
              warnings.push(`[맵 팩 #${i + 1} "${pack.title || ''}"] 포함된 레벨 목록이 비어있습니다.`);
            }
          });
        }
      } else if (filePath.endsWith('hardest.json')) {
        if (!Array.isArray(data)) {
          errors.push('하디스트 데이터는 배열(Array) 형식이어야 합니다.');
        } else {
          data.forEach((user, i) => {
            if (!user.name || !String(user.name).trim()) {
              errors.push(`[하디스트 #${i + 1}] 유저 닉네임이 누락되었습니다.`);
            }
            if (!user.hardest || !String(user.hardest).trim()) {
              warnings.push(`[하디스트 #${i + 1} "${user.name || ''}"] 하디스트 레벨 정보가 비어있습니다.`);
            }
          });
        }
      } else if (filePath.includes('level/') || filePath.endsWith('classic.json') || filePath.endsWith('challenge.json') || filePath.endsWith('platformer.json')) {
        if (!data.levels || !Array.isArray(data.levels)) {
          errors.push('levels 배열이 존재하지 않거나 유효하지 않습니다.');
        } else {
          const idSet = new Set();
          data.levels.forEach((lvl, i) => {
            const rank = i + 1;
            if (!lvl.title || !String(lvl.title).trim()) {
              errors.push(`[레벨 #${rank}] 레벨 제목이 누락되었습니다.`);
            }
            if (!lvl.creator || !String(lvl.creator).trim()) {
              warnings.push(`[레벨 #${rank} "${lvl.title || ''}"] 제작자 정보가 비어있습니다.`);
            }
            if (lvl.id != null) {
              if (idSet.has(lvl.id)) {
                warnings.push(`[레벨 #${rank} "${lvl.title || ''}"] 중복된 ID(${lvl.id})가 발견되었습니다.`);
              }
              idSet.add(lvl.id);
            }
            if (lvl.video) {
              const ytId = window.extractYoutubeId ? window.extractYoutubeId(lvl.video) : '';
              if (!ytId) {
                warnings.push(`[레벨 #${rank} "${lvl.title || ''}"] 유튜브 영상 주소/ID 추출 실패: ${lvl.video}`);
              }
            }
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },

    async commitAndPush(filePath, data, commitMessage) {
      const config = this.getConfig();
      if (!config.owner || !config.repo) {
        throw new Error('GitHub Owner(ID) 또는 Repository 설정이 누락되었습니다. GitHub 설정을 먼저 완료해주세요.');
      }
      if (!config.token) {
        throw new Error('GitHub Personal Access Token이 입력되지 않았습니다. GitHub 설정을 먼저 완료해주세요.');
      }

      const validation = this.validateData(filePath, data);
      if (!validation.isValid) {
        const errorMsg = '⚠️ 데이터 오류가 발견되어 푸시가 중단되었습니다:\n\n' + validation.errors.map(e => `• ${e}`).join('\n');
        throw new Error(errorMsg);
      }

      if (validation.warnings.length > 0) {
        const warnMsg = '⚠️ 다음 주의 사항이 발견되었습니다:\n\n' + validation.warnings.slice(0, 5).map(w => `• ${w}`).join('\n') + (validation.warnings.length > 5 ? `\n... 외 ${validation.warnings.length - 5}건` : '') + '\n\n그래도 계속 진행하시겠습니까?';
        if (!confirm(warnMsg)) {
          throw new Error('사용자에 의해 동기화가 취소되었습니다.');
        }
      }

      const cleanPath = filePath.replace(/^\/+/, '');
      const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${cleanPath}`;
      const headers = {
        Authorization: `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      let sha = null;
      try {
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          sha = fileInfo.sha;
        } else if (getRes.status === 401 || getRes.status === 403) {
          throw new Error(`GitHub 인증 오류 (HTTP ${getRes.status}): Token의 권한(repo scope) 및 만료 여부를 확인하세요.`);
        }
      } catch (e) {
        if (e.message && e.message.includes('인증 오류')) throw e;
        console.warn('Existing SHA lookup non-fatal:', e);
      }

      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));

      const putBody = {
        message: commitMessage || `Update ${cleanPath} via Chochin Forum DevTools`,
        content: base64Content
      };
      if (sha) {
        putBody.sha = sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errBody = await putRes.json().catch(() => ({}));
        const errMsg = errBody.message || `HTTP ${putRes.status}`;
        throw new Error(`GitHub 커밋 & 푸시 실패 (${putRes.status}): ${errMsg}`);
      }

      const result = await putRes.json();
      return {
        success: true,
        commitSha: result.commit ? result.commit.sha : '',
        filePath: cleanPath
      };
    }
  };

  window.addAutoForumNews = async function (content, customDate) {
    try {
      const today = customDate || new Date().toISOString().split('T')[0];
      const newEntry = { date: today, content: content };

      let newsList = [];
      const customRaw = localStorage.getItem('dev_custom_news');
      if (customRaw) {
        try {
          const parsed = JSON.parse(customRaw);
          if (Array.isArray(parsed)) newsList = parsed;
        } catch (e) { }
      } else {
        try {
          const getNewsJsonUrl = () => {
            const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
            if (path.includes('/level/')) {
              return '../news.json';
            }
            return 'news.json';
          };
          const res = await fetch(getNewsJsonUrl());
          if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) newsList = data;
          }
        } catch (e) { }
      }

      newsList.unshift(newEntry);
      localStorage.setItem('dev_custom_news', JSON.stringify(newsList));
      console.log('[Auto Forum News Added]', newEntry);
    } catch (err) {
      console.warn('Failed to add auto forum news:', err);
    }
  };

  window.applyDevCustomData = function (jsonLevels, jsonHistory, modeKey) {
    try {
      const customLevels = JSON.parse(localStorage.getItem(`dev_custom_levels_${modeKey}`) || '[]');
      const customHistory = JSON.parse(localStorage.getItem(`dev_custom_history_${modeKey}`) || '[]');
      const customClears = JSON.parse(localStorage.getItem(`dev_custom_clears_${modeKey}`) || '{}');

      let levels = (jsonLevels || []).map(l => ({ ...l }));
      let history = [...customHistory, ...(jsonHistory || [])];

      customLevels.forEach(cust => {
        const idx = levels.findIndex(l => String(l.id) === String(cust.id) || String(l.title).toLowerCase() === String(cust.title).toLowerCase());
        if (idx !== -1) {
          if (cust.isDeleted) {
            levels.splice(idx, 1);
          } else {
            const [removed] = levels.splice(idx, 1);
            // Preserve existing clears from original level if cust.clears is empty or missing!
            const mergedClears = (Array.isArray(removed.clears) && removed.clears.length > 0)
              ? removed.clears
              : (Array.isArray(cust.clears) ? cust.clears : []);
            const updated = { ...removed, ...cust, clears: mergedClears };
            const targetRank = (cust.targetRank && cust.targetRank > 0 && cust.targetRank <= levels.length + 1)
              ? cust.targetRank - 1
              : idx;
            levels.splice(targetRank, 0, updated);
          }
        } else if (!cust.isDeleted) {
          const targetRank = (cust.targetRank && cust.targetRank > 0 && cust.targetRank <= levels.length + 1)
            ? cust.targetRank - 1
            : levels.length;
          levels.splice(targetRank, 0, cust);
        }
      });

      levels.forEach(level => {
        const key = String(level.id);
        const titleKey = level.title ? String(level.title).trim() : '';
        const extraClears = customClears[key] || (titleKey && customClears[titleKey]) || (titleKey && customClears[titleKey.toLowerCase()]) || [];

        const clearMap = new Map();
        (level.clears || []).forEach(c => {
          const pName = String(c.player || c.name || c.user || '').trim();
          if (pName) {
            clearMap.set(pName.toLowerCase(), {
              player: pName,
              name: pName,
              percent: c.percent != null ? c.percent : 100,
              date: c.date || '',
              link: c.link || c.video || '',
              video: c.link || c.video || ''
            });
          }
        });

        if (Array.isArray(extraClears)) {
          extraClears.forEach(c => {
            const pName = String(c.player || c.name || c.user || '').trim();
            if (pName) {
              clearMap.set(pName.toLowerCase(), {
                player: pName,
                name: pName,
                percent: c.percent != null ? c.percent : 100,
                date: c.date || '',
                link: c.link || c.video || '',
                video: c.link || c.video || ''
              });
            }
          });
        }

        level.clears = Array.from(clearMap.values());
        level.clears.sort((a, b) => (b.percent || 100) - (a.percent || 100));
      });

      history.sort((a, b) => (b.id || 0) - (a.id || 0));

      return { levels, history };
    } catch (e) {
      console.error('applyDevCustomData error:', e);
      return { levels: jsonLevels || [], history: jsonHistory || [] };
    }
  };

  const logDevConsole = (msg, color = '#0f0') => {
    if (!devConsole) return;
    const p = document.createElement('p');
    p.style.color = color;
    p.textContent = `> ${msg}`;
    devConsole.appendChild(p);
    devConsole.scrollTop = devConsole.scrollHeight;
  };

  const closeDevModal = () => {
    if (devOverlay) devOverlay.classList.remove('active');
  };

  // 단축키 이벤트 리스너 (Ctrl + Shift + E 로 개발자 도구 열기)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyE') {
      e.preventDefault();
      if (devOverlay) {
        devOverlay.classList.add('active');
        devPwSection.style.display = 'block';
        devContentSection.style.display = 'none';
        devPwInput.value = '';
        setTimeout(() => devPwInput.focus(), 300); // 슬라이드 애니메이션 후 포커스
      }
    }
  });

  // Escape 키 누르면 개발자 도구 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      devOverlay &&
      devOverlay.classList.contains('active')
    ) {
      closeDevModal();
    }
  });

  // 오버레이 배경 클릭 시 안전 닫기 (내부 텍스트 드래그 시 꺼짐 방지)
  attachSafeOverlayClose(devOverlay, closeDevModal);

  // 비밀번호 입력창에서 Enter 키 지원
  if (devPwInput) {
    devPwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') devPwSubmit.click();
    });
  }

  // 비밀번호 확인
  if (devPwSubmit) {
    devPwSubmit.addEventListener('click', () => {
      const pw = devPwInput.value;

      if (pw === 'tyviva123') {
        devPwSection.style.display = 'none';
        devContentSection.style.display = 'block';
        // 초기 화면 상태 리셋 (개발자 도구 메인 메뉴 표시)
        showMainControls();
        // 뉴스 화면 초기화 및 데이터 갱신은 index.js가 담당하도록 이벤트 전달
        document.dispatchEvent(new CustomEvent('devtools:opened'));
      } else {
        alert('비밀번호가 올바르지 않습니다.');
        devPwInput.value = '';
        devPwInput.focus();
      }
    });
  }

  // 데이터 초기화 버튼
  const devResetDataBtn = document.getElementById('dev-reset-data-btn');
  if (devResetDataBtn) {
    devResetDataBtn.addEventListener('click', () => {
      const mode = getCurrentPageMode();
      const modeName = mode === 'classic' ? 'Classic' : (mode === 'challenge' ? 'Challenge' : 'Platformer');
      if (confirm(`현재 ${modeName} 모드의 로컬 테스트 변경사항(레벨 신규/수정/삭제 및 클리어 기록)을 모두 초기화하고 원본 데이터로 되돌리시겠습니까?`)) {
        localStorage.removeItem(`dev_custom_levels_${mode}`);
        localStorage.removeItem(`dev_custom_history_${mode}`);
        localStorage.removeItem(`dev_custom_clears_${mode}`);
        logDevConsole(`[초기화] ${modeName} 모드의 테스트 데이터가 초기화되었습니다.`, '#ffe600');
        alert(`${modeName} 모드의 데이터가 원본 상태로 초기화되었습니다.`);
        window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
        showMainControls();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    });
  }

  // GitHub 자동 커밋 & 푸시 동기화 버튼
  const devGithubSyncBtn = document.getElementById('dev-github-sync-btn');
  if (devGithubSyncBtn) {
    devGithubSyncBtn.addEventListener('click', async () => {
      const mode = getCurrentPageMode();
      const modeName = mode === 'classic' ? 'Classic' : (mode === 'challenge' ? 'Challenge' : 'Platformer');
      const targetFilePath = `level/${mode}.json`;

      const config = window.GitHubSyncEngine.getConfig();
      if (!config.owner || !config.repo || !config.token) {
        alert('GitHub API 설정이 누락되었습니다. 먼저 [GitHub 설정]에서 Token, Owner, Repo를 입력하고 저장해주세요.');
        if (devSettingsOpenBtn) devSettingsOpenBtn.click();
        return;
      }

      if (!confirm(`현재 ${modeName} 모드의 모든 레벨 및 클리어 데이터를 GitHub (${config.owner}/${config.repo}의 ${targetFilePath})에 자동으로 커밋 & 푸시하시겠습니까?`)) {
        return;
      }

      devGithubSyncBtn.disabled = true;
      const origText = devGithubSyncBtn.textContent;
      devGithubSyncBtn.textContent = '동기화 중... ⏳';

      try {
        logDevConsole(`[GitHub] ${targetFilePath} 데이터 검증 및 푸시 시작...`, '#70a1ff');

        const res = await fetch(`${mode}.json`);
        const json = res.ok ? await res.json() : { levels: [], history: [] };
        const merged = window.applyDevCustomData(json.levels ?? [], json.history ?? [], mode);

        const dataToPush = {
          levels: merged.levels,
          history: merged.history
        };

        const result = await window.GitHubSyncEngine.commitAndPush(
          targetFilePath,
          dataToPush,
          `Update ${modeName} levels & clears data via DevTools`
        );

        localStorage.removeItem(`dev_custom_levels_${mode}`);
        localStorage.removeItem(`dev_custom_history_${mode}`);
        localStorage.removeItem(`dev_custom_clears_${mode}`);

        // If there is pending auto/custom news, also sync news.json
        const pendingNewsRaw = localStorage.getItem('dev_custom_news');
        if (pendingNewsRaw) {
          try {
            const parsedNews = JSON.parse(pendingNewsRaw);
            if (Array.isArray(parsedNews) && parsedNews.length > 0) {
              logDevConsole(`[GitHub] news.json 자동 동기화 진행 중...`, '#70a1ff');
              await window.GitHubSyncEngine.commitAndPush(
                'news.json',
                parsedNews,
                `Auto update news.json via DevTools (${modeName})`
              );
              localStorage.removeItem('dev_custom_news');
              logDevConsole(`[GitHub 성공] news.json 동기화 완료!`, '#2ed573');
            }
          } catch (newsErr) {
            console.warn('Auto news sync skipped or failed:', newsErr);
          }
        }

        const shortCommit = result.commitSha ? result.commitSha.substring(0, 7) : 'Success';
        logDevConsole(`[GitHub 성공] ${targetFilePath} 커밋 & 푸시 완료 (Commit: ${shortCommit})`, '#2ed573');
        alert(`🎉 ${modeName} 레벨 데이터가 GitHub에 성공적으로 커밋 & 푸시되었습니다!\n(Commit: ${shortCommit})`);

        window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
        showMainControls();
      } catch (err) {
        logDevConsole(`[GitHub 오류] ${err.message}`, '#ff4757');
        alert(`동기화 중 오류가 발생했습니다:\n\n${err.message}`);
      } finally {
        devGithubSyncBtn.disabled = false;
        devGithubSyncBtn.textContent = origText;
      }
    });
  }

  if (devLogClearBtn) {
    devLogClearBtn.addEventListener('click', () => {
      devConsole.innerHTML =
        '<p style="color: #0f0;">> 로그가 초기화되었습니다.</p>';
    });
  }

  // 닫기 버튼들
  if (devPwCancel) devPwCancel.addEventListener('click', closeDevModal);
  if (devCloseBtn) devCloseBtn.addEventListener('click', closeDevModal);

  // --- 개발자 도구 서브 패널 전환 및 레벨/기록 관리 로직 ---
  const devLevelAddOpenBtn = document.getElementById('dev-level-add-open-btn');
  const devLevelEditOpenBtn = document.getElementById('dev-level-edit-open-btn');
  const devClearAddOpenBtn = document.getElementById('dev-clear-add-open-btn');
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');

  const devLevelAddArea = document.getElementById('dev-level-add-area');
  const devLevelEditArea = document.getElementById('dev-level-edit-area');
  const devClearAddArea = document.getElementById('dev-clear-add-area');
  const devSettingsArea = document.getElementById('dev-settings-area');

  const hideAllSubPanels = () => {
    if (devMainControls) devMainControls.style.display = 'none';
    if (devLevelAddArea) devLevelAddArea.style.display = 'none';
    if (devLevelEditArea) devLevelEditArea.style.display = 'none';
    if (devClearAddArea) devClearAddArea.style.display = 'none';
    if (devSettingsArea) devSettingsArea.style.display = 'none';
  };

  const ensureAdminDashboardBtn = () => {
    const grids = document.querySelectorAll('.dev-button-grid');
    grids.forEach(grid => {
      if (!grid.querySelector('#dev-admin-dashboard-btn')) {
        const btn = document.createElement('a');
        btn.id = 'dev-admin-dashboard-btn';
        btn.className = 'modal-btn dev-action-btn dev-btn-admin';
        const targetPath = window.location.pathname.includes('/level/') ? '../admin.html' : 'admin.html';
        btn.href = targetPath;
        btn.innerHTML = '<span>검토 센터 대시보드 [A]</span>';
        btn.title = '관리자 검토 대시보드로 이동 (단축키: A)';
        grid.appendChild(btn);
      }
    });
  };

  const showMainControls = () => {
    hideAllSubPanels();
    ensureAdminDashboardBtn();
    if (devMainControls) devMainControls.style.display = 'block';
  };

  // 개발자 도구 열려 있을 때 A 키 누르면 관리자 대시보드로 바로 이동
  document.addEventListener('keydown', (e) => {
    if (devOverlay && devOverlay.classList.contains('active') && devContentSection && devContentSection.style.display === 'block') {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
      if (e.key === 'a' || e.key === 'A' || e.code === 'KeyA') {
        e.preventDefault();
        const targetPath = window.location.pathname.includes('/level/') ? '../admin.html' : 'admin.html';
        window.location.href = targetPath;
      }
    }
  });

  // --- 개발자 도구 태그 피커 로직 ---
  const GLOBAL_TAG_CATEGORIES = [
    {
      name: '스타일',
      tags: [
        'Standard', 'Layout', 'Design', 'Glow', 'Effect', 'Modern',
        'Simplism', 'Art', 'Realism', 'Pixel', 'Core', 'Atmospheric',
        'Experimental', 'Eclectic', 'Circles', 'Sunset', 'Minigame'
      ]
    },
    {
      name: '테마',
      tags: [
        '1.0', '1.9', 'Abstract', 'Acid', 'Anxious', 'Apocalyptic', 'Asian', 'Aquatic',
        'Cartoon', 'Castle', 'Cave', 'City', 'Cold', 'Colorful', 'Dark', 'Desert',
        'Dungeon', 'Factory', 'Fantasy', 'Food', 'Futuristic', 'Glitchy',
        'Grayscale', 'Happy', 'Heaven', 'Hell', 'Horror', 'Hot', 'Mechanical',
        'Monochromatic', 'Nature', 'Night', 'Party', 'Pixel Art', 'Retro', 'RobTop',
        'Sad', 'Sky', 'Space', 'Temple', 'Western', 'Domestic', 'Love', 'Lyrics',
        'Meta'
      ]
    },
    {
      name: '메타',
      tags: [
        'Flashy', 'NONG', 'Checkpointless',
        'Collab', '2P', 'XXL', 'Remake', 'Recreation', 'Animation',
        'Story', 'Fixed Hitboxes', 'Multi Path', 'Humorous', 'Jumpscares',
        '3D', 'Hard Coins', 'Sensitive'
      ]
    },
    {
      name: '게임플레이',
      tags: [
        'Overall', 'Bossfight', 'Flow', 'Fast Paced', 'Slow Paced', 'Sync', 'Blinds', 'Memory',
        'Puzzle', 'Duals', 'Maze', 'Timing', 'Tower', 'Sideways', 'Random',
        'High CPS', 'Nerve Control', 'Learny', 'Chokepoints', 'Collectathon', 'Gimmicky',
        'Gravity', 'Mirror', 'Needle', 'Timed', 'Momentum', 'Wall Jump', 'Cycle',
        'Slope Boost', 'Slippery', 'Zippers', 'Wavedash', 'Force Blocks', 'Blinkers',
        'Avoidance', 'Foddian', 'Autoscroller', 'Rooms', 'Double Jump', 'Speedrun',
        'Classic', 'Metroidvania', 'Quests', 'Progressive', 'Jetpack', 'Ball', 'UFO',
        'Wave', 'Spider', 'Swing', 'Robot', 'Cube', 'Ship'
      ]
    }
  ];

  window.GLOBAL_TAG_CATEGORIES = GLOBAL_TAG_CATEGORIES;

  const devAddSelectedTags = new Set();
  const devEditSelectedTags = new Set();

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function renderDevTagPicker(type) {
    const isAdd = type === 'add';
    const selectedSet = isAdd ? devAddSelectedTags : devEditSelectedTags;
    const chipsWrapper = document.getElementById(isAdd ? 'dev-add-tag-chips-wrapper' : 'dev-edit-tag-chips-wrapper');
    const countEl = document.getElementById(isAdd ? 'dev-add-tag-count' : 'dev-edit-tag-count');
    const previewEl = document.getElementById(isAdd ? 'dev-add-selected-preview' : 'dev-edit-selected-preview');

    if (!chipsWrapper) return;

    if (countEl) countEl.textContent = selectedSet.size;

    if (previewEl) {
      if (selectedSet.size === 0) {
        previewEl.innerHTML = '<span style="color: rgba(255,255,255,0.4); font-size:0.75rem;">선택된 태그 없음</span>';
      } else {
        previewEl.innerHTML = Array.from(selectedSet).map(tag => {
          return `<span class="preview-tag-badge">#${escapeHtml(tag)}</span>`;
        }).join('');
      }
    }

    chipsWrapper.innerHTML = '';

    const allStandardTags = new Set();
    GLOBAL_TAG_CATEGORIES.forEach(cat => {
      cat.tags.forEach(t => allStandardTags.add(t.toLowerCase()));
    });

    const customTags = Array.from(selectedSet).filter(t => !allStandardTags.has(t.toLowerCase()));
    const categoriesToRender = [...GLOBAL_TAG_CATEGORIES];
    if (customTags.length > 0) {
      categoriesToRender.push({
        name: '기타',
        tags: customTags
      });
    }

    categoriesToRender.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'dev-tag-category-row';
      row.dataset.category = cat.name;

      const catBadge = document.createElement('span');
      catBadge.className = 'dev-tag-cat-badge';
      catBadge.textContent = cat.name;
      row.appendChild(catBadge);

      const chipsGroup = document.createElement('div');
      chipsGroup.className = 'dev-tag-chips-group';

      cat.tags.forEach(tag => {
        const isSelected = selectedSet.has(tag) || Array.from(selectedSet).some(s => s.toLowerCase() === tag.toLowerCase());
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'dev-tag-chip' + (isSelected ? ' active' : '');
        chip.textContent = (isSelected ? '✓ #' : '#') + tag;

        chip.addEventListener('click', (e) => {
          e.preventDefault();
          const existing = Array.from(selectedSet).find(s => s.toLowerCase() === tag.toLowerCase());
          if (existing) {
            selectedSet.delete(existing);
          } else {
            selectedSet.add(tag);
          }
          renderDevTagPicker(type);
        });

        chipsGroup.appendChild(chip);
      });

      row.appendChild(chipsGroup);
      chipsWrapper.appendChild(row);
    });
  }

  function setupDevTagPickerListeners(type) {
    const isAdd = type === 'add';
    const selectedSet = isAdd ? devAddSelectedTags : devEditSelectedTags;
    const clearBtn = document.getElementById(isAdd ? 'dev-add-tag-clear-btn' : 'dev-edit-tag-clear-btn');
    const customInput = document.getElementById(isAdd ? 'dev-add-custom-tag' : 'dev-edit-custom-tag');
    const customBtn = document.getElementById(isAdd ? 'dev-add-custom-tag-btn' : 'dev-edit-custom-tag-btn');

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedSet.clear();
        renderDevTagPicker(type);
      });
    }

    const handleAddCustom = (e) => {
      if (e) e.preventDefault();
      if (!customInput) return;
      const val = customInput.value.trim();
      if (val) {
        const splitTags = val.split(/[\n,]+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        splitTags.forEach(t => selectedSet.add(t));
        customInput.value = '';
        renderDevTagPicker(type);
      }
    };

    if (customBtn) customBtn.addEventListener('click', handleAddCustom);
    if (customInput) {
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCustom();
        }
      });
    }
  }

  setupDevTagPickerListeners('add');
  setupDevTagPickerListeners('edit');

  if (devLevelAddOpenBtn) {
    devLevelAddOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devLevelAddArea) devLevelAddArea.style.display = 'block';
      const addRatingEl = document.getElementById('dev-add-rating');
      if (addRatingEl) addRatingEl.value = '';
      devAddSelectedTags.clear();
      renderDevTagPicker('add');
    });
  }

  if (devLevelEditOpenBtn) {
    devLevelEditOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devLevelEditArea) devLevelEditArea.style.display = 'block';
      populateEditLevelDropdown();
      devEditSelectedTags.clear();
      renderDevTagPicker('edit');
    });
  }

  if (devClearAddOpenBtn) {
    devClearAddOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devClearAddArea) devClearAddArea.style.display = 'block';
      populateClearLevelDropdown();
      const playerInput = document.getElementById('dev-clear-player');
      const dateInput = document.getElementById('dev-clear-date');
      if (playerInput) {
        playerInput.value = localStorage.getItem('forumNickname') || '';
      }
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    });
  }

  const devTokenInput = document.getElementById('dev-token-input');
  const devOwnerInput = document.getElementById('dev-owner-input');
  const devRepoInput = document.getElementById('dev-repo-input');
  const devSettingsSaveBtn = document.getElementById('dev-settings-save-btn');
  const devSettingsTestBtn = document.getElementById('dev-settings-test-btn');

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devSettingsArea) devSettingsArea.style.display = 'block';
      if (devTokenInput) devTokenInput.value = localStorage.getItem('dev_gh_token') || '';
      if (devOwnerInput) devOwnerInput.value = localStorage.getItem('dev_gh_owner') || '';
      if (devRepoInput) devRepoInput.value = localStorage.getItem('dev_gh_repo') || '';
    });
  }

  if (devSettingsSaveBtn) {
    devSettingsSaveBtn.addEventListener('click', () => {
      const token = (devTokenInput?.value || '').trim();
      const owner = (devOwnerInput?.value || '').trim();
      const repo = (devRepoInput?.value || '').trim();

      localStorage.setItem('dev_gh_token', token);
      localStorage.setItem('dev_gh_owner', owner);
      localStorage.setItem('dev_gh_repo', repo);

      alert('GitHub 설정이 저장되었습니다.');
      showMainControls();
    });
  }

  if (devSettingsTestBtn) {
    devSettingsTestBtn.addEventListener('click', async () => {
      const token = (devTokenInput?.value || '').trim();
      const owner = (devOwnerInput?.value || '').trim();
      const repo = (devRepoInput?.value || '').trim();

      if (!owner || !repo) {
        alert('Owner, Repository 정보를 모두 입력해주세요.');
        return;
      }

      const mode = getCurrentPageMode();
      const testUrl = `https://api.github.com/repos/${owner}/${repo}/contents/level/${mode}.json`;
      const headers = {};
      if (token) headers.Authorization = `token ${token}`;

      try {
        const response = await fetch(testUrl, { headers });
        if (response.ok) {
          alert('GitHub 연결 테스트 성공!');
        } else {
          alert(`연결 테스트 실패: ${response.status}`);
        }
      } catch (e) {
        alert('연결 테스트 중 네트워크 오류가 발생했습니다.');
      }
    });
  }

  ['dev-add-back-btn', 'dev-edit-back-btn', 'dev-clear-back-btn', 'dev-settings-back-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', showMainControls);
  });

  function extractYoutubeId(urlOrId) {
    if (!urlOrId) return '';
    const str = String(urlOrId).trim();
    if (/^[\w-]{11}$/.test(str)) {
      return str;
    }
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|embed\/|v=)([\w-]{11})/);
    if (match) return match[1];
    const loose = str.match(/([a-zA-Z0-9_-]{11})/);
    return loose ? loose[1] : str;
  }

  window.extractYoutubeId = extractYoutubeId;

  function getCurrentPageMode() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('challenge')) return 'challenge';
    if (path.includes('platformer')) return 'platformer';
    return 'classic';
  }

  // Geometry Dash Level Data Auto-Fetch Engine
  async function fetchGdLevelData(mapId) {
    if (!mapId) throw new Error('맵 ID가 입력되지 않았습니다.');
    const cleanId = String(mapId).replace(/\D/g, '');
    if (!cleanId) throw new Error('유효한 숫자 형식의 맵 ID를 입력해주세요.');

    let data = null;

    // 1차 시도: gdbrowser 직접 호출
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`https://gdbrowser.com/api/level/${cleanId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      // CORS 또는 Cloudflare WAF 차단 시 프록시 체인으로 전환
    }

    // 2차 시도: allorigins /get JSON 래퍼 (CORS 차단 없는 안전한 엔드포인트)
    if (!data || data.id === '-1' || !data.name) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://gdbrowser.com/api/level/${cleanId}`)}`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          const wrapper = await proxyRes.json();
          if (wrapper && wrapper.contents) {
            try {
              data = JSON.parse(wrapper.contents);
            } catch (pe) {}
          }
        }
      } catch (proxyErr) {}
    }

    // 3차 시도: codetabs 프록시
    if (!data || data.id === '-1' || !data.name) {
      try {
        const ctUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://gdbrowser.com/api/level/${cleanId}`)}`;
        const ctRes = await fetch(ctUrl);
        if (ctRes.ok) {
          data = await ctRes.json();
        }
      } catch (ctErr) {}
    }

    if (!data || data.id === '-1' || !data.name) {
      throw new Error(`해당 맵 ID(${cleanId})의 레벨 정보를 찾을 수 없습니다. 올바른 GD 맵 ID인지 확인해주세요.`);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      name: data.name || '',
      author: data.author || '',
      objects: data.objects != null ? String(data.objects) : '',
      length: data.length || '',
      songName: data.songName || '',
      songArtist: data.songAuthor || '',
      songId: data.songID != null ? String(data.songID) : (data.customSong != null ? String(data.customSong) : ''),
      description: data.description || '',
      uploadDate: todayStr
    };
  }
  window.fetchGdLevelData = fetchGdLevelData;

  //  Auto-Fetch GD Info Handlers for Dev Panel
  const setupGdAutoFetch = () => {
    const addFetchBtn = document.getElementById('dev-add-fetch-gd-btn');
    if (addFetchBtn && !addFetchBtn.dataset.bound) {
      addFetchBtn.dataset.bound = 'true';
      addFetchBtn.addEventListener('click', async () => {
        const mapIdInput = document.getElementById('dev-add-mapid');
        const mapId = (mapIdInput?.value || '').trim();
        if (!mapId) {
          alert('맵 ID를 먼저 입력해주세요.');
          mapIdInput?.focus();
          return;
        }

        const origText = addFetchBtn.textContent;
        addFetchBtn.disabled = true;
        addFetchBtn.textContent = '⏳ 불러오는 중...';

        try {
          const info = await fetchGdLevelData(mapId);
          if (info.name && !document.getElementById('dev-add-title')?.value) {
            document.getElementById('dev-add-title').value = info.name;
          }
          if (info.author && !document.getElementById('dev-add-creator')?.value) {
            document.getElementById('dev-add-creator').value = info.author;
            if (!document.getElementById('dev-add-verifier')?.value) {
              document.getElementById('dev-add-verifier').value = info.author;
            }
          }
          if (info.objects) {
            document.getElementById('dev-add-objects').value = Number(info.objects).toLocaleString();
          }
          if (info.length) {
            document.getElementById('dev-add-length').value = info.length;
          }
          if (info.uploadDate) {
            const upEl = document.getElementById('dev-add-uploaddate');
            if (upEl && !upEl.value) upEl.value = info.uploadDate;
          }
          if (info.songName) {
            document.getElementById('dev-add-song-name').value = info.songName;
          }
          if (info.songArtist) {
            document.getElementById('dev-add-song-artist').value = info.songArtist;
          }
          if (info.songId) {
            document.getElementById('dev-add-song-id').value = info.songId;
          }

          addFetchBtn.textContent = '✓ 불러오기 완료!';
          logDevConsole(`[GD 연동] "${info.name}" (ID: ${mapId}) 레벨 정보를 불러왔습니다.`, '#00d2ff');
          setTimeout(() => {
            addFetchBtn.textContent = origText;
            addFetchBtn.disabled = false;
          }, 1800);
        } catch (err) {
          alert(`GD 정보 불러오기 실패: ${err.message}`);
          addFetchBtn.textContent = origText;
          addFetchBtn.disabled = false;
        }
      });
    }

    const editFetchBtn = document.getElementById('dev-edit-fetch-gd-btn');
    if (editFetchBtn && !editFetchBtn.dataset.bound) {
      editFetchBtn.dataset.bound = 'true';
      editFetchBtn.addEventListener('click', async () => {
        const mapIdInput = document.getElementById('dev-edit-mapid');
        const mapId = (mapIdInput?.value || '').trim();
        if (!mapId) {
          alert('맵 ID를 먼저 입력해주세요.');
          mapIdInput?.focus();
          return;
        }

        const origText = editFetchBtn.textContent;
        editFetchBtn.disabled = true;
        editFetchBtn.textContent = '⏳ 불러오는 중...';

        try {
          const info = await fetchGdLevelData(mapId);
          if (info.name) document.getElementById('dev-edit-title').value = info.name;
          if (info.author) document.getElementById('dev-edit-creator').value = info.author;
          if (info.objects) {
            document.getElementById('dev-edit-objects').value = Number(info.objects).toLocaleString();
          }
          if (info.length) {
            document.getElementById('dev-edit-length').value = info.length;
          }
          if (info.uploadDate) {
            const upEl = document.getElementById('dev-edit-uploaddate');
            if (upEl) upEl.value = info.uploadDate;
          }
          if (info.songName) {
            document.getElementById('dev-edit-song-name').value = info.songName;
          }
          if (info.songArtist) {
            document.getElementById('dev-edit-song-artist').value = info.songArtist;
          }
          if (info.songId) {
            document.getElementById('dev-edit-song-id').value = info.songId;
          }

          editFetchBtn.textContent = '✓ 불러오기 완료!';
          logDevConsole(`[GD 연동] "${info.name}" (ID: ${mapId}) 레벨 정보를 업데이트했습니다.`, '#00d2ff');
          setTimeout(() => {
            editFetchBtn.textContent = origText;
            editFetchBtn.disabled = false;
          }, 1800);
        } catch (err) {
          alert(`GD 정보 불러오기 실패: ${err.message}`);
          editFetchBtn.textContent = origText;
          editFetchBtn.disabled = false;
        }
      });
    }
  };
  setupGdAutoFetch();

  // 1. 레벨 신규 등록 처리
  const devAddSubmitBtn = document.getElementById('dev-add-submit-btn');
  if (devAddSubmitBtn) {
    devAddSubmitBtn.addEventListener('click', () => {
      const mode = document.getElementById('dev-add-mode')?.value || getCurrentPageMode();
      const rank = parseInt(document.getElementById('dev-add-rank')?.value || '1', 10);
      const title = (document.getElementById('dev-add-title')?.value || '').trim();
      const creator = (document.getElementById('dev-add-creator')?.value || '').trim();
      const verifier = (document.getElementById('dev-add-verifier')?.value || '').trim();
      const rating = document.getElementById('dev-add-rating')?.value || '';
      const rawVideo = (document.getElementById('dev-add-video')?.value || '').trim();
      const ytId = extractYoutubeId(rawVideo);
      const video = ytId ? `https://www.youtube.com/embed/${ytId}` : rawVideo;
      const mapId = (document.getElementById('dev-add-mapid')?.value || '').trim();
      const uploadDate = (document.getElementById('dev-add-uploaddate')?.value || '').trim() || new Date().toISOString().slice(0, 10);
      const length = (document.getElementById('dev-add-length')?.value || '').trim() || 'Long';
      const objects = (document.getElementById('dev-add-objects')?.value || '').trim();
      const songName = (document.getElementById('dev-add-song-name')?.value || '').trim();
      const songArtist = (document.getElementById('dev-add-song-artist')?.value || '').trim();
      const songId = (document.getElementById('dev-add-song-id')?.value || '').trim();
      const desc = (document.getElementById('dev-add-desc')?.value || '').trim();

      if (!title || !creator) {
        alert('레벨 제목과 제작자는 필수 입력 항목입니다.');
        return;
      }

      let tags = Array.from(devAddSelectedTags);
      if (tags.length === 0) {
        const tagsStr = (document.getElementById('dev-add-tags')?.value || '').trim();
        if (tagsStr) {
          tags = tagsStr.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
        }
      }
      if (tags.length === 0) {
        tags = ['Overall'];
      }
      const newId = Date.now();

      const newLevelObj = {
        id: newId,
        title: title,
        creator: creator,
        verifier: verifier || creator,
        rating: rating,
        video: video,
        mapId: mapId,
        length: length,
        objects: objects,
        uploadDate: uploadDate,
        map: {
          mapId: mapId,
          length: length,
          objects: objects,
          uploadDate: uploadDate
        },
        song: {
          name: songName,
          artist: songArtist,
          ...(songId ? { id: songId } : {})
        },
        description: desc,
        tags: tags,
        targetRank: rank,
        clears: []
      };

      const todayStr = new Date().toLocaleDateString('ko-KR');
      const newHistoryObj = {
        id: Date.now(),
        type: 'add',
        title: title,
        detail: `"${title}" 새로운 레벨이 ${rank}위에 등록되었습니다.`,
        time: todayStr
      };

      const storageKeyLevels = `dev_custom_levels_${mode}`;
      const storageKeyHistory = `dev_custom_history_${mode}`;

      const existingLevels = JSON.parse(localStorage.getItem(storageKeyLevels) || '[]');
      const existingHistory = JSON.parse(localStorage.getItem(storageKeyHistory) || '[]');

      existingLevels.push(newLevelObj);
      existingHistory.unshift(newHistoryObj);

      localStorage.setItem(storageKeyLevels, JSON.stringify(existingLevels));
      localStorage.setItem(storageKeyHistory, JSON.stringify(existingHistory));

      // 레벨 등록 자동 뉴스 생성
      const newsContent = `${title}이(가) 베리파이 되었으며, ${rank}위에 등재 되었습니다.`;
      window.addAutoForumNews(newsContent);

      logDevConsole(`[신규 등록] "${title}" 레벨이 ${mode} 모드 ${rank}위에 등록되었습니다.`, '#2ed573');
      alert(`"${title}" 레벨이 성공적으로 등록되었습니다!`);

      window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
      showMainControls();
    });
  }

  // 2. 레벨 정보 수정 드롭다운 채우기
  function populateEditLevelDropdown() {
    const select = document.getElementById('dev-edit-level-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- 수정할 레벨 선택 --</option>';

    const levels = window.cachedLevelsData || [];
    levels.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      opt.value = String(lvl.id || idx);
      opt.textContent = `#${idx + 1} ${lvl.title} (by ${lvl.creator})`;
      select.appendChild(opt);
    });
  }

  const devEditSelect = document.getElementById('dev-edit-level-select');
  const devEditFields = document.getElementById('dev-edit-form-fields');

  if (devEditSelect) {
    devEditSelect.addEventListener('change', () => {
      const val = devEditSelect.value;
      if (!val) {
        if (devEditFields) devEditFields.style.display = 'none';
        return;
      }
      const levels = window.cachedLevelsData || [];
      const idx = levels.findIndex((l, i) => String(l.id || i) === val);
      if (idx !== -1) {
        const lvl = levels[idx];
        if (devEditFields) devEditFields.style.display = 'block';
        document.getElementById('dev-edit-rank').value = idx + 1;
        document.getElementById('dev-edit-title').value = lvl.title || '';
        document.getElementById('dev-edit-creator').value = lvl.creator || '';
        document.getElementById('dev-edit-verifier').value = lvl.verifier || '';
        document.getElementById('dev-edit-rating').value = lvl.rating || '';
        document.getElementById('dev-edit-video').value = lvl.video || '';
        document.getElementById('dev-edit-mapid').value = lvl.map?.mapId || lvl.mapId || '';
        const editUploadDateEl = document.getElementById('dev-edit-uploaddate');
        if (editUploadDateEl) editUploadDateEl.value = lvl.map?.uploadDate || lvl.uploadDate || '';
        document.getElementById('dev-edit-length').value = lvl.map?.length || lvl.length || 'Long';
        document.getElementById('dev-edit-objects').value = lvl.map?.objects || lvl.objects || '';
        document.getElementById('dev-edit-song-name').value = lvl.song?.name || '';
        document.getElementById('dev-edit-song-artist').value = lvl.song?.artist || '';
        const editSongIdEl = document.getElementById('dev-edit-song-id');
        if (editSongIdEl) editSongIdEl.value = lvl.song?.id || '';
        document.getElementById('dev-edit-desc').value = lvl.description || '';

        devEditSelectedTags.clear();
        if (Array.isArray(lvl.tags)) {
          lvl.tags.forEach(t => {
            if (t && String(t).trim()) devEditSelectedTags.add(String(t).trim());
          });
        }
        renderDevTagPicker('edit');
      }
    });
  }

  const devEditSubmitBtn = document.getElementById('dev-edit-submit-btn');
  if (devEditSubmitBtn) {
    devEditSubmitBtn.addEventListener('click', () => {
      const val = devEditSelect?.value;
      if (!val) return;

      const mode = getCurrentPageMode();
      const newRank = parseInt(document.getElementById('dev-edit-rank')?.value || '1', 10);
      const title = (document.getElementById('dev-edit-title')?.value || '').trim();
      const creator = (document.getElementById('dev-edit-creator')?.value || '').trim();
      const verifier = (document.getElementById('dev-edit-verifier')?.value || '').trim();
      const rating = document.getElementById('dev-edit-rating')?.value || '';
      const rawVideo = (document.getElementById('dev-edit-video')?.value || '').trim();
      const ytId = extractYoutubeId(rawVideo);
      const video = ytId ? `https://www.youtube.com/embed/${ytId}` : rawVideo;
      const mapId = (document.getElementById('dev-edit-mapid')?.value || '').trim();
      const uploadDate = (document.getElementById('dev-edit-uploaddate')?.value || '').trim();
      const length = (document.getElementById('dev-edit-length')?.value || '').trim() || 'Long';
      const objects = (document.getElementById('dev-edit-objects')?.value || '').trim();
      const songName = (document.getElementById('dev-edit-song-name')?.value || '').trim();
      const songArtist = (document.getElementById('dev-edit-song-artist')?.value || '').trim();
      const songId = (document.getElementById('dev-edit-song-id')?.value || '').trim();
      const desc = (document.getElementById('dev-edit-desc')?.value || '').trim();

      let tags = Array.from(devEditSelectedTags);
      if (tags.length === 0) {
        const tagsStr = (document.getElementById('dev-edit-tags')?.value || '').trim();
        if (tagsStr) {
          tags = tagsStr.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
        }
      }

      const levels = window.cachedLevelsData || [];
      const originalLevel = levels.find((l, i) => String(l.id || i) === val);
      const originalClears = originalLevel && Array.isArray(originalLevel.clears) ? originalLevel.clears : [];

      const editedLevel = {
        id: (originalLevel && originalLevel.id != null) ? originalLevel.id : (isNaN(Number(val)) ? val : Number(val)),
        title, creator, verifier, rating, video,
        mapId: mapId,
        length: length,
        objects: objects,
        uploadDate: uploadDate,
        map: {
          mapId: mapId,
          length: length,
          objects: objects,
          uploadDate: uploadDate
        },
        song: {
          name: songName,
          artist: songArtist,
          ...(songId ? { id: songId } : {})
        },
        description: desc, tags, targetRank: newRank,
        clears: originalClears
      };

      const storageKeyLevels = `dev_custom_levels_${mode}`;
      const storageKeyHistory = `dev_custom_history_${mode}`;

      const existingLevels = JSON.parse(localStorage.getItem(storageKeyLevels) || '[]');
      const existingHistory = JSON.parse(localStorage.getItem(storageKeyHistory) || '[]');

      const exIdx = existingLevels.findIndex(l => String(l.id) === String(val) || String(l.title).toLowerCase() === title.toLowerCase());
      if (exIdx !== -1) {
        existingLevels[exIdx] = { ...existingLevels[exIdx], ...editedLevel, clears: originalClears };
      } else {
        existingLevels.push(editedLevel);
      }

      const oldIdx = levels.findIndex((l, i) => String(l.id || i) === val);
      const oldRank = oldIdx !== -1 ? oldIdx + 1 : newRank;

      if (oldRank !== newRank) {
        const todayStr = new Date().toLocaleDateString('ko-KR');
        const direction = newRank < oldRank ? '상승' : '하락';
        existingHistory.unshift({
          id: Date.now(),
          type: 'move',
          title: title,
          detail: `"${title}" 레벨 순위가 ${oldRank}위에서 ${newRank}위로 변경되었습니다.`,
          time: todayStr
        });

        // 레벨 순위 변동 자동 뉴스 생성
        const newsContent = `${title}의 순위가 ${oldRank}위에서 ${newRank}위로 ${direction}했습니다.`;
        window.addAutoForumNews(newsContent);
      }

      localStorage.setItem(storageKeyLevels, JSON.stringify(existingLevels));
      localStorage.setItem(storageKeyHistory, JSON.stringify(existingHistory));

      logDevConsole(`[정보 수정] "${title}" 레벨 정보가 수정되었습니다.`, '#2ed573');
      alert(`"${title}" 레벨 정보가 수정되었습니다!`);

      window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
      showMainControls();
    });
  }

  const devEditDeleteBtn = document.getElementById('dev-edit-delete-btn');
  if (devEditDeleteBtn) {
    devEditDeleteBtn.addEventListener('click', () => {
      const val = devEditSelect?.value;
      if (!val) return;

      const title = (document.getElementById('dev-edit-title')?.value || '선택한').trim();
      if (!confirm(`정말로 "${title}" 레벨을 삭제하시겠습니까?`)) return;

      const mode = getCurrentPageMode();
      const storageKeyLevels = `dev_custom_levels_${mode}`;
      const storageKeyHistory = `dev_custom_history_${mode}`;

      const existingLevels = JSON.parse(localStorage.getItem(storageKeyLevels) || '[]');
      const existingHistory = JSON.parse(localStorage.getItem(storageKeyHistory) || '[]');

      const exIdx = existingLevels.findIndex(l => String(l.id) === String(val) || String(l.title).toLowerCase() === title.toLowerCase());
      if (exIdx !== -1) {
        existingLevels[exIdx].isDeleted = true;
      } else {
        existingLevels.push({ id: isNaN(Number(val)) ? val : Number(val), title: title, isDeleted: true });
      }

      const todayStr = new Date().toLocaleDateString('ko-KR');
      existingHistory.unshift({
        id: Date.now(),
        type: 'remove',
        title: title,
        detail: `"${title}" 레벨이 삭제되었습니다.`,
        time: todayStr
      });

      localStorage.setItem(storageKeyLevels, JSON.stringify(existingLevels));
      localStorage.setItem(storageKeyHistory, JSON.stringify(existingHistory));

      logDevConsole(`[레벨 삭제] "${title}" 레벨이 삭제되었습니다.`, '#ff4757');
      alert(`"${title}" 레벨이 삭제되었습니다.`);

      window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
      showMainControls();
    });
  }

  // 3. 기록 갱신 (클리어 추가) 처리
  function populateClearLevelDropdown() {
    const select = document.getElementById('dev-clear-level-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- 레벨 선택 --</option>';

    const levels = window.cachedLevelsData || [];
    levels.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      opt.value = String(lvl.id != null ? lvl.id : idx);
      opt.textContent = `#${idx + 1} ${lvl.title}`;
      select.appendChild(opt);
    });
  }

  const devClearSubmitBtn = document.getElementById('dev-clear-submit-btn');
  if (devClearSubmitBtn) {
    devClearSubmitBtn.addEventListener('click', () => {
      const levelVal = document.getElementById('dev-clear-level-select')?.value;
      const player = (document.getElementById('dev-clear-player')?.value || '').trim();
      const percent = parseInt(document.getElementById('dev-clear-percent')?.value || '100', 10);
      const date = (document.getElementById('dev-clear-date')?.value || new Date().toISOString().split('T')[0]).trim();
      const link = (document.getElementById('dev-clear-link')?.value || '').trim();

      if (!levelVal || !player) {
        alert('레벨과 플레이어 닉네임은 필수입니다.');
        return;
      }

      const mode = getCurrentPageMode();
      const storageKeyClears = `dev_custom_clears_${mode}`;
      const existingClears = JSON.parse(localStorage.getItem(storageKeyClears) || '{}');

      const levels = window.cachedLevelsData || [];
      const targetLvl = levels.find((l, i) => String(l.id != null ? l.id : i) === String(levelVal) || l.title === levelVal);
      const levelKey = targetLvl ? String(targetLvl.id != null ? targetLvl.id : targetLvl.title) : levelVal;

      if (!existingClears[levelKey]) existingClears[levelKey] = [];

      const newClearEntry = {
        player: player,
        name: player,
        percent: percent,
        date: date,
        link: link,
        video: link
      };

      const existingIdx = existingClears[levelKey].findIndex(c => String(c.player || c.name || c.user || '').toLowerCase() === player.toLowerCase());
      if (existingIdx !== -1) {
        existingClears[levelKey][existingIdx] = newClearEntry;
      } else {
        existingClears[levelKey].push(newClearEntry);
      }

      if (targetLvl && targetLvl.title && targetLvl.title !== levelKey) {
        existingClears[targetLvl.title] = existingClears[levelKey];
      }

      localStorage.setItem(storageKeyClears, JSON.stringify(existingClears));

      // 신기록 자동 뉴스 생성
      const lvlTitle = (targetLvl && targetLvl.title) ? targetLvl.title : levelVal;
      let newsContent;
      if (percent === 100) {
        newsContent = `${player}이(가) ${lvlTitle}을 클리어했습니다.`;
      } else {
        newsContent = `${player}이(가) ${lvlTitle}을(를) ${percent}% 달성했습니다.`;
      }
      window.addAutoForumNews(newsContent, date);

      logDevConsole(`[기록 갱신] "${player}" 님의 ${percent}% 클리어 기록이 갱신되었습니다.`, '#2ed573');
      alert(`"${player}" 님의 클리어 기록이 성공적으로 등록되었습니다!`);

      window.dispatchEvent(new CustomEvent('devDataUpdated', { detail: { mode } }));
      showMainControls();
    });
  }

  const shadow = document.querySelector('.shadow');
  if (shadow) {
    const updatePageHeight = () => {
      let contentBottom = 0;
      document.querySelectorAll('.box, [class^="box_"]').forEach((el) => {
        const bottom = el.getBoundingClientRect().bottom + window.scrollY;
        if (bottom > contentBottom) contentBottom = bottom;
      });
      const shadowHeight = shadow.getBoundingClientRect().height;
      document.body.style.minHeight = `${Math.max(contentBottom + shadowHeight, window.innerHeight)}px`;
    };

    updatePageHeight();
    window.addEventListener('resize', updatePageHeight);
    window.addEventListener('load', updatePageHeight);
  }

  // ==========================================
  // Mobile Bottom Sheet Gesture Engine
  // - Drag down handle or header to dismiss
  // - Overscroll down at top of sheet to dismiss
  // - Fast flick down detection
  // - Haptic vibration feedback
  // - Backdrop tap to close
  // ==========================================
  function initMobileBottomSheetGestures() {
    const isMobile = () => window.innerWidth <= 960;

    function setupSheet(sheetEl) {
      if (!sheetEl || sheetEl._hasGestureInit) return;
      sheetEl._hasGestureInit = true;

      const ensureHandleZone = () => {
        let handleZone = sheetEl.querySelector('.sheet-handle-zone');
        let handleBar = sheetEl.querySelector('.sheet-handle-bar');
        if (!handleZone && !handleBar) {
          handleZone = document.createElement('div');
          handleZone.className = 'sheet-handle-zone';
          handleBar = document.createElement('div');
          handleBar.className = 'sheet-handle-bar';
          handleZone.appendChild(handleBar);
          sheetEl.insertBefore(handleZone, sheetEl.firstChild);
        } else if (handleBar && !handleZone) {
          handleZone = document.createElement('div');
          handleZone.className = 'sheet-handle-zone';
          sheetEl.insertBefore(handleZone, handleBar);
          handleZone.appendChild(handleBar);
        }
      };

      ensureHandleZone();

      let startY = 0;
      let startX = 0;
      let currentY = 0;
      let startTime = 0;
      let isDragging = false;
      let canDragFromContent = false;
      let hasVibrated = false;

      const getCloseButton = () => {
        return sheetEl.querySelector('#detail-close-btn, #maps-detail-close, .detail-close-btn, .map-detail-close-btn');
      };

      const triggerClose = () => {
        sheetEl.classList.remove('is-dragging-sheet');
        sheetEl.style.setProperty('transition', 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)', 'important');
        sheetEl.style.setProperty('transform', 'translateY(110%)', 'important');

        setTimeout(() => {
          sheetEl.style.removeProperty('transform');
          sheetEl.style.removeProperty('transition');
          const closeBtn = getCloseButton();
          if (closeBtn) {
            closeBtn.click();
          } else {
            sheetEl.classList.remove('active');
            const bd = document.getElementById('detail-overlay-backdrop');
            if (bd) bd.classList.remove('active');
          }
        }, 260);
      };

      const resetPosition = () => {
        sheetEl.classList.remove('is-dragging-sheet');
        sheetEl.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)', 'important');
        sheetEl.style.setProperty('transform', 'translateY(0)', 'important');
        setTimeout(() => {
          sheetEl.style.removeProperty('transform');
          sheetEl.style.removeProperty('transition');
        }, 300);
      };

      const onTouchStart = (e) => {
        if (!isMobile()) return;
        if (!sheetEl.classList.contains('active')) return;
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        startY = touch.clientY;
        startX = touch.clientX;
        currentY = touch.clientY;
        startTime = Date.now();
        isDragging = false;
        hasVibrated = false;

        const target = e.target;
        const isHandle = target.closest('.sheet-handle-zone') || target.closest('.sheet-handle-bar');
        const isHeader = target.closest('.map-detail-header') || target.closest('.detail-header');
        const isInteractive = target.closest('button, a, input, select, iframe');

        if ((isHandle || isHeader) && !isInteractive) {
          canDragFromContent = true;
          isDragging = true;
          sheetEl.classList.add('is-dragging-sheet');
        } else if (sheetEl.scrollTop <= 2 && !isInteractive) {
          canDragFromContent = true;
        } else {
          canDragFromContent = false;
        }
      };

      const onTouchMove = (e) => {
        if (!isMobile() || !canDragFromContent) return;
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - startY;
        const deltaX = touch.clientX - startX;

        if (!isDragging) {
          // Detect downward intent vs horizontal intent
          if (deltaY > 6 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2 && sheetEl.scrollTop <= 1) {
            isDragging = true;
            sheetEl.classList.add('is-dragging-sheet');
          } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
            canDragFromContent = false;
            return;
          }
        }

        if (isDragging) {
          if (e.cancelable) e.preventDefault();
          currentY = touch.clientY;
          if (deltaY > 0) {
            sheetEl.style.setProperty('transform', `translateY(${deltaY}px)`, 'important');
            // Haptic vibration feedback once crossing threshold
            if (deltaY >= 80 && !hasVibrated) {
              hasVibrated = true;
              if (navigator.vibrate) {
                try { navigator.vibrate(12); } catch (_) {}
              }
            } else if (deltaY < 80) {
              hasVibrated = false;
            }
          } else {
            // Elastic upward dampening
            const damp = Math.min(25, -deltaY * 0.15);
            sheetEl.style.setProperty('transform', `translateY(-${damp}px)`, 'important');
          }
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) {
          canDragFromContent = false;
          return;
        }

        isDragging = false;
        canDragFromContent = false;

        const deltaY = currentY - startY;
        const elapsedTime = Math.max(1, Date.now() - startTime);
        const velocity = deltaY / elapsedTime;

        if (deltaY >= 80 || (velocity > 0.38 && deltaY > 30)) {
          triggerClose();
        } else {
          resetPosition();
        }
      };

      sheetEl.addEventListener('touchstart', onTouchStart, { passive: true });
      sheetEl.addEventListener('touchmove', onTouchMove, { passive: false });
      sheetEl.addEventListener('touchend', onTouchEnd, { passive: true });
      sheetEl.addEventListener('touchcancel', resetPosition, { passive: true });
    }

    const observeSheets = () => {
      const selectors = ['#maps-detail-container', '#classic-detail-container', '.maps-detail-box', '.classic-detail-box'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => setupSheet(el));
      });

      const observer = new MutationObserver(() => {
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(sheet => {
            if (sheet.classList.contains('active')) {
              let handleZone = sheet.querySelector('.sheet-handle-zone');
              let handleBar = sheet.querySelector('.sheet-handle-bar');
              if (!handleZone && !handleBar) {
                handleZone = document.createElement('div');
                handleZone.className = 'sheet-handle-zone';
                handleBar = document.createElement('div');
                handleBar.className = 'sheet-handle-bar';
                handleZone.appendChild(handleBar);
                sheet.insertBefore(handleZone, sheet.firstChild);
              } else if (handleBar && !handleZone) {
                handleZone = document.createElement('div');
                handleZone.className = 'sheet-handle-zone';
                sheet.insertBefore(handleZone, handleBar);
                handleZone.appendChild(handleBar);
              }
            }
            setupSheet(sheet);
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    };

    observeSheets();

    // Mobile Backdrop Instant Touch-to-Close
    document.addEventListener('touchstart', (e) => {
      if (!isMobile()) return;
      if (e.target && e.target.id === 'detail-overlay-backdrop') {
        e.preventDefault();
        const closeBtn = document.querySelector('#detail-close-btn, #maps-detail-close, .detail-close-btn, .map-detail-close-btn');
        if (closeBtn) {
          closeBtn.click();
        } else {
          e.target.classList.remove('active');
          document.querySelectorAll('.maps-detail-box.active, .classic-detail-box.active').forEach(s => s.classList.remove('active'));
        }
      }
    }, { passive: false });
  }

  initMobileBottomSheetGestures();
});

