/* tools.js - 초친 포럼 도구 페이지 로직 */

document.addEventListener('DOMContentLoaded', async () => {
  let allData = {
    classic: [],
    challenge: [],
    platformer: []
  };

  // State for Map Picker
  let selectedPickerMode = 'classic';
  let selectedPickerRanges = new Set(['main', 'extended', 'legacy']);
  let isDrawingMap = false;

  // State for Roulette
  let rouletteAvailableMode = 'classic';
  let rouletteAvailableRanges = new Set(['main', 'extended', 'legacy']);
  let activeRouletteLevels = []; // Array of level objects in roulette
  let isSpinningRoulette = false;
  let lastSpinWinner = null;

  // Helper: YouTube URL/ID utilities
  function getYoutubeId(videoUrl) {
    if (!videoUrl) return '';
    const str = String(videoUrl).trim();
    if (/^[\w-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|embed\/|v=)([\w-]{11})/);
    if (match) return match[1];
    const loose = str.match(/([a-zA-Z0-9_-]{11})/);
    return loose ? loose[1] : '';
  }

  function getYoutubeThumbnail(videoUrl) {
    const id = getYoutubeId(videoUrl);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
  }

  function getUserNickname() {
    return (localStorage.getItem('forumNickname') || '').trim();
  }

  const ROULETTE_STORAGE_KEY = 'chochin_roulette_levels';

  function getLevelKey(level) {
    if (!level) return '';
    if (level.id) return String(level.id);
    return `${level.title || ''}__${level.creator || ''}`;
  }

  // Normalize array to unique items with count property
  function normalizeRouletteLevels(rawList) {
    if (!Array.isArray(rawList)) return [];
    const map = new Map();
    rawList.forEach(item => {
      if (!item) return;
      const key = getLevelKey(item);
      if (map.has(key)) {
        const existing = map.get(key);
        existing.count = (existing.count || 1) + (item.count || 1);
      } else {
        map.set(key, { ...item, count: item.count || 1 });
      }
    });
    return Array.from(map.values());
  }

  // Calculate real-time winning probability and total tickets
  function getRouletteStats() {
    const uniqueCount = activeRouletteLevels.length;
    const totalTickets = activeRouletteLevels.reduce((sum, l) => sum + Math.max(1, l.count || 1), 0);

    const probs = {};
    activeRouletteLevels.forEach(lvl => {
      const key = getLevelKey(lvl);
      const cnt = Math.max(1, lvl.count || 1);
      const percentNum = totalTickets > 0 ? (cnt / totalTickets) * 100 : 0;
      const percentStr = percentNum % 1 === 0 ? `${percentNum}%` : `${percentNum.toFixed(1)}%`;
      probs[key] = {
        count: cnt,
        percent: percentStr,
        percentNum,
        ratio: totalTickets > 0 ? cnt / totalTickets : 0
      };
    });

    return { uniqueCount, totalTickets, probs };
  }

  // Flatten active levels according to count for spinning engine & wheel slices
  function getFlattenedRoulettePool() {
    const flat = [];
    activeRouletteLevels.forEach(lvl => {
      const cnt = Math.max(1, lvl.count || 1);
      for (let i = 0; i < cnt; i++) {
        flat.push(lvl);
      }
    });
    return flat;
  }

  function saveRouletteLevels() {
    try {
      localStorage.setItem(ROULETTE_STORAGE_KEY, JSON.stringify(activeRouletteLevels));
    } catch (e) {
      console.error('Failed to save roulette levels to localStorage:', e);
    }
  }

  function loadSavedRouletteLevels() {
    try {
      const raw = localStorage.getItem(ROULETTE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return normalizeRouletteLevels(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load roulette levels from localStorage:', e);
    }
    return null;
  }

  function isLevelCleared(level, nickname) {
    if (!nickname) return false;
    const target = nickname.trim().toLowerCase();
    if (level.verifier && String(level.verifier).trim().toLowerCase() === target) {
      return true;
    }
    const clears = Array.isArray(level.clears) ? level.clears : [];
    return clears.some(c => {
      const p = (c.player || c.user || c.name || '').trim().toLowerCase();
      return p === target;
    });
  }

  function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btnElement.textContent;
      btnElement.textContent = '복사됨!';
      setTimeout(() => {
        btnElement.textContent = originalText;
      }, 1500);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  function escapeHtml(text) {
    const el = document.createElement('div');
    el.textContent = text ?? '';
    return el.innerHTML;
  }

  // Fetch JSON files & apply Developer Custom Data
  async function loadAllLevelsData() {
    const getJsonUrl = (file) => `level/${file}`;
    try {
      const [classicRes, challengeRes, platformerRes] = await Promise.all([
        fetch(getJsonUrl('classic.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
        fetch(getJsonUrl('challenge.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
        fetch(getJsonUrl('platformer.json')).then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] }))
      ]);

      const mergeData = (jsonLevels, jsonHistory, modeKey) => {
        if (window.applyDevCustomData) {
          return window.applyDevCustomData(jsonLevels, jsonHistory, modeKey);
        }
        return { levels: jsonLevels || [], history: jsonHistory || [] };
      };

      const classicMerged = mergeData(classicRes.levels, classicRes.history, 'classic');
      const challengeMerged = mergeData(challengeRes.levels, challengeRes.history, 'challenge');
      const platformerMerged = mergeData(platformerRes.levels, platformerRes.history, 'platformer');

      allData.classic = classicMerged.levels;
      allData.challenge = challengeMerged.levels;
      allData.platformer = platformerMerged.levels;

      // Restore active roulette levels from localStorage if exists, else default to top 10 classic levels
      const savedLevels = loadSavedRouletteLevels();
      if (savedLevels !== null) {
        activeRouletteLevels = savedLevels;
      } else if (allData.classic.length > 0) {
        activeRouletteLevels = allData.classic.slice(0, 10).map(l => ({ ...l, modeTag: 'classic' }));
        saveRouletteLevels();
      }
    } catch (err) {
      console.error('Failed to load level data for tools:', err);
    }
  }

  await loadAllLevelsData();

  // ----------------------------------------------------
  // 1. Tab Navigation logic
  // ----------------------------------------------------
  const tabBtns = document.querySelectorAll('.tools-tab-btn');
  const sections = document.querySelectorAll('.tool-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const targetSec = document.getElementById(`section-${targetTab}`);
      if (targetSec) targetSec.classList.add('active');

      if (targetTab === 'roulette') {
        renderRouletteAll();
      }
    });
  });

  // ----------------------------------------------------
  // 2. Map Picker (맵 뽑기) logic
  // ----------------------------------------------------
  const modeRadioBtns = document.querySelectorAll('.mode-radio-btn[data-mode]');
  const rangeChips = document.querySelectorAll('.range-chip[data-range]');
  const excludeToggle = document.getElementById('picker-exclude-cleared');
  const instantToggle = document.getElementById('picker-instant-draw');
  const drawBtn = document.getElementById('picker-draw-btn');

  const pickerPlaceholder = document.getElementById('picker-placeholder');
  const pickerTicker = document.getElementById('picker-ticker');
  const pickerTickerText = document.getElementById('picker-ticker-text');
  const pickerDrawnCard = document.getElementById('picker-drawn-card');

  // Category Selection
  modeRadioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeRadioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPickerMode = btn.dataset.mode;
    });
  });

  // Range Selection
  rangeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const r = chip.dataset.range;
      if (selectedPickerRanges.has(r)) {
        if (selectedPickerRanges.size === 1) {
          alert('최소 하나의 범위는 선택되어야 합니다.');
          return;
        }
        selectedPickerRanges.delete(r);
        chip.classList.remove('active');
        chip.textContent = chip.textContent.replace('✓ ', '');
      } else {
        selectedPickerRanges.add(r);
        chip.classList.add('active');
        if (!chip.textContent.startsWith('✓ ')) {
          chip.textContent = `✓ ${chip.textContent}`;
        }
      }
    });
  });

  // Get candidate levels based on filters
  function getCandidateLevels() {
    const rawList = allData[selectedPickerMode] || [];
    const nickname = getUserNickname();
    const excludeCleared = excludeToggle.checked;

    return rawList.filter((lvl, index) => {
      const rank = index + 1;

      // Range check
      let inRange = false;
      if (rank <= 10 && selectedPickerRanges.has('main')) inRange = true;
      else if (rank > 10 && rank <= 20 && selectedPickerRanges.has('extended')) inRange = true;
      else if (rank > 20 && selectedPickerRanges.has('legacy')) inRange = true;

      if (!inRange) return false;

      // Cleared check
      if (excludeCleared && isLevelCleared(lvl, nickname)) {
        return false;
      }

      return true;
    });
  }

  // Draw Button Click Handler with Animation
  drawBtn.addEventListener('click', () => {
    if (isDrawingMap) return;

    const candidates = getCandidateLevels();
    if (candidates.length === 0) {
      alert('설정한 조건에 해당하는 레벨이 없습니다.\n범위를 넓히거나 필터를 조정해주세요.');
      return;
    }

    isDrawingMap = true;
    drawBtn.disabled = true;

    // Pick final winner random candidate
    const winnerIndexInCandidates = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndexInCandidates];

    // Original overall index for ranking label
    const rawList = allData[selectedPickerMode] || [];
    const overallRank = rawList.findIndex(l => l.id === winner.id) + 1;

    const isInstant = instantToggle && instantToggle.checked;

    if (isInstant) {
      // Instant Draw: Immediate result display
      pickerPlaceholder.style.display = 'none';
      pickerTicker.classList.remove('active');

      renderDrawnCard(winner, overallRank, selectedPickerMode);
      pickerDrawnCard.style.display = 'flex';
      pickerDrawnCard.classList.add('active');

      isDrawingMap = false;
      drawBtn.disabled = false;
    } else {
      // Fast Shuffle Animation (~0.7s total)
      pickerPlaceholder.style.display = 'none';
      pickerDrawnCard.classList.remove('active');
      pickerDrawnCard.style.display = 'none';
      pickerTicker.classList.add('active');

      const allTitlesPool = candidates.map(c => c.title);
      let shuffleCount = 0;
      let delay = 30;
      const maxShuffles = 10;

      function stepShuffle() {
        if (shuffleCount >= maxShuffles) {
          // Finish Shuffle
          pickerTickerText.textContent = winner.title;
          pickerTickerText.style.transform = 'scale(1.1)';

          setTimeout(() => {
            pickerTicker.classList.remove('active');
            renderDrawnCard(winner, overallRank, selectedPickerMode);
            pickerDrawnCard.style.display = 'flex';
            pickerDrawnCard.classList.add('active');

            isDrawingMap = false;
            drawBtn.disabled = false;
          }, 150);
          return;
        }

        // Random title for shuffle tick
        const randomTitle = allTitlesPool[Math.floor(Math.random() * allTitlesPool.length)];
        pickerTickerText.textContent = randomTitle;
        pickerTickerText.style.transform = shuffleCount % 2 === 0 ? 'scale(1.03)' : 'scale(0.97)';

        shuffleCount++;
        delay += 4 + (shuffleCount * 2);
        setTimeout(stepShuffle, delay);
      }

      stepShuffle();
    }
  });

  // Render Drawn Level Card
  function renderDrawnCard(level, rank, mode) {
    const rankBadge = document.getElementById('drawn-rank-badge');
    const modeBadge = document.getElementById('drawn-mode-badge');
    const ratingBadge = document.getElementById('drawn-rating-badge');
    const clearBadge = document.getElementById('drawn-clear-status');

    const titleEl = document.getElementById('drawn-title');
    const creatorEl = document.getElementById('drawn-creator');
    const verifierEl = document.getElementById('drawn-verifier');
    const thumbEl = document.getElementById('drawn-thumb');
    const mapIdEl = document.getElementById('drawn-map-id');
    const copyBtn = document.getElementById('drawn-copy-id-btn');
    const songEl = document.getElementById('drawn-song-name');
    const lengthObjEl = document.getElementById('drawn-length-obj');
    const videoLink = document.getElementById('drawn-video-link');
    const goToLevelLink = document.getElementById('drawn-go-to-level');

    rankBadge.textContent = `#${rank}`;
    modeBadge.textContent = mode.toUpperCase();

    if (level.rating) {
      ratingBadge.textContent = String(level.rating).toUpperCase();
      ratingBadge.style.display = 'inline-block';
    } else {
      ratingBadge.style.display = 'none';
    }

    const nickname = getUserNickname();
    const cleared = isLevelCleared(level, nickname);
    clearBadge.style.display = cleared ? 'inline-block' : 'none';

    titleEl.textContent = level.title || '-';
    creatorEl.textContent = level.creator || '-';
    verifierEl.textContent = level.verifier || '-';

    const mapId = level.map?.mapId || level.mapId || '-';
    mapIdEl.textContent = mapId;

    copyBtn.onclick = () => {
      if (mapId !== '-') copyToClipboard(mapId, copyBtn);
    };

    const songName = level.song?.name
      ? `${level.song.name} (by ${level.song.artist || 'Unknown'})` + (level.song.id ? ` [ID: ${level.song.id}]` : '')
      : '-';
    songEl.textContent = songName;

    const lengthVal = window.formatLevelLength ? window.formatLevelLength(level.map?.length || level.length) : (level.map?.length || '-');
    const objectsVal = level.map?.objects || level.objects || '-';
    lengthObjEl.textContent = `${lengthVal} / ${objectsVal} 오브젝트`;

    const ytId = getYoutubeId(level.video);
    const thumbSrc = getYoutubeThumbnail(level.video);

    if (thumbSrc) {
      thumbEl.src = thumbSrc;
      thumbEl.style.display = 'block';
    } else {
      thumbEl.style.display = 'none';
    }

    if (ytId) {
      videoLink.href = `https://www.youtube.com/watch?v=${ytId}`;
      videoLink.style.display = 'inline-block';
    } else {
      videoLink.style.display = 'none';
    }

    if (goToLevelLink) {
      const pageMode = level.modeTag || mode || 'classic';
      goToLevelLink.href = `level/${pageMode}.html?id=${level.id || ''}&title=${encodeURIComponent(level.title || '')}`;
    }
  }

  // ----------------------------------------------------
  // 3. Chocin Roulette (초친 룰렛) logic
  // ----------------------------------------------------
  let currentRouletteType = 'reel'; // 'reel' or 'wheel'
  let wheelCurrentRotation = 0; // angle in radians

  const rTypeBtns = document.querySelectorAll('.roulette-type-btn');
  const reelWrapper = document.getElementById('roulette-reel-wrapper');
  const wheelWrapper = document.getElementById('roulette-wheel-wrapper');
  const rouletteCanvas = document.getElementById('roulette-canvas');

  const rModeBtns = document.querySelectorAll('.r-mode-btn');
  const rSearchInput = document.getElementById('roulette-search-input');
  const rAddAllBtn = document.getElementById('roulette-add-all-btn');
  const rAvailableListEl = document.getElementById('roulette-available-list');

  const rActiveListEl = document.getElementById('roulette-active-list');
  const rCountBadge = document.getElementById('roulette-count-badge');
  const rClearAllBtn = document.getElementById('roulette-clear-all-btn');

  const reelTrack = document.getElementById('roulette-reel-track');
  const spinBtn = document.getElementById('roulette-spin-btn');

  // Win Modal Elements
  const winModal = document.getElementById('roulette-win-modal');
  const winModalTitle = document.getElementById('win-modal-title');
  const winModalMeta = document.getElementById('win-modal-meta');
  const winModalDeleteBtn = document.getElementById('win-modal-delete-btn');
  const winModalCloseBtn = document.getElementById('win-modal-close-btn');

  // Roulette Type Switcher (Reel vs Wheel)
  rTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isSpinningRoulette) return;
      const type = btn.dataset.type;
      currentRouletteType = type;

      rTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (type === 'reel') {
        reelWrapper.classList.add('active');
        wheelWrapper.classList.remove('active');
        spinBtn.textContent = '룰렛 돌리기';
      } else {
        reelWrapper.classList.remove('active');
        wheelWrapper.classList.add('active');
        spinBtn.textContent = '룰렛 돌리기';
        renderCircularWheel(wheelCurrentRotation);
      }
    });
  });

  // Render Canvas Circular Wheel
  function renderCircularWheel(rotationAngle = 0) {
    if (!rouletteCanvas) return;
    const ctx = rouletteCanvas.getContext('2d');
    const width = rouletteCanvas.width;
    const height = rouletteCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = 200;
    const innerRadius = 38;

    ctx.clearRect(0, 0, width, height);

    const flattenedPool = getFlattenedRoulettePool();
    const levelsCount = flattenedPool.length;

    // Empty wheel state
    if (levelsCount === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 20, 25, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = 'bold 16px "Paperozi", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('룰렛에 레벨을 추가해주세요', centerX, centerY);
      ctx.restore();
      return;
    }

    const sliceColors = [
      '#ff4757', '#ffe600', '#2ed573', '#00d2ff', '#a855f7',
      '#ff7f50', '#1e90ff', '#e84393', '#00cec9', '#fdcb6e'
    ];

    const sliceAngle = (2 * Math.PI) / levelsCount;

    // Draw Slices
    flattenedPool.forEach((lvl, i) => {
      const startAngle = i * sliceAngle + rotationAngle;
      const endAngle = (i + 1) * sliceAngle + rotationAngle;
      const fillColor = sliceColors[i % sliceColors.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Border line between slices
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Draw Label inside slice
      ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      const textRadius = (outerRadius + innerRadius) * 0.58;
      const tx = centerX + Math.cos(midAngle) * textRadius;
      const ty = centerY + Math.sin(midAngle) * textRadius;

      ctx.translate(tx, ty);
      ctx.rotate(midAngle);

      // Contrast text color
      const isLightColor = fillColor === '#ffe600' || fillColor === '#2ed573' || fillColor === '#00d2ff' || fillColor === '#fdcb6e';
      ctx.fillStyle = isLightColor ? '#000000' : '#ffffff';

      let fontSize = 13;
      if (levelsCount > 16) fontSize = 9;
      else if (levelsCount > 10) fontSize = 11;

      ctx.font = `bold ${fontSize}px "Paperozi", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let displayTitle = lvl.title || 'Level';
      const maxChars = levelsCount > 16 ? 5 : (levelsCount > 10 ? 8 : 12);
      if (displayTitle.length > maxChars) {
        displayTitle = displayTitle.substring(0, maxChars - 1) + '…';
      }

      ctx.fillText(displayTitle, 0, 0);
      ctx.restore();
    });

    // Outer Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // Center Metallic Cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#121212';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffe600';
    ctx.stroke();
    ctx.restore();
  }

  function renderRouletteStage() {
    renderReelTrack();
    renderCircularWheel(wheelCurrentRotation);
  }

  const rRangeChips = document.querySelectorAll('.r-range-chip[data-rrange]');

  // Mode Selection in Roulette Picker
  rModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      rModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rouletteAvailableMode = btn.dataset.rmode;
      renderRouletteAvailableList();
    });
  });

  // Range Selection in Roulette Picker
  rRangeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const r = chip.dataset.rrange;
      if (rouletteAvailableRanges.has(r)) {
        if (rouletteAvailableRanges.size === 1) {
          alert('최소 하나의 범위는 선택되어야 합니다.');
          return;
        }
        rouletteAvailableRanges.delete(r);
        chip.classList.remove('active');
        chip.textContent = chip.textContent.replace('✓ ', '');
      } else {
        rouletteAvailableRanges.add(r);
        chip.classList.add('active');
        if (!chip.textContent.startsWith('✓ ')) {
          chip.textContent = `✓ ${chip.textContent}`;
        }
      }
      renderRouletteAvailableList();
    });
  });

  const handleRouletteSearch = window.debounce ? window.debounce(() => {
    renderRouletteAvailableList();
  }, 120) : () => renderRouletteAvailableList();

  rSearchInput.addEventListener('input', handleRouletteSearch);

  // Get filtered available levels
  function getFilteredAvailableLevels() {
    const rawList = allData[rouletteAvailableMode] || [];
    const query = (rSearchInput.value || '').trim().toLowerCase();

    return rawList.map((l, i) => ({ ...l, rankNum: i + 1, modeTag: rouletteAvailableMode })).filter(lvl => {
      const rank = lvl.rankNum;

      // Range check
      let inRange = false;
      if (rank <= 10 && rouletteAvailableRanges.has('main')) inRange = true;
      else if (rank > 10 && rank <= 20 && rouletteAvailableRanges.has('extended')) inRange = true;
      else if (rank > 20 && rouletteAvailableRanges.has('legacy')) inRange = true;

      if (!inRange) return false;

      if (!query) return true;
      const title = (lvl.title || '').toLowerCase();
      const creator = (lvl.creator || '').toLowerCase();
      return title.includes(query) || creator.includes(query);
    });
  }

  // Render Available Levels List
  function renderRouletteAvailableList() {
    const items = getFilteredAvailableLevels();
    rAvailableListEl.innerHTML = '';

    if (items.length === 0) {
      rAvailableListEl.innerHTML = `<div style="color:rgba(255,255,255,0.4); text-align:center; padding:1.5rem; font-family:'Paperozi';">검색 결과가 없습니다.</div>`;
      return;
    }

    items.forEach(lvl => {
      const itemEl = document.createElement('div');
      itemEl.className = 'mini-level-item';
      itemEl.innerHTML = `
        <div class="mini-item-info">
          <span class="mini-item-rank">#${lvl.rankNum}</span>
          <div class="mini-item-text-group">
            <span class="mini-item-title">${escapeHtml(lvl.title)}</span>
            <span class="mini-item-creator">by ${escapeHtml(lvl.creator)}</span>
          </div>
        </div>
        <button class="mini-btn mini-btn-add">추가 +</button>
      `;

      itemEl.querySelector('.mini-btn-add').addEventListener('click', () => {
        addLevelToRoulette(lvl);
      });

      rAvailableListEl.appendChild(itemEl);
    });
  }

  // Add Level to Active Pool (Increment count if already present)
  function addLevelToRoulette(level) {
    const key = getLevelKey(level);
    const existing = activeRouletteLevels.find(l => getLevelKey(l) === key);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      activeRouletteLevels.push({ ...level, count: 1 });
    }
    saveRouletteLevels();
    renderRouletteActivePool();
    renderRouletteStage();
  }

  // Change Level Quantity (+1 or -1)
  function changeLevelQuantity(key, delta) {
    const idx = activeRouletteLevels.findIndex(l => getLevelKey(l) === key);
    if (idx === -1) return;
    const item = activeRouletteLevels[idx];
    item.count = (item.count || 1) + delta;
    if (item.count <= 0) {
      activeRouletteLevels.splice(idx, 1);
    }
    saveRouletteLevels();
    renderRouletteActivePool();
    renderRouletteStage();
  }

  // Remove Level completely from Roulette
  function removeLevelFromRoulette(key) {
    const idx = activeRouletteLevels.findIndex(l => getLevelKey(l) === key);
    if (idx !== -1) {
      activeRouletteLevels.splice(idx, 1);
      saveRouletteLevels();
      renderRouletteActivePool();
      renderRouletteStage();
    }
  }

  // Add All Filtered Levels
  rAddAllBtn.addEventListener('click', () => {
    const items = getFilteredAvailableLevels();
    if (items.length === 0) return;
    items.forEach(lvl => {
      const key = getLevelKey(lvl);
      const existing = activeRouletteLevels.find(l => getLevelKey(l) === key);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
      } else {
        activeRouletteLevels.push({ ...lvl, count: 1 });
      }
    });
    saveRouletteLevels();
    renderRouletteActivePool();
    renderRouletteStage();
  });

  // Clear All Levels
  rClearAllBtn.addEventListener('click', () => {
    activeRouletteLevels = [];
    saveRouletteLevels();
    renderRouletteActivePool();
    renderRouletteStage();
  });

  // Render Active Pool List with Quantity Controls and Probabilities
  function renderRouletteActivePool() {
    rActiveListEl.innerHTML = '';
    const stats = getRouletteStats();

    if (stats.totalTickets === 0) {
      rCountBadge.textContent = '0개 레벨';
      rActiveListEl.innerHTML = `<div style="color:rgba(255,255,255,0.4); text-align:center; padding:1.5rem; font-family:'Paperozi';">룰렛이 비어 있습니다. 왼쪽에서 레벨을 추가해주세요.</div>`;
      return;
    }

    rCountBadge.textContent = stats.totalTickets > stats.uniqueCount
      ? `${stats.uniqueCount}종류 (${stats.totalTickets}개)`
      : `${stats.totalTickets}개 레벨`;

    activeRouletteLevels.forEach((lvl, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'mini-level-item';

      const key = getLevelKey(lvl);
      const probInfo = stats.probs[key] || { count: 1, percent: '100%' };

      itemEl.innerHTML = `
        <div class="mini-item-info">
          <span class="mini-item-rank">#${lvl.rankNum || idx + 1}</span>
          <div class="mini-item-text-group">
            <span class="mini-item-title">${escapeHtml(lvl.title)}</span>
            <span class="mini-item-creator">by ${escapeHtml(lvl.creator)}</span>
          </div>
        </div>
        <div class="mini-item-right-actions">
          <div class="qty-control-group">
            <button class="qty-btn qty-minus" title="수량 1개 감소">−</button>
            <span class="qty-value-badge" title="룰렛에 포함된 수량 (가중치)">${probInfo.count}개</span>
            <button class="qty-btn qty-plus" title="수량 1개 추가">+</button>
          </div>
          <span class="mini-item-prob-badge" title="당첨 확률: ${probInfo.percent} (${probInfo.count}/${stats.totalTickets}개)">${probInfo.percent}</span>
          <button class="mini-btn mini-btn-remove" title="룰렛에서 완전 삭제">삭제 ✕</button>
        </div>
      `;

      itemEl.querySelector('.qty-minus').addEventListener('click', () => {
        changeLevelQuantity(key, -1);
      });

      itemEl.querySelector('.qty-plus').addEventListener('click', () => {
        changeLevelQuantity(key, 1);
      });

      itemEl.querySelector('.mini-btn-remove').addEventListener('click', () => {
        removeLevelFromRoulette(key);
      });

      rActiveListEl.appendChild(itemEl);
    });
  }

  // Render Horizontal Reel Track
  function renderReelTrack(highlightIndex = -1) {
    reelTrack.innerHTML = '';
    const flattenedPool = getFlattenedRoulettePool();

    if (flattenedPool.length === 0) {
      reelTrack.style.transform = 'translateX(0px)';
      reelTrack.innerHTML = `<div style="color:rgba(255,255,255,0.3); font-family:'Paperozi'; font-size:1.1rem; padding:2rem; width:100%; text-align:center;">룰렛에 레벨을 추가해주세요</div>`;
      return;
    }

    const stats = getRouletteStats();

    // Duplicate levels to create a long spinning belt (minimum 60 items)
    let displaySequence = [];
    const targetLength = Math.max(70, flattenedPool.length * 6);

    while (displaySequence.length < targetLength) {
      displaySequence = displaySequence.concat(flattenedPool);
    }

    displaySequence.forEach((lvl, i) => {
      const card = document.createElement('div');
      card.className = 'reel-item';
      if (i === highlightIndex) {
        card.style.borderColor = '#ffe600';
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = '0 0 20px rgba(255, 230, 0, 0.6)';
      }
      const key = getLevelKey(lvl);
      const probInfo = stats.probs[key] || { percent: '' };
      card.innerHTML = `
        <div class="reel-item-header">
          <span class="reel-item-rank">#${lvl.rankNum || (i % flattenedPool.length) + 1}</span>
          <span class="reel-item-prob-tag">${probInfo.percent}</span>
        </div>
        <span class="reel-item-title">${escapeHtml(lvl.title)}</span>
        <span class="reel-item-creator">by ${escapeHtml(lvl.creator)}</span>
      `;
      reelTrack.appendChild(card);
    });
  }

  // Spin Roulette Engine
  spinBtn.addEventListener('click', () => {
    if (isSpinningRoulette) return;

    const flattenedPool = getFlattenedRoulettePool();
    if (flattenedPool.length === 0) {
      alert('룰렛에 1개 이상의 레벨을 추가해주세요!');
      return;
    }

    isSpinningRoulette = true;
    spinBtn.disabled = true;

    // Pick random winner from flattened pool (respects weights/counts)
    const winPoolIdx = Math.floor(Math.random() * flattenedPool.length);
    const winner = flattenedPool[winPoolIdx];
    lastSpinWinner = winner;

    if (currentRouletteType === 'wheel') {
      // --- Circular Wheel Spin Engine ---
      const poolLen = flattenedPool.length;
      const sliceAngle = (2 * Math.PI) / poolLen;
      const winSliceCenter = (winPoolIdx + 0.5) * sliceAngle;
      const jitter = (Math.random() - 0.5) * sliceAngle * 0.5;

      let targetRotation = (1.5 * Math.PI) - (winSliceCenter + jitter);
      const minSpins = 6;
      while (targetRotation < wheelCurrentRotation + Math.PI * 2 * minSpins) {
        targetRotation += Math.PI * 2;
      }

      const startRotation = wheelCurrentRotation;
      const totalDistance = targetRotation - startRotation;
      const duration = 4500;
      const startTime = performance.now();

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function animateWheel(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutCubic(progress);

        wheelCurrentRotation = startRotation + totalDistance * easeProgress;
        renderCircularWheel(wheelCurrentRotation);

        if (progress < 1) {
          requestAnimationFrame(animateWheel);
        } else {
          setTimeout(() => {
            showWinModal(winner);
            isSpinningRoulette = false;
            spinBtn.disabled = false;
          }, 400);
        }
      }

      requestAnimationFrame(animateWheel);

    } else {
      // --- Horizontal Slot Reel Spin Engine ---
      const poolLen = flattenedPool.length;
      const minPassItems = 50;
      const repeatCount = Math.max(6, Math.ceil(minPassItems / poolLen));
      const targetIndex = (repeatCount * poolLen) + winPoolIdx;

      let displaySequence = [];
      const totalSequenceLength = targetIndex + poolLen * 3;
      while (displaySequence.length < totalSequenceLength) {
        displaySequence = displaySequence.concat(flattenedPool);
      }

      const stats = getRouletteStats();

      reelTrack.innerHTML = '';
      displaySequence.forEach((lvl, i) => {
        const card = document.createElement('div');
        card.className = 'reel-item';
        const key = getLevelKey(lvl);
        const probInfo = stats.probs[key] || { percent: '' };
        card.innerHTML = `
          <div class="reel-item-header">
            <span class="reel-item-rank">#${lvl.rankNum || (lvl.rank ? String(lvl.rank).replace('#', '') : '') || ((i % poolLen) + 1)}</span>
            <span class="reel-item-prob-tag">${probInfo.percent}</span>
          </div>
          <span class="reel-item-title">${escapeHtml(lvl.title)}</span>
          <span class="reel-item-creator">by ${escapeHtml(lvl.creator)}</span>
        `;
        reelTrack.appendChild(card);
      });

      const viewport = document.querySelector('.reel-viewport');
      const viewportWidth = viewport ? viewport.offsetWidth : 800;
      const cardWidth = 170;
      const cardMargin = 10;
      const cardPitch = cardWidth + cardMargin; // 180px

      const targetCardCenter = (targetIndex * cardPitch) + (cardWidth / 2);
      const targetX = targetCardCenter - (viewportWidth / 2);

      const startTime = performance.now();
      const duration = 4500;

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function animateReel(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutCubic(progress);

        const currentX = targetX * easeProgress;
        reelTrack.style.transform = `translateX(-${currentX}px)`;

        if (progress < 1) {
          requestAnimationFrame(animateReel);
        } else {
          const winnerCard = reelTrack.children[targetIndex];
          if (winnerCard) {
            winnerCard.style.borderColor = '#ffe600';
            winnerCard.style.transform = 'scale(1.08)';
            winnerCard.style.boxShadow = '0 0 30px rgba(255, 230, 0, 0.85)';
          }

          setTimeout(() => {
            showWinModal(winner);
            isSpinningRoulette = false;
            spinBtn.disabled = false;
          }, 400);
        }
      }

      requestAnimationFrame(animateReel);
    }
  });

  const winModalGoBtn = document.getElementById('win-modal-go-btn');

  // Win Modal Handler
  function showWinModal(winner) {
    winModalTitle.textContent = winner.title || 'Unknown';
    winModalMeta.textContent = `제작자: ${winner.creator || '-'} | 베리파이어: ${winner.verifier || '-'}`;

    if (winModalGoBtn) {
      const winMode = winner.modeTag || rouletteAvailableMode || 'classic';
      winModalGoBtn.onclick = () => {
        window.location.href = `level/${winMode}.html?id=${winner.id || ''}&title=${encodeURIComponent(winner.title || '')}`;
      };
    }

    winModal.classList.add('active');
  }

  function hideWinModal() {
    winModal.classList.remove('active');
  }

  winModalDeleteBtn.addEventListener('click', () => {
    if (lastSpinWinner) {
      const key = getLevelKey(lastSpinWinner);
      changeLevelQuantity(key, -1);
    }
    hideWinModal();
  });

  winModalCloseBtn.addEventListener('click', hideWinModal);
  
  let isWinModalMouseDownOnOverlay = false;
  winModal.addEventListener('mousedown', (e) => {
    isWinModalMouseDownOnOverlay = (e.target === winModal);
  });
  winModal.addEventListener('click', (e) => {
    if (e.target === winModal && isWinModalMouseDownOnOverlay) {
      hideWinModal();
    }
    isWinModalMouseDownOnOverlay = false;
  });

  function renderRouletteAll() {
    renderRouletteAvailableList();
    renderRouletteActivePool();
    renderRouletteStage();
  }

  // Initial render
  renderRouletteAll();
});
