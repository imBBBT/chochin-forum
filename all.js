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

window.escapeHtml = function(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

window.debounce = function(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

window.showForumToast = function(message) {
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

window.toggleLowSpecMode = function() {
  const LOW_SPEC_KEY = 'chochin_low_spec_mode';
  const isCurrentlyLow = document.documentElement.classList.contains('low-spec-mode');
  const newState = !isCurrentlyLow;

  if (newState) {
    document.documentElement.classList.add('low-spec-mode');
    localStorage.setItem(LOW_SPEC_KEY, 'true');
    window.showForumToast('⚡ 저사양 최적화 모드: 켜짐 (렉 감소)');
  } else {
    document.documentElement.classList.remove('low-spec-mode');
    localStorage.setItem(LOW_SPEC_KEY, 'false');
    window.showForumToast('⚡ 저사양 최적화 모드: 꺼짐 (고화질)');
  }

  if (window.updateLowSpecButtonText) {
    window.updateLowSpecButtonText();
  }
  window.dispatchEvent(new CustomEvent('forumLowSpecModeChanged', { detail: { enabled: newState } }));
};

window.updateLowSpecButtonText = function() {
  const isLow = document.documentElement.classList.contains('low-spec-mode');
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

  window.debounce = function(fn, wait = 150) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  window.getBasePoints = function(rankIndex) {
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

  window.calcPlayerLevelPoints = function(level, rankIndex, playerNickname) {
    if (!playerNickname) return 0;
    const target = playerNickname.trim().toLowerCase();
    const base = window.getBasePoints(rankIndex);

    const verifier = (level.verifier || '').trim().toLowerCase();
    const clears = Array.isArray(level.clears) ? level.clears : [];

    if (verifier && verifier === target) {
      return base * 1.5;
    }

    if (clears.length > 0) {
      const firstClearer = (clears[0].player || clears[0].user || '').trim().toLowerCase();
      if (firstClearer === target) {
        return base * 1.3;
      }
      const isClearer = clears.some(c => {
        const p = (c.player || c.user || '').trim().toLowerCase();
        return p === target;
      });
      if (isClearer) {
        return base * 1.0;
      }
    }

    return 0;
  };

  let _pointsDataPromise = null;
  let _cachedPointsResult = null;

  window.invalidatePointsCache = function() {
    _cachedPointsResult = null;
    _pointsDataPromise = null;
  };

  window.calculateAllPlayerPoints = async function(forceRefresh = false) {
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

  const updateNicknameDisplay = async (name) => {
    if (!headerNicknameDisplay) return;
    if (!name) {
      headerNicknameDisplay.textContent = '';
      return;
    }
    headerNicknameDisplay.innerHTML = `<span class="nick-name-text">${name}</span>`;

    const { classicLevels, challengeLevels, platformerLevels } = await window.calculateAllPlayerPoints();

    let total = 0;
    classicLevels.forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, name);
    });
    challengeLevels.forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, name);
    });
    platformerLevels.forEach((lvl, idx) => {
      total += window.calcPlayerLevelPoints(lvl, idx + 1, name);
    });

    const formattedPt = Math.round(total).toLocaleString();
    headerNicknameDisplay.innerHTML = `<span class="nick-name-text">${name}</span> <span class="header-user-pt-badge">${formattedPt} PT</span>`;
  };

  // 초기 로드 시 저장된 닉네임 확인
  const showNicknameModal = () => {
    nicknameModalOverlay.classList.add('active');
    const currentNickname = localStorage.getItem('forumNickname');
    nicknameInput.value = currentNickname || '';
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
      updateNicknameDisplay(name);
      window.dispatchEvent(new CustomEvent('forumNicknameChanged', { detail: { nickname: name } }));
      hideNicknameModal();
    } else {
      alert('닉네임을 입력해주세요.'); // 사용자에게 닉네임 입력 요청
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

  // 모달 오버레이 안전 닫기 바인딩
  attachSafeOverlayClose(nicknameModalOverlay, hideNicknameModal);
  attachSafeOverlayClose(bgModalOverlay, revertBgToSaved);

  // Escape 키 누르면 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideNicknameModal();
      if (bgModalOverlay && bgModalOverlay.classList.contains('active')) {
        revertBgToSaved();
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
      !(bgModalOverlay && bgModalOverlay.contains(e.target))
    );
  });

  window.addEventListener('click', (e) => {
    if (
      isMouseDownOutsideMenu &&
      !optionBtn.contains(e.target) &&
      !optionMenu.contains(e.target) &&
      !(nicknameModalOverlay && nicknameModalOverlay.contains(e.target)) &&
      !(bgModalOverlay && bgModalOverlay.contains(e.target))
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

window.formatLevelLength = function(rawLength) {
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

window.addAutoForumNews = async function(content, customDate) {
  try {
    const today = customDate || new Date().toISOString().split('T')[0];
    const newEntry = { date: today, content: content };

    let newsList = [];
    const customRaw = localStorage.getItem('dev_custom_news');
    if (customRaw) {
      try {
        const parsed = JSON.parse(customRaw);
        if (Array.isArray(parsed)) newsList = parsed;
      } catch (e) {}
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
      } catch (e) {}
    }

    newsList.unshift(newEntry);
    localStorage.setItem('dev_custom_news', JSON.stringify(newsList));
    console.log('[Auto Forum News Added]', newEntry);
  } catch (err) {
    console.warn('Failed to add auto forum news:', err);
  }
};

window.applyDevCustomData = function(jsonLevels, jsonHistory, modeKey) {
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

  const showMainControls = () => {
    hideAllSubPanels();
    if (devMainControls) devMainControls.style.display = 'block';
  };

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`https://gdbrowser.com/api/level/${cleanId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          throw new Error('GD 서버에서 해당 맵 ID를 찾을 수 없습니다.');
        }
        throw new Error(`GD API 응답 오류 (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (!data || data.id === '-1' || !data.name) {
        throw new Error('해당 레벨의 정보를 찾을 수 없습니다.');
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
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('GD 서버 응답 시간이 초과되었습니다.');
      }
      throw err;
    }
  }
  window.fetchGdLevelData = fetchGdLevelData;

  // ⚡ Auto-Fetch GD Info Handlers for Dev Panel
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
});
