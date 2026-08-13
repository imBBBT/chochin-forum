document.addEventListener('DOMContentLoaded', () => {
  const optionBtn = document.querySelector('.optionbutton');
  const optionMenu = document.querySelector('.optionmenu');

  const body = document.body; // body 요소 참조

  // 닉네임 관련 요소 및 로직
  const optionItems = document.querySelectorAll('.option-item');
  const accountItem = optionItems[0]; // 첫 번째 메뉴 아이템 (계정 선택)
  const bgSettingItem = optionItems[1]; // 두 번째 메뉴 아이템 (배경 설정)
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

  window.calculateAllPlayerPoints = async function() {
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

      const getLevels = (data, key) => {
        let levels = data.levels || [];
        const devData = localStorage.getItem(key);
        if (devData) {
          try {
            const parsed = JSON.parse(devData);
            if (Array.isArray(parsed) && parsed.length > 0) levels = parsed;
          } catch(e) {}
        }
        return levels;
      };

      return {
        classicLevels: getLevels(classicRes, 'dev_custom_levels_classic'),
        challengeLevels: getLevels(challengeRes, 'dev_custom_levels_challenge'),
        platformerLevels: getLevels(platformerRes, 'dev_custom_levels_platformer')
      };
    } catch (err) {
      console.error("Points calculation fetch error:", err);
      return { classicLevels: [], challengeLevels: [], platformerLevels: [] };
    }
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

  // 모달 오버레이 클릭 시 모달 닫기 (모달 박스 자체 클릭 제외)
  nicknameModalOverlay.addEventListener('click', (e) => {
    if (e.target === nicknameModalOverlay) {
      hideNicknameModal();
    }
  });

  bgModalOverlay.addEventListener('click', (e) => {
    if (e.target === bgModalOverlay) {
      revertBgToSaved();
    }
  });

  // Escape 키 누르면 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideNicknameModal();
      if (bgModalOverlay.classList.contains('active')) {
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

  // 메뉴 바깥 클릭 시 닫기
  window.addEventListener('click', (e) => {
    if (
      !optionBtn.contains(e.target) &&
      !optionMenu.contains(e.target) &&
      !nicknameModalOverlay.contains(e.target) &&
      !bgModalOverlay.contains(e.target)
    ) {
      optionMenu.classList.remove('active');
      body.classList.remove('menu-open'); // 메뉴 닫을 때 body에서 'menu-open' 클래스 제거
    }
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
          const updated = { ...removed, ...cust };
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
      const extraClears = customClears[key] || customClears[level.title];
      if (extraClears && Array.isArray(extraClears)) {
        const clearMap = new Map();
        (level.clears || []).forEach(c => clearMap.set(String(c.player || c.name || '').toLowerCase(), c));
        extraClears.forEach(c => clearMap.set(String(c.player || c.name || '').toLowerCase(), c));
        level.clears = Array.from(clearMap.values());
      }
      if (level.clears && Array.isArray(level.clears)) {
        level.clears.sort((a, b) => (b.percent || 100) - (a.percent || 100));
      }
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

  // 오버레이 배경 클릭 시 닫기
  if (devOverlay) {
    devOverlay.addEventListener('click', (e) => {
      if (e.target === devOverlay) closeDevModal();
    });
  }

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

  // 로그 초기화 버튼
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

  if (devLevelAddOpenBtn) {
    devLevelAddOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devLevelAddArea) devLevelAddArea.style.display = 'block';
    });
  }

  if (devLevelEditOpenBtn) {
    devLevelEditOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devLevelEditArea) devLevelEditArea.style.display = 'block';
      populateEditLevelDropdown();
    });
  }

  if (devClearAddOpenBtn) {
    devClearAddOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devClearAddArea) devClearAddArea.style.display = 'block';
      populateClearLevelDropdown();
    });
  }

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => {
      hideAllSubPanels();
      if (devSettingsArea) devSettingsArea.style.display = 'block';
    });
  }

  ['dev-add-back-btn', 'dev-edit-back-btn', 'dev-clear-back-btn', 'dev-settings-back-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', showMainControls);
  });

  function extractYoutubeId(urlOrId) {
    if (!urlOrId) return '';
    const str = urlOrId.trim();
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : str;
  }

  function getCurrentPageMode() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('challenge')) return 'challenge';
    if (path.includes('platformer')) return 'platformer';
    return 'classic';
  }

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
      const video = extractYoutubeId(document.getElementById('dev-add-video')?.value || '');
      const mapId = (document.getElementById('dev-add-mapid')?.value || '').trim();
      const length = document.getElementById('dev-add-length')?.value || 'Long';
      const objects = (document.getElementById('dev-add-objects')?.value || '').trim();
      const songName = (document.getElementById('dev-add-song-name')?.value || '').trim();
      const songArtist = (document.getElementById('dev-add-song-artist')?.value || '').trim();
      const desc = (document.getElementById('dev-add-desc')?.value || '').trim();
      const tagsStr = (document.getElementById('dev-add-tags')?.value || '').trim();

      if (!title || !creator) {
        alert('레벨 제목과 제작자는 필수 입력 항목입니다.');
        return;
      }

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : ['Cube'];
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
        map: {
          mapId: mapId,
          length: length,
          objects: objects
        },
        song: { name: songName, artist: songArtist },
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
        document.getElementById('dev-edit-length').value = lvl.map?.length || lvl.length || 'Long';
        document.getElementById('dev-edit-objects').value = lvl.map?.objects || lvl.objects || '';
        document.getElementById('dev-edit-song-name').value = lvl.song?.name || '';
        document.getElementById('dev-edit-song-artist').value = lvl.song?.artist || '';
        document.getElementById('dev-edit-desc').value = lvl.description || '';
        document.getElementById('dev-edit-tags').value = (lvl.tags || []).join(', ');
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
      const video = extractYoutubeId(document.getElementById('dev-edit-video')?.value || '');
      const mapId = (document.getElementById('dev-edit-mapid')?.value || '').trim();
      const length = document.getElementById('dev-edit-length')?.value || 'Long';
      const objects = (document.getElementById('dev-edit-objects')?.value || '').trim();
      const songName = (document.getElementById('dev-edit-song-name')?.value || '').trim();
      const songArtist = (document.getElementById('dev-edit-song-artist')?.value || '').trim();
      const desc = (document.getElementById('dev-edit-desc')?.value || '').trim();
      const tagsStr = (document.getElementById('dev-edit-tags')?.value || '').trim();

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

      const editedLevel = {
        id: isNaN(Number(val)) ? val : Number(val),
        title, creator, verifier, rating, video,
        mapId: mapId,
        length: length,
        objects: objects,
        map: {
          mapId: mapId,
          length: length,
          objects: objects
        },
        song: { name: songName, artist: songArtist },
        description: desc, tags, targetRank: newRank
      };

      const storageKeyLevels = `dev_custom_levels_${mode}`;
      const storageKeyHistory = `dev_custom_history_${mode}`;

      const existingLevels = JSON.parse(localStorage.getItem(storageKeyLevels) || '[]');
      const existingHistory = JSON.parse(localStorage.getItem(storageKeyHistory) || '[]');

      const exIdx = existingLevels.findIndex(l => String(l.id) === String(val) || String(l.title).toLowerCase() === title.toLowerCase());
      if (exIdx !== -1) {
        existingLevels[exIdx] = { ...existingLevels[exIdx], ...editedLevel };
      } else {
        existingLevels.push(editedLevel);
      }

      const levels = window.cachedLevelsData || [];
      const oldIdx = levels.findIndex((l, i) => String(l.id || i) === val);
      const oldRank = oldIdx !== -1 ? oldIdx + 1 : newRank;

      if (oldRank !== newRank) {
        const todayStr = new Date().toLocaleDateString('ko-KR');
        existingHistory.unshift({
          id: Date.now(),
          type: 'move',
          title: title,
          detail: `"${title}" 레벨 순위가 ${oldRank}위에서 ${newRank}위로 변경되었습니다.`,
          time: todayStr
        });
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
      opt.value = String(lvl.id || idx);
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

      if (!existingClears[levelVal]) existingClears[levelVal] = [];
      existingClears[levelVal].push({
        name: player,
        percent: percent,
        date: date,
        video: link
      });

      localStorage.setItem(storageKeyClears, JSON.stringify(existingClears));

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
