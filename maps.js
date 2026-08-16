document.addEventListener('DOMContentLoaded', () => {
  let allPacks = [];
  let allLevelsData = [];
  let currentTier = 'all';
  let searchQuery = '';
  let selectedPackId = null;

  const mapsListContainer = document.getElementById('maps-list-container');
  const mapsListBody = document.getElementById('maps-list-body');
  const mapsDetailContainer = document.getElementById('maps-detail-container');
  const mapsTotalBadge = document.getElementById('maps-total-badge');
  const mapsSearchInput = document.getElementById('maps-search-input');
  const mapsSearchClear = document.getElementById('maps-search-clear');
  const tierTabs = document.querySelectorAll('.maps-tier-tab');

  // --- 1. Level Database & Matching Logic ---
  const fetchLevelsData = async () => {
    try {
      if (typeof window.calculateAllPlayerPoints === 'function') {
        const { classicLevels, challengeLevels, platformerLevels } = await window.calculateAllPlayerPoints(true);
        allLevelsData = [
          ...(classicLevels || []).map(l => ({ ...l, _mode: 'classic' })),
          ...(challengeLevels || []).map(l => ({ ...l, _mode: 'challenge' })),
          ...(platformerLevels || []).map(l => ({ ...l, _mode: 'platformer' }))
        ];
      } else {
        const [classicRes, challengeRes, platformerRes] = await Promise.all([
          fetch('level/classic.json').then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
          fetch('level/challenge.json').then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] })),
          fetch('level/platformer.json').then(r => r.ok ? r.json() : { levels: [] }).catch(() => ({ levels: [] }))
        ]);

        const getLevels = (data, mode) => {
          if (window.applyDevCustomData) {
            return window.applyDevCustomData(data.levels ?? [], data.history ?? [], mode).levels;
          }
          return data.levels || [];
        };

        allLevelsData = [
          ...getLevels(classicRes, 'classic').map(l => ({ ...l, _mode: 'classic' })),
          ...getLevels(challengeRes, 'challenge').map(l => ({ ...l, _mode: 'challenge' })),
          ...getLevels(platformerRes, 'platformer').map(l => ({ ...l, _mode: 'platformer' }))
        ];
      }
    } catch (e) {
      console.error("Failed to load levels data for map packs:", e);
      allLevelsData = [];
    }
  };

  const normalizeLevelTitle = (str) => {
    return String(str || '').trim().toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  };

  const findLevelInDatabase = (packLvl) => {
    if (!packLvl || !allLevelsData || allLevelsData.length === 0) return null;

    let rawName = '';
    let rawAuthor = '';
    let rawId = null;

    if (typeof packLvl === 'string') {
      rawName = packLvl.trim();
    } else if (typeof packLvl === 'object') {
      rawName = (packLvl.name || packLvl.title || '').trim();
      rawAuthor = (packLvl.author || packLvl.creator || '').trim();
      rawId = packLvl.id || packLvl.mapId || null;
    }

    // 1. Match by ID if present
    if (rawId != null) {
      const byId = allLevelsData.find(l => 
        String(l.id) === String(rawId) || 
        String(l.map?.mapId) === String(rawId) || 
        String(l.mapId) === String(rawId)
      );
      if (byId) return byId;
    }

    // 2. Match by normalized title
    const norm = normalizeLevelTitle(rawName);
    let match = allLevelsData.find(l => normalizeLevelTitle(l.title) === norm);

    // 3. Known aliases or special naming variations
    if (!match) {
      if (norm === 'yaahangenegaji') {
        match = allLevelsData.find(l => normalizeLevelTitle(l.title) === 'yaahange4gaji');
      }
    }

    // 4. Author tie-break / fuzzy fallback
    if (!match && rawAuthor) {
      const normAuthor = normalizeLevelTitle(rawAuthor);
      match = allLevelsData.find(l => {
        const titleNorm = normalizeLevelTitle(l.title);
        const matchTitle = titleNorm.includes(norm) || norm.includes(titleNorm);
        const creatorNorm = normalizeLevelTitle(l.creator);
        const verifierNorm = normalizeLevelTitle(l.verifier);
        const matchAuth = creatorNorm.includes(normAuthor) || verifierNorm.includes(normAuthor);
        return matchTitle && matchAuth;
      });
    }

    return match || null;
  };

  const isPlayerCompletedLevel = (level, playerNickname) => {
    if (!level || !playerNickname) return { completed: false };
    const target = String(playerNickname).trim().toLowerCase();
    if (!target) return { completed: false };

    // Check verifier (100% complete)
    const verifier = (level.verifier || '').trim().toLowerCase();
    if (verifier && verifier !== '-' && verifier === target) {
      return {
        completed: true,
        role: 'verifier',
        date: level.uploadDate || level.map?.uploadDate || ''
      };
    }

    // Check 100% clears
    const clears = Array.isArray(level.clears) ? level.clears : [];
    for (const c of clears) {
      const isFull = c.percent == null || Number(c.percent) >= 100;
      if (isFull) {
        const p = (c.player || c.user || c.name || '').trim().toLowerCase();
        if (p === target) {
          return {
            completed: true,
            role: 'clearer',
            date: c.date || ''
          };
        }
      }
    }

    return { completed: false };
  };

  const getLevelVictorsMap = (level) => {
    const victors = new Map(); // playerKey -> { player, date, isVerifier, isClearer }
    if (!level) return victors;

    // Verifier
    const verifier = (level.verifier || '').trim();
    if (verifier && verifier !== '-') {
      const vKey = verifier.toLowerCase();
      const vDate = level.uploadDate || level.map?.uploadDate || '';
      victors.set(vKey, {
        player: verifier,
        date: vDate,
        isVerifier: true,
        isClearer: false
      });
    }

    // 100% Clears
    const clears = Array.isArray(level.clears) ? level.clears : [];
    clears.forEach(c => {
      const isFull = c.percent == null || Number(c.percent) >= 100;
      if (isFull) {
        const pName = (c.player || c.user || c.name || '').trim();
        if (pName) {
          const pKey = pName.toLowerCase();
          const existing = victors.get(pKey);
          const cDate = c.date || '';
          if (existing) {
            existing.isClearer = true;
            if (cDate && (!existing.date || cDate > existing.date)) {
              existing.date = cDate;
            }
          } else {
            victors.set(pKey, {
              player: pName,
              date: cDate,
              isVerifier: false,
              isClearer: true
            });
          }
        }
      }
    });

    return victors;
  };

  // Computes combined clears (manual clears in JSON + automatic clears from all levels in pack)
  const getPackCombinedClears = (pack) => {
    if (!pack) return [];
    const levels = Array.isArray(pack.levels) ? pack.levels : [];
    const autoClearPlayers = [];

    if (levels.length > 0 && allLevelsData.length > 0) {
      const matchedLevels = levels.map(findLevelInDatabase);
      const validLevels = matchedLevels.filter(Boolean);

      // If all levels in the pack are identified in the database
      if (validLevels.length === levels.length) {
        const victorsList = validLevels.map(getLevelVictorsMap);
        const firstLevelVictors = victorsList[0];

        firstLevelVictors.forEach((info, playerKey) => {
          let clearedAll = true;
          let latestDate = info.date || '';
          let canonicalName = info.player || '';

          for (let i = 1; i < victorsList.length; i++) {
            const vMap = victorsList[i];
            if (!vMap.has(playerKey)) {
              clearedAll = false;
              break;
            }
            const lvlInfo = vMap.get(playerKey);
            if (lvlInfo.date && (!latestDate || lvlInfo.date > latestDate)) {
              latestDate = lvlInfo.date;
            }
            if (!canonicalName && lvlInfo.player) {
              canonicalName = lvlInfo.player;
            }
          }

          if (clearedAll) {
            autoClearPlayers.push({
              player: canonicalName,
              date: latestDate || '',
              isAuto: true
            });
          }
        });
      }
    }

    // Merge manual clears with auto-calculated clears
    const manualClears = Array.isArray(pack.clears) ? pack.clears : [];
    const mergedClears = [];
    const seenPlayerKeys = new Set();

    manualClears.forEach(c => {
      const pName = (c.player || c.name || '').trim();
      if (pName) {
        const pKey = pName.toLowerCase();
        seenPlayerKeys.add(pKey);
        mergedClears.push({
          player: pName,
          date: c.date || '',
          isAuto: false
        });
      }
    });

    autoClearPlayers.forEach(auto => {
      const pKey = (auto.player || '').toLowerCase();
      if (seenPlayerKeys.has(pKey)) {
        // If already in manual clears, backfill date if empty
        const existing = mergedClears.find(m => m.player.toLowerCase() === pKey);
        if (existing && !existing.date && auto.date) {
          existing.date = auto.date;
        }
      } else {
        seenPlayerKeys.add(pKey);
        mergedClears.push(auto);
      }
    });

    return mergedClears;
  };

  // --- 2. Fetch mappack.json & Initialize ---
  const fetchMapPacks = async () => {
    try {
      await fetchLevelsData();

      const response = await fetch('mappack.json');
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      allPacks = data.packs || [];

      // Check LocalStorage override if dev tools custom packs exist
      const devCustomPacks = localStorage.getItem('dev_custom_mappacks');
      if (devCustomPacks) {
        try {
          const customPacks = JSON.parse(devCustomPacks);
          if (Array.isArray(customPacks) && customPacks.length > 0) {
            allPacks = customPacks;
          }
        } catch (e) {
          console.warn("Dev custom mappacks parse error:", e);
        }
      }

      renderPacksList();

      // If a pack was already selected, refresh detail view
      if (selectedPackId) {
        const currentPack = allPacks.find(p => String(p.id) === String(selectedPackId));
        if (currentPack) {
          selectPack(currentPack);
        }
      }
    } catch (err) {
      console.error("Failed to load mappack.json:", err);
      if (mapsListBody) {
        mapsListBody.innerHTML = '<div class="map-clears-empty">맵 팩 데이터를 불러오는 데 실패했습니다.</div>';
      }
    }
  };

  const parseTierNum = (tierStr) => {
    const match = (tierStr || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  };

  const getUserNickname = () => {
    return (localStorage.getItem('forumNickname') || '').trim();
  };

  const isPackClearedByUser = (pack) => {
    const user = getUserNickname();
    if (!user) return false;
    const userLower = user.toLowerCase();
    const clears = getPackCombinedClears(pack);
    return clears.some(c => 
      c.player && String(c.player).trim().toLowerCase() === userLower
    );
  };

  // --- 3. Filter & Render List ---
  const renderPacksList = () => {
    if (!mapsListBody) return;

    const filtered = allPacks.filter(pack => {
      // Tier filter
      if (currentTier !== 'all' && pack.tier !== currentTier) {
        return false;
      }
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (pack.title || '').toLowerCase().includes(q);
        const descMatch = (pack.description || '').toLowerCase().includes(q);
        const levelMatch = (pack.levels || []).some(l => {
          const name = typeof l === 'string' ? l : (l.name || l.title || '');
          const author = typeof l === 'object' ? (l.author || l.creator || '') : '';
          return name.toLowerCase().includes(q) || author.toLowerCase().includes(q);
        });
        if (!titleMatch && !descMatch && !levelMatch) return false;
      }
      return true;
    });

    // 맵 팩 정렬: 1차 티어 오름차순 (Tier 1 -> Tier 6), 2차 동일 티어 내 제목 기준 ABC / 가나다 오름차순
    filtered.sort((a, b) => {
      const tierA = parseTierNum(a.tier);
      const tierB = parseTierNum(b.tier);
      if (tierA !== tierB) return tierA - tierB;

      const titleA = (a.title || '').trim();
      const titleB = (b.title || '').trim();
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base', numeric: true });
    });

    // Update badge count
    if (mapsTotalBadge) {
      mapsTotalBadge.textContent = `TOTAL ${filtered.length} PACKS`;
    }

    mapsListBody.innerHTML = '';

    if (filtered.length === 0) {
      mapsListBody.innerHTML = '<div class="map-clears-empty">검색 조건에 맞는 맵 팩이 없습니다.</div>';
      return;
    }

    const esc = window.escapeHtml || (s => s == null ? '' : String(s));
    const fragment = document.createDocumentFragment();

    filtered.forEach(pack => {
      const card = document.createElement('div');
      const combinedClears = getPackCombinedClears(pack);
      const isUserCleared = isPackClearedByUser(pack);
      const clearedClass = isUserCleared ? 'card-cleared' : '';
      card.className = `map-pack-card ${clearedClass} ${selectedPackId === pack.id ? 'active-card' : ''}`.trim();
      card.dataset.packId = String(pack.id);
      
      const tierNum = pack.tier ? pack.tier.replace(/[^0-9]/g, '') : '1';
      const isCleared = combinedClears.length > 0;
      const userClearBadgeHtml = isUserCleared
        ? `<span class="map-pack-user-clear-badge">✓ CLEAR</span>`
        : '';

      card.innerHTML = `
        <div class="map-pack-card-top">
          <div class="map-pack-title-group">
            <span class="map-pack-title">${esc(pack.title)}</span>
            ${userClearBadgeHtml}
          </div>
          <span class="map-pack-tier-badge tier-badge-${tierNum}">${esc(pack.tier || 'Tier 1')}</span>
        </div>
        <div class="map-pack-desc">${esc(pack.description || '')}</div>
        <div class="map-pack-bottom-info">
          <span class="map-pack-level-count">${(pack.levels || []).length}개의 레벨</span>
          <span class="map-pack-clear-status ${isCleared ? 'cleared' : 'uncleared'}">
            ${isCleared ? `클리어 (${combinedClears.length}명)` : '미클리어'}
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectPack(pack, card);
      });

      fragment.appendChild(card);
    });
    mapsListBody.appendChild(fragment);
  };

  const getOrCreateMapBackdrop = () => {
    let backdrop = document.getElementById('detail-overlay-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'detail-overlay-backdrop';
      backdrop.className = 'detail-overlay-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', () => {
        closeDetail();
      });
    }
    return backdrop;
  };

  // --- 4. Select Pack & Render Detail ---
  const selectPack = (pack, cardElement) => {
    if (selectedPackId === pack.id && mapsDetailContainer.classList.contains('active')) {
      closeDetail();
      return;
    }
    selectedPackId = pack.id;
    const backdrop = getOrCreateMapBackdrop();

    // Update active highlight on cards directly without rebuilding DOM list
    document.querySelectorAll('.map-pack-card.active-card').forEach(el => {
      el.classList.remove('active-card');
    });
    if (cardElement) {
      cardElement.classList.add('active-card');
    } else {
      const el = document.querySelector(`.map-pack-card[data-pack-id="${pack.id}"]`);
      if (el) el.classList.add('active-card');
    }

    // Enable dual panel layout
    mapsListContainer.classList.add('has-detail');
    mapsDetailContainer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');

    // Render Detail Content
    const esc = window.escapeHtml || (s => s == null ? '' : String(s));
    const tierNum = pack.tier ? pack.tier.replace(/[^0-9]/g, '') : '1';
    const levels = pack.levels || [];
    const combinedClears = getPackCombinedClears(pack);
    const isUserCleared = isPackClearedByUser(pack);
    const currentUser = getUserNickname();
    const userClearBadgeHtml = isUserCleared
      ? `<span class="map-pack-user-clear-badge">✓ CLEAR</span>`
      : '';

    mapsDetailContainer.innerHTML = `
      <div class="map-detail-header">
        <div class="map-detail-title-group">
          <span class="map-detail-title">${esc(pack.title)}</span>
          ${userClearBadgeHtml}
          <span class="map-pack-tier-badge tier-badge-${tierNum}">${esc(pack.tier || 'Tier 1')}</span>
        </div>
        <button id="maps-detail-close" class="map-detail-close-btn" aria-label="닫기">✕</button>
      </div>

      <div class="map-detail-desc-box">
        ${esc(pack.description || '설명이 없습니다.')}
      </div>

      <div class="map-detail-section-title">
        포함된 레벨 <span>(${levels.length}개)</span>
      </div>
      <div class="map-detail-levels-grid">
        ${levels.length > 0 ? levels.map((lvl, idx) => {
          const matchedLevel = findLevelInDatabase(lvl);
          let name = '';
          let author = '';
          let id = '';

          if (typeof lvl === 'string') {
            name = lvl;
          } else if (lvl && typeof lvl === 'object') {
            name = lvl.name || lvl.title || (lvl.id ? `레벨 ${lvl.id}` : `레벨 ${idx + 1}`);
            author = lvl.author || lvl.creator || '';
            id = lvl.id || '';
          }

          if (matchedLevel) {
            if (!name) name = matchedLevel.title;
            if (!author) author = matchedLevel.creator;
            if (!id && matchedLevel.id != null) id = matchedLevel.id;
          }

          // Check if current logged-in user cleared or verified this level
          const userCompletion = currentUser && matchedLevel ? isPlayerCompletedLevel(matchedLevel, currentUser) : { completed: false };
          const isClearedByMe = userCompletion.completed;
          const userBadge = isClearedByMe
            ? `<span class="map-level-user-badge ${userCompletion.role === 'verifier' ? 'is-verified' : 'is-cleared'}" title="${userCompletion.role === 'verifier' ? '베리파이 완료' : '클리어 완료'}">${userCompletion.role === 'verifier' ? 'VERIFIED' : '✓ CLEAR'}</span>`
            : '';

          // Level link URL if matched
          const levelUrl = matchedLevel && matchedLevel._mode
            ? `level/${matchedLevel._mode}.html?id=${encodeURIComponent(matchedLevel.id)}`
            : null;

          const titleHtml = levelUrl
            ? `<a href="${levelUrl}" class="map-level-link" title="${esc(name)} (레벨 페이지로 이동)">${esc(name)}</a>`
            : `<span class="map-level-name">${esc(name)}</span>`;

          return `
            <div class="map-level-item ${isClearedByMe ? 'user-cleared-item' : ''}">
              <div class="map-level-info">
                <span class="map-level-num">${idx + 1}</span>
                <div class="map-level-text-group">
                  <div class="map-level-title-row">
                    ${titleHtml}
                    ${userBadge}
                  </div>
                  ${author ? `<span class="map-level-author">by ${esc(author)}</span>` : ''}
                </div>
              </div>
              ${id ? `<span class="map-level-id">ID: ${esc(id)}</span>` : ''}
            </div>
          `;
        }).join('') : '<div class="map-clears-empty">포함된 레벨 정보가 없습니다.</div>'}
      </div>

      <div class="map-detail-section-title">
        클리어 유저 명단 <span>(${combinedClears.length}명)</span>
      </div>
      <div class="map-clears-list">
        ${combinedClears.length > 0 ? combinedClears.map(c => {
          const dateStr = c.date ? c.date : (c.isAuto ? '자동 달성' : '');
          return `
            <div class="map-clear-item">
              <span class="map-clear-player">🏆 ${esc(c.player || c.name || '알 수 없음')}</span>
              <span class="map-clear-date">${esc(dateStr)}</span>
            </div>
          `;
        }).join('') : '<div class="map-clears-empty">아직 클리어한 유저가 없습니다. 첫 클리어에 도전해보세요!</div>'}
      </div>
    `;

    // Close Detail Button Handler
    const closeBtn = document.getElementById('maps-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeDetail();
      });
    }
  };

  // --- 5. Close Detail View ---
  const closeDetail = () => {
    selectedPackId = null;
    mapsListContainer.classList.remove('has-detail');
    mapsDetailContainer.classList.remove('active');
    const backdrop = document.getElementById('detail-overlay-backdrop');
    if (backdrop) backdrop.classList.remove('active');

    document.querySelectorAll('.map-pack-card.active-card').forEach(el => {
      el.classList.remove('active-card');
    });

    mapsDetailContainer.innerHTML = `
      <div class="maps-detail-empty">
        <div class="maps-empty-icon"></div>
        <p class="maps-empty-title">선택된 맵 팩이 없습니다</p>
        <p class="maps-empty-desc">왼쪽 리스트에서 맵 팩을 선택하여 상세 정보와 포함된 레벨 및 클리어 기록을 확인하세요.</p>
      </div>
    `;
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetail();
    }
  });

  // --- 6. Tier Tabs Handler ---
  tierTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tierTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTier = tab.dataset.tier;
      renderPacksList();
    });
  });

  // --- 7. Search Input Handler ---
  if (mapsSearchInput) {
    const handleMapsSearch = window.debounce ? window.debounce((val) => {
      searchQuery = val.trim();
      renderPacksList();
    }, 120) : (val) => { searchQuery = val.trim(); renderPacksList(); };

    mapsSearchInput.addEventListener('input', (e) => {
      if (mapsSearchClear) {
        mapsSearchClear.style.display = e.target.value.trim() ? 'block' : 'none';
      }
      handleMapsSearch(e.target.value);
    });
  }

  if (mapsSearchClear) {
    mapsSearchClear.addEventListener('click', () => {
      mapsSearchInput.value = '';
      searchQuery = '';
      mapsSearchClear.style.display = 'none';
      mapsSearchInput.focus();
      renderPacksList();
    });
  }

  // --- 8. Event Listeners for Live Nickname & DevData Sync ---
  window.addEventListener('forumNicknameChanged', () => {
    renderPacksList();
    if (selectedPackId) {
      const pack = allPacks.find(p => String(p.id) === String(selectedPackId));
      if (pack) selectPack(pack);
    }
  });

  window.addEventListener('devDataUpdated', async () => {
    await fetchLevelsData();
    renderPacksList();
    if (selectedPackId) {
      const pack = allPacks.find(p => String(p.id) === String(selectedPackId));
      if (pack) selectPack(pack);
    }
  });

  window.addEventListener('storage', async (e) => {
    if (e.key === 'forumNickname') {
      renderPacksList();
      if (selectedPackId) {
        const pack = allPacks.find(p => String(p.id) === String(selectedPackId));
        if (pack) selectPack(pack);
      }
    } else if (e.key && e.key.startsWith('dev_custom_')) {
      await fetchLevelsData();
      await fetchMapPacks();
    }
  });

  // --- 9. Developer Tools Logic for Map Packs ---
  const devMainControls = document.getElementById('dev-main-controls');
  const devPackAddArea = document.getElementById('dev-pack-add-area');
  const devPackEditArea = document.getElementById('dev-pack-edit-area');
  const devPackClearArea = document.getElementById('dev-pack-clear-area');
  const devSettingsArea = document.getElementById('dev-settings-area');

  const devPackAddOpenBtn = document.getElementById('dev-pack-add-open-btn');
  const devPackEditOpenBtn = document.getElementById('dev-pack-edit-open-btn');
  const devPackClearOpenBtn = document.getElementById('dev-pack-clear-open-btn');
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');

  const devPackAddBackBtn = document.getElementById('dev-pack-add-back-btn');
  const devPackEditBackBtn = document.getElementById('dev-pack-edit-back-btn');
  const devPackClearBackBtn = document.getElementById('dev-pack-clear-back-btn');
  const devSettingsBackBtn = document.getElementById('dev-settings-back-btn');

  const devPackEditSelect = document.getElementById('dev-pack-edit-select');
  const devPackEditFields = document.getElementById('dev-pack-edit-fields');
  const devPackClearSelect = document.getElementById('dev-pack-clear-select');

  function hideAllDevSubPanels() {
    if (devPackAddArea) devPackAddArea.style.display = 'none';
    if (devPackEditArea) devPackEditArea.style.display = 'none';
    if (devPackClearArea) devPackClearArea.style.display = 'none';
    if (devSettingsArea) devSettingsArea.style.display = 'none';
    if (devMainControls) devMainControls.style.display = 'block';
  }

  function showDevSubPanel(panel) {
    if (devMainControls) devMainControls.style.display = 'none';
    hideAllDevSubPanels();
    if (panel) panel.style.display = 'block';
  }

  if (devPackAddOpenBtn) {
    devPackAddOpenBtn.addEventListener('click', () => showDevSubPanel(devPackAddArea));
  }

  if (devPackEditOpenBtn) {
    devPackEditOpenBtn.addEventListener('click', () => {
      populatePackSelects();
      showDevSubPanel(devPackEditArea);
    });
  }

  if (devPackClearOpenBtn) {
    devPackClearOpenBtn.addEventListener('click', () => {
      populatePackSelects();
      showDevSubPanel(devPackClearArea);
      const playerInput = document.getElementById('dev-pack-clear-player');
      const dateInput = document.getElementById('dev-pack-clear-date');
      if (playerInput) {
        playerInput.value = localStorage.getItem('forumNickname') || '';
      }
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    });
  }

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => showDevSubPanel(devSettingsArea));
  }

  [devPackAddBackBtn, devPackEditBackBtn, devPackClearBackBtn, devSettingsBackBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', hideAllDevSubPanels);
  });

  function populatePackSelects() {
    if (devPackEditSelect) {
      devPackEditSelect.innerHTML = '<option value="">-- 수정할 맵 팩 선택 --</option>';
      allPacks.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `[${p.tier || 'Pack'}] ${p.title}`;
        devPackEditSelect.appendChild(opt);
      });
    }

    if (devPackClearSelect) {
      devPackClearSelect.innerHTML = '<option value="">-- 맵 팩 선택 --</option>';
      allPacks.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `[${p.tier || 'Pack'}] ${p.title}`;
        devPackClearSelect.appendChild(opt);
      });
    }
  }

  if (devPackEditSelect) {
    devPackEditSelect.addEventListener('change', () => {
      const selectedId = devPackEditSelect.value;
      const targetPack = allPacks.find(p => String(p.id) === String(selectedId));

      if (targetPack && devPackEditFields) {
        devPackEditFields.style.display = 'block';
        document.getElementById('dev-pack-edit-title').value = targetPack.title || '';
        document.getElementById('dev-pack-edit-tier').value = targetPack.tier || 'Tier 1';
        document.getElementById('dev-pack-edit-desc').value = targetPack.description || '';
        const levelNames = (targetPack.levels || []).map(l => {
          if (typeof l === 'string') return l.trim();
          if (l && typeof l === 'object') {
            const name = (l.name || l.title || '').trim();
            const author = (l.author || l.creator || '').trim();
            return author ? `${name} (by ${author})` : name;
          }
          return '';
        }).filter(Boolean).join('\n');
        document.getElementById('dev-pack-edit-levels').value = levelNames;
      } else if (devPackEditFields) {
        devPackEditFields.style.display = 'none';
      }
    });
  }

  function parsePackLevelInput(rawStr) {
    if (!rawStr) return [];
    const parts = rawStr.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    return parts.map(item => {
      // 1. Title (by Author) or Title (Author)
      const parenMatch = item.match(/^(.*?)\s*\((?:by\s*)?(.*?)\)$/i);
      if (parenMatch) {
        return { name: parenMatch[1].trim(), author: parenMatch[2].trim() };
      }
      // 2. Title - Author or Title | Author
      const dashMatch = item.match(/^(.*?)\s*[-|/]\s*(.*?)$/);
      if (dashMatch) {
        return { name: dashMatch[1].trim(), author: dashMatch[2].trim() };
      }
      // 3. Title by Author
      const byMatch = item.match(/^(.*?)\s+by\s+(.*?)$/i);
      if (byMatch) {
        return { name: byMatch[1].trim(), author: byMatch[2].trim() };
      }
      return { name: item, author: '' };
    });
  }

  // 1) 맵 팩 신규 등록
  const devPackAddSubmitBtn = document.getElementById('dev-pack-add-submit-btn');
  if (devPackAddSubmitBtn) {
    devPackAddSubmitBtn.addEventListener('click', () => {
      const title = (document.getElementById('dev-pack-add-title').value || '').trim();
      const tier = document.getElementById('dev-pack-add-tier').value;
      const desc = (document.getElementById('dev-pack-add-desc').value || '').trim();
      const levelsRaw = (document.getElementById('dev-pack-add-levels').value || '').trim();

      if (!title) {
        alert('맵 팩 제목을 입력해주세요.');
        return;
      }

      const newPack = {
        id: `custom_pack_${Date.now()}`,
        title: title,
        tier: tier,
        description: desc,
        levels: parsePackLevelInput(levelsRaw),
        clears: []
      };

      allPacks.push(newPack);
      localStorage.setItem('dev_custom_mappacks', JSON.stringify(allPacks));
      alert(`'${title}' 맵 팩이 성공적으로 추가되었습니다!`);
      hideAllDevSubPanels();
      renderPacksList();
    });
  }

  // 2) 맵 팩 수정 / 삭제
  const devPackEditSubmitBtn = document.getElementById('dev-pack-edit-submit-btn');
  const devPackEditDeleteBtn = document.getElementById('dev-pack-edit-delete-btn');

  if (devPackEditSubmitBtn) {
    devPackEditSubmitBtn.addEventListener('click', () => {
      const selectedId = devPackEditSelect.value;
      const targetPack = allPacks.find(p => String(p.id) === String(selectedId));

      if (!targetPack) {
        alert('수정할 맵 팩을 선택하세요.');
        return;
      }

      const title = (document.getElementById('dev-pack-edit-title').value || '').trim();
      const tier = document.getElementById('dev-pack-edit-tier').value;
      const desc = (document.getElementById('dev-pack-edit-desc').value || '').trim();
      const levelsRaw = (document.getElementById('dev-pack-edit-levels').value || '').trim();

      if (!title) {
        alert('맵 팩 제목을 입력하세요.');
        return;
      }

      targetPack.title = title;
      targetPack.tier = tier;
      targetPack.description = desc;
      targetPack.levels = parsePackLevelInput(levelsRaw);

      localStorage.setItem('dev_custom_mappacks', JSON.stringify(allPacks));
      alert(`'${title}' 맵 팩 정보가 수정되었습니다.`);
      hideAllDevSubPanels();
      renderPacksList();
      if (selectedPackId === targetPack.id) {
        selectPack(targetPack);
      }
    });
  }

  if (devPackEditDeleteBtn) {
    devPackEditDeleteBtn.addEventListener('click', () => {
      const selectedId = devPackEditSelect.value;
      const targetIdx = allPacks.findIndex(p => String(p.id) === String(selectedId));

      if (targetIdx === -1) {
        alert('삭제할 맵 팩을 선택하세요.');
        return;
      }

      if (confirm(`정말로 '${allPacks[targetIdx].title}' 맵 팩을 삭제하시겠습니까?`)) {
        allPacks.splice(targetIdx, 1);
        localStorage.setItem('dev_custom_mappacks', JSON.stringify(allPacks));
        alert('맵 팩이 삭제되었습니다.');
        hideAllDevSubPanels();
        closeDetail();
        renderPacksList();
      }
    });
  }

  // 3) 맵 팩 클리어 기록 수동 갱신
  const devPackClearSubmitBtn = document.getElementById('dev-pack-clear-submit-btn');
  if (devPackClearSubmitBtn) {
    devPackClearSubmitBtn.addEventListener('click', () => {
      const selectedId = devPackClearSelect.value;
      const targetPack = allPacks.find(p => String(p.id) === String(selectedId));

      if (!targetPack) {
        alert('클리어를 갱신할 맵 팩을 선택하세요.');
        return;
      }

      const player = (document.getElementById('dev-pack-clear-player').value || '').trim();
      const date = (document.getElementById('dev-pack-clear-date').value || '').trim() || new Date().toISOString().split('T')[0];

      if (!player) {
        alert('플레이어 닉네임을 입력하세요.');
        return;
      }

      if (!Array.isArray(targetPack.clears)) targetPack.clears = [];
      const existingIdx = targetPack.clears.findIndex(c => String(c.player || c.name || '').toLowerCase() === player.toLowerCase());
      
      if (existingIdx !== -1) {
        targetPack.clears[existingIdx].date = date;
      } else {
        targetPack.clears.push({ player: player, date: date });
      }

      localStorage.setItem('dev_custom_mappacks', JSON.stringify(allPacks));
      alert(`'${player}' 유저의 '${targetPack.title}' 맵 팩 클리어 기록이 갱신되었습니다!`);
      hideAllDevSubPanels();
      if (selectedPackId === targetPack.id) {
        selectPack(targetPack);
      }
      renderPacksList();
    });
  }

  // 4) GitHub 설정 화면 연동
  const devTokenInput = document.getElementById('dev-token-input');
  const devOwnerInput = document.getElementById('dev-owner-input');
  const devRepoInput = document.getElementById('dev-repo-input');
  const devSettingsSaveBtn = document.getElementById('dev-settings-save-btn');
  const devSettingsTestBtn = document.getElementById('dev-settings-test-btn');

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => {
      showDevSubPanel(devSettingsArea);
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
      hideAllDevSubPanels();
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

      const testUrl = `https://api.github.com/repos/${owner}/${repo}/contents/mappack.json`;
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

  const devGithubSyncBtn = document.getElementById('dev-github-sync-btn');
  if (devGithubSyncBtn) {
    devGithubSyncBtn.addEventListener('click', async () => {
      const config = window.GitHubSyncEngine.getConfig();
      if (!config.owner || !config.repo || !config.token) {
        alert('GitHub API 설정이 누락되었습니다. 먼저 [GitHub 설정]에서 Token, Owner, Repo를 입력하고 저장해주세요.');
        if (devSettingsOpenBtn) devSettingsOpenBtn.click();
        return;
      }

      if (!confirm(`현재 모든 맵 팩 데이터를 GitHub (${config.owner}/${config.repo}의 mappack.json)에 자동으로 커밋 & 푸시하시겠습니까?`)) {
        return;
      }

      devGithubSyncBtn.disabled = true;
      const origText = devGithubSyncBtn.textContent;
      devGithubSyncBtn.textContent = '동기화 중... ⏳';

      try {
        const result = await window.GitHubSyncEngine.commitAndPush(
          'mappack.json',
          allPacks,
          'Update mappacks data via DevTools'
        );

        localStorage.removeItem('dev_custom_mappacks');
        const shortCommit = result.commitSha ? result.commitSha.substring(0, 7) : 'Success';
        alert(`🎉 맵 팩 데이터가 GitHub에 성공적으로 커밋 & 푸시되었습니다!\n(Commit: ${shortCommit})`);
        hideAllDevSubPanels();
        await fetchMapPacks();
      } catch (err) {
        alert(`동기화 중 오류가 발생했습니다:\n\n${err.message}`);
      } finally {
        devGithubSyncBtn.disabled = false;
        devGithubSyncBtn.textContent = origText;
      }
    });
  }

  const devResetDataBtn = document.getElementById('dev-reset-data-btn');
  if (devResetDataBtn) {
    devResetDataBtn.addEventListener('click', async () => {
      if (confirm('로컬에 저장된 맵 팩 변경사항을 모두 초기화하고 원본 mappack.json으로 되돌리시겠습니까?')) {
        localStorage.removeItem('dev_custom_mappacks');
        await fetchMapPacks();
        alert('맵 팩 데이터가 원본 상태로 초기화되었습니다.');
        hideAllDevSubPanels();
      }
    });
  }

  // --- 10. Initial Load ---
  fetchMapPacks();
});
