document.addEventListener('DOMContentLoaded', () => {
  let allPacks = [];
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

  // 1. Fetch mappack.json
  const fetchMapPacks = async () => {
    try {
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

  const parsePackIdNum = (idStr) => {
    const match = (idStr || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  };

  const getUserNickname = () => {
    return (localStorage.getItem('forumNickname') || '').trim();
  };

  const isPackClearedByUser = (pack) => {
    const user = getUserNickname();
    if (!user) return false;
    const userLower = user.toLowerCase();
    return Array.isArray(pack.clears) && pack.clears.some(c => 
      c.player && String(c.player).trim().toLowerCase() === userLower
    );
  };

  // 2. Filter & Render List
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
        const levelMatch = (pack.levels || []).some(l => 
          (l.name || '').toLowerCase().includes(q) || (l.author || '').toLowerCase().includes(q)
        );
        if (!titleMatch && !descMatch && !levelMatch) return false;
      }
      return true;
    });

    // 맵 팩 정렬: Tier 오름차순 (Tier 1 -> Tier 6), 동일 티어 내 팩 번호 오름차순
    filtered.sort((a, b) => {
      const tierA = parseTierNum(a.tier);
      const tierB = parseTierNum(b.tier);
      if (tierA !== tierB) return tierA - tierB;
      return parsePackIdNum(a.id) - parsePackIdNum(b.id);
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

    const fragment = document.createDocumentFragment();
    filtered.forEach(pack => {
      const card = document.createElement('div');
      const isUserCleared = isPackClearedByUser(pack);
      const clearedClass = isUserCleared ? 'card-cleared' : '';
      card.className = `map-pack-card ${clearedClass} ${selectedPackId === pack.id ? 'active-card' : ''}`.trim();
      
      const tierNum = pack.tier ? pack.tier.replace(/[^0-9]/g, '') : '1';
      const isCleared = (pack.clears || []).length > 0;
      const userClearBadgeHtml = isUserCleared
        ? `<span class="map-pack-user-clear-badge">✓ CLEAR</span>`
        : '';

      card.innerHTML = `
        <div class="map-pack-card-top">
          <div class="map-pack-title-group">
            <span class="map-pack-title">${pack.title}</span>
            ${userClearBadgeHtml}
          </div>
          <span class="map-pack-tier-badge tier-badge-${tierNum}">${pack.tier || 'Tier 1'}</span>
        </div>
        <div class="map-pack-desc">${pack.description || ''}</div>
        <div class="map-pack-bottom-info">
          <span class="map-pack-level-count">${(pack.levels || []).length}개의 레벨</span>
          <span class="map-pack-clear-status ${isCleared ? 'cleared' : 'uncleared'}">
            ${isCleared ? `클리어 (${pack.clears.length}명)` : '미클리어'}
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectPack(pack);
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

  // 3. Select Pack & Render Detail
  const selectPack = (pack) => {
    selectedPackId = pack.id;
    const backdrop = getOrCreateMapBackdrop();

    // Update active highlight on cards
    document.querySelectorAll('.map-pack-card').forEach(el => {
      el.classList.remove('active-card');
    });

    // Enable dual panel layout
    mapsListContainer.classList.add('has-detail');
    mapsDetailContainer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');

    // Render Detail Content
    const tierNum = pack.tier ? pack.tier.replace(/[^0-9]/g, '') : '1';
    const levels = pack.levels || [];
    const clears = pack.clears || [];
    const isUserCleared = isPackClearedByUser(pack);
    const userClearBadgeHtml = isUserCleared
      ? `<span class="map-pack-user-clear-badge">✓ CLEAR</span>`
      : '';

    mapsDetailContainer.innerHTML = `
      <div class="map-detail-header">
        <div class="map-detail-title-group">
          <span class="map-detail-title">${pack.title}</span>
          ${userClearBadgeHtml}
          <span class="map-pack-tier-badge tier-badge-${tierNum}">${pack.tier || 'Tier 1'}</span>
        </div>
        <button id="maps-detail-close" class="map-detail-close-btn" aria-label="닫기">✕</button>
      </div>

      <div class="map-detail-desc-box">
        ${pack.description || '설명이 없습니다.'}
      </div>

      <div class="map-detail-section-title">
        포함된 레벨 <span>(${levels.length}개)</span>
      </div>
      <div class="map-detail-levels-grid">
        ${levels.length > 0 ? levels.map(lvl => {
          const lTitle = typeof lvl === 'string' ? lvl : (lvl.title || lvl.name || `레벨 ${lvl.id || ''}`);
          const lId = typeof lvl === 'object' ? lvl.id : '';
          return `
            <div class="map-level-item">
              <div class="map-level-info">
                <span class="map-level-bullet">•</span>
                <span class="map-level-title">${lTitle}</span>
              </div>
              ${lId ? `<span class="map-level-id">ID: ${lId}</span>` : ''}
            </div>
          `;
        }).join('') : '<div class="map-clears-empty">포함된 레벨 정보가 없습니다.</div>'}
      </div>

      <div class="map-detail-section-title">
        클리어 유저 명단 <span>(${clears.length}명)</span>
      </div>
      <div class="map-clears-list">
        ${clears.length > 0 ? clears.map(c => `
          <div class="map-clear-item">
            <span class="map-clear-player">🏆 ${c.player || c.name || '알 수 없음'}</span>
            <span class="map-clear-date">${c.date || ''}</span>
          </div>
        `).join('') : '<div class="map-clears-empty">아직 클리어한 유저가 없습니다. 첫 클리어에 도전해보세요!</div>'}
      </div>
    `;

    // Close Detail Button Handler
    const closeBtn = document.getElementById('maps-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeDetail();
      });
    }

    // Re-render pack cards to reflect active border highlight
    renderPacksList();
  };

  // 4. Close Detail View
  const closeDetail = () => {
    selectedPackId = null;
    mapsListContainer.classList.remove('has-detail');
    mapsDetailContainer.classList.remove('active');
    const backdrop = document.getElementById('detail-overlay-backdrop');
    if (backdrop) backdrop.classList.remove('active');

    mapsDetailContainer.innerHTML = `
      <div class="maps-detail-empty">
        <div class="maps-empty-icon"></div>
        <p class="maps-empty-title">선택된 맵 팩이 없습니다</p>
        <p class="maps-empty-desc">왼쪽 리스트에서 맵 팩을 선택하여 상세 정보와 포함된 레벨 및 클리어 기록을 확인하세요.</p>
      </div>
    `;
    renderPacksList();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetail();
    }
  });

  // 5. Tier Tabs Handler
  tierTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tierTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTier = tab.dataset.tier;
      renderPacksList();
    });
  });

  // 6. Search Input Handler
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

  // 7. Developer Tools Logic for Map Packs
  const devMainControls = document.getElementById('dev-main-controls');
  const devPackAddArea = document.getElementById('dev-pack-add-area');
  const devPackEditArea = document.getElementById('dev-pack-edit-area');
  const devPackClearArea = document.getElementById('dev-pack-clear-area');
  const devSettingsArea = document.getElementById('dev-settings-area');

  const devPackAddOpenBtn = document.getElementById('dev-pack-add-open-btn');
  const devPackEditOpenBtn = document.getElementById('dev-pack-edit-open-btn');
  const devPackClearOpenBtn = document.getElementById('dev-pack-clear-open-btn');
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');
  const devLogClearBtn = document.getElementById('dev-log-clear-btn');

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
        closeMapPackDetail();
        renderPacksList();
      }
    });
  }

  // 3) 맵 팩 클리어 기록 갱신
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
        renderPackDetail(targetPack);
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

  // 8. Initial Load
  fetchMapPacks();
});
