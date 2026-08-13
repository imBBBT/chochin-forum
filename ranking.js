document.addEventListener('DOMContentLoaded', async () => {
  let currentMode = 'classic';
  let hardestData = [];

  const rankingTabs = document.querySelectorAll('.ranking-tab');
  const tableHeader = document.getElementById('ranking-table-header');
  const rankingListBody = document.getElementById('ranking-list-body');

  const getUserNickname = () => {
    return (localStorage.getItem('forumNickname') || '').trim();
  };

  // Fetch hardest.json
  const fetchHardestData = async () => {
    try {
      const res = await fetch('hardest.json');
      if (res.ok) {
        hardestData = await res.json();
      }
    } catch (e) {
      console.warn("Failed to load hardest.json:", e);
    }
  };

  // Process and sort player statistics for Classic, Challenge, Platformer
  const processModeRanking = (levels) => {
    const playerMap = {};

    levels.forEach((lvl, idx) => {
      const rankIndex = idx + 1;
      const verifier = (lvl.verifier || '').trim();
      const clears = Array.isArray(lvl.clears) ? lvl.clears : [];

      // Collect all players involved in this level
      const involvedPlayers = new Set();
      if (verifier) involvedPlayers.add(verifier);
      clears.forEach(c => {
        const pName = (c.player || c.user || '').trim();
        if (pName) involvedPlayers.add(pName);
      });

      involvedPlayers.forEach(player => {
        if (!playerMap[player]) {
          playerMap[player] = {
            name: player,
            points: 0,
            clearCount: 0,
            hardestRank: 9999,
            hardestTitle: '-'
          };
        }

        // Calculate points based on specific level rank and player role
        const pt = window.calcPlayerLevelPoints ? window.calcPlayerLevelPoints(lvl, rankIndex, player) : 0;
        playerMap[player].points += pt;
        playerMap[player].clearCount += 1;

        // Track hardest level (lowest rankIndex)
        if (rankIndex < playerMap[player].hardestRank) {
          playerMap[player].hardestRank = rankIndex;
          playerMap[player].hardestTitle = `#${rankIndex} ${lvl.title || 'Untitled'}`;
        }
      });
    });

    const result = Object.values(playerMap);
    // Sort by points descending
    result.sort((a, b) => b.points - a.points);
    return result;
  };

  // Render Leaderboard Table
  const renderRanking = async () => {
    if (!rankingListBody) return;
    rankingListBody.innerHTML = '';

    const currentUser = getUserNickname().toLowerCase();

    if (currentMode === 'hardest') {
      // Hardest View (using hardest.json)
      tableHeader.className = 'ranking-table-header mode-hardest';
      tableHeader.innerHTML = `
        <span class="col-rank">순위</span>
        <span class="col-name">유저 이름</span>
        <span class="col-hardest">하디스트 레벨 (AREDL)</span>
      `;

      if (hardestData.length === 0) {
        await fetchHardestData();
      }

      if (hardestData.length === 0) {
        rankingListBody.innerHTML = '<div class="ranking-empty-state">하디스트 랭킹 데이터가 없습니다.</div>';
        return;
      }

      hardestData.forEach((item, idx) => {
        const rank = idx + 1;
        const isMe = item.name && item.name.trim().toLowerCase() === currentUser;
        
        let medalIcon = `#${rank}`;

        const row = document.createElement('div');
        row.className = `ranking-row-card mode-hardest rank-${rank} ${isMe ? 'is-current-user' : ''}`;
        row.innerHTML = `
          <span class="rank-badge">${medalIcon}</span>
          <span class="player-name">
            ${item.name}
            ${isMe ? '<span class="user-me-badge">나</span>' : ''}
          </span>
          <span class="player-hardest">${item.hardest || '-'}</span>
        `;
        rankingListBody.appendChild(row);
      });
    } else {
      // Classic, Challenge, Platformer View (Calculated PT)
      tableHeader.className = 'ranking-table-header';
      tableHeader.innerHTML = `
        <span class="col-rank">순위</span>
        <span class="col-name">유저 이름</span>
        <span class="col-pt">포인트</span>
        <span class="col-hardest">하디스트 레벨</span>
        <span class="col-clears">클리어 맵 개수</span>
      `;

      const { classicLevels, challengeLevels, platformerLevels } = await window.calculateAllPlayerPoints();

      let targetLevels = [];
      if (currentMode === 'classic') targetLevels = classicLevels;
      if (currentMode === 'challenge') targetLevels = challengeLevels;
      if (currentMode === 'platformer') targetLevels = platformerLevels;

      const rankingData = processModeRanking(targetLevels);

      if (rankingData.length === 0) {
        rankingListBody.innerHTML = '<div class="ranking-empty-state">해당 부문에 기록된 랭킹 정보가 없습니다.</div>';
        return;
      }

      let customRankingData = [];
      try {
        const rawCustom = localStorage.getItem('dev_custom_ranking');
        if (rawCustom) customRankingData = JSON.parse(rawCustom) || [];
      } catch (e) {
        console.warn('dev_custom_ranking parse error:', e);
      }

      // Merge custom users into rankingData
      customRankingData.forEach(cust => {
        if (cust.mode && cust.mode !== currentMode) return;

        const existing = rankingData.find(item => item.name.toLowerCase() === (cust.name || '').toLowerCase());
        if (existing) {
          if (cust.points != null) existing.points = cust.points;
          if (cust.hardestTitle) existing.hardestTitle = cust.hardestTitle;
          if (cust.clearCount != null) existing.clearCount = cust.clearCount;
        } else if (!cust.isDeleted) {
          rankingData.push({
            name: cust.name,
            points: cust.points || 0,
            hardestTitle: cust.hardestTitle || '-',
            clearCount: cust.clearCount || 0
          });
        }
      });

      // Filter out deleted users
      const activeRanking = rankingData.filter(item => {
        const cust = customRankingData.find(c => (c.name || '').toLowerCase() === item.name.toLowerCase());
        return !cust || !cust.isDeleted;
      });

      // Re-sort ranking
      activeRanking.sort((a, b) => b.points - a.points);

      activeRanking.forEach((item, idx) => {
        const rank = idx + 1;
        const isMe = item.name && item.name.trim().toLowerCase() === currentUser;

        let medalIcon = `#${rank}`;

        const row = document.createElement('div');
        row.className = `ranking-row-card rank-${rank} ${isMe ? 'is-current-user' : ''}`;
        row.innerHTML = `
          <span class="rank-badge">${medalIcon}</span>
          <span class="player-name">
            ${item.name}
            ${isMe ? '<span class="user-me-badge">나</span>' : ''}
          </span>
          <span class="player-pt">${Math.round(item.points).toLocaleString()} PT</span>
          <span class="player-hardest">${item.hardestTitle}</span>
          <span class="player-clears">${item.clearCount}개</span>
        `;
        rankingListBody.appendChild(row);
      });
    }
  };

  // Tab Event Handlers
  rankingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      rankingTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      renderRanking();
    });
  });

  // Developer Tools Logic for Rankings & Hardest
  const devMainControls = document.getElementById('dev-main-controls');
  const devUserAddArea = document.getElementById('dev-user-add-area');
  const devUserEditArea = document.getElementById('dev-user-edit-area');
  const devUserPtArea = document.getElementById('dev-user-pt-area');
  const devSettingsArea = document.getElementById('dev-settings-area');

  const devUserAddOpenBtn = document.getElementById('dev-user-add-open-btn');
  const devUserEditOpenBtn = document.getElementById('dev-user-edit-open-btn');
  const devUserPtOpenBtn = document.getElementById('dev-user-pt-open-btn');
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');
  const devLogClearBtn = document.getElementById('dev-log-clear-btn');

  const devUserAddBackBtn = document.getElementById('dev-user-add-back-btn');
  const devUserEditBackBtn = document.getElementById('dev-user-edit-back-btn');
  const devUserPtBackBtn = document.getElementById('dev-pt-back-btn');
  const devSettingsBackBtn = document.getElementById('dev-settings-back-btn');

  const devUserEditSelect = document.getElementById('dev-user-edit-select');
  const devUserEditFields = document.getElementById('dev-user-edit-fields');
  const devPtUserSelect = document.getElementById('dev-pt-user-select');

  function getCustomRankingData() {
    try {
      const raw = localStorage.getItem('dev_custom_ranking');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomRankingData(arr) {
    localStorage.setItem('dev_custom_ranking', JSON.stringify(arr));
  }

  function hideAllDevPanels() {
    if (devUserAddArea) devUserAddArea.style.display = 'none';
    if (devUserEditArea) devUserEditArea.style.display = 'none';
    if (devUserPtArea) devUserPtArea.style.display = 'none';
    if (devSettingsArea) devSettingsArea.style.display = 'none';
    if (devMainControls) devMainControls.style.display = 'block';
  }

  function showDevPanel(panel) {
    if (devMainControls) devMainControls.style.display = 'none';
    hideAllDevPanels();
    if (panel) panel.style.display = 'block';
  }

  if (devUserAddOpenBtn) {
    devUserAddOpenBtn.addEventListener('click', () => showDevPanel(devUserAddArea));
  }

  if (devUserEditOpenBtn) {
    devUserEditOpenBtn.addEventListener('click', () => {
      populateUserSelects();
      showDevPanel(devUserEditArea);
    });
  }

  if (devUserPtOpenBtn) {
    devUserPtOpenBtn.addEventListener('click', () => {
      populateUserSelects();
      showDevPanel(devUserPtArea);
    });
  }

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => showDevPanel(devSettingsArea));
  }

  [devUserAddBackBtn, devUserEditBackBtn, devUserPtBackBtn, devSettingsBackBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', hideAllDevPanels);
  });

  function populateUserSelects() {
    const listCards = document.querySelectorAll('.ranking-row-card .player-name');
    const userNames = new Set();

    listCards.forEach(card => {
      const clone = card.cloneNode(true);
      const meBadge = clone.querySelector('.user-me-badge');
      if (meBadge) meBadge.remove();
      const text = clone.textContent.trim();
      if (text) userNames.add(text);
    });

    if (devUserEditSelect) {
      devUserEditSelect.innerHTML = '<option value="">-- 수정할 유저 선택 --</option>';
      userNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        devUserEditSelect.appendChild(opt);
      });
    }

    if (devPtUserSelect) {
      devPtUserSelect.innerHTML = '<option value="">-- 유저 선택 --</option>';
      userNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        devPtUserSelect.appendChild(opt);
      });
    }
  }

  if (devUserEditSelect) {
    devUserEditSelect.addEventListener('change', () => {
      const selectedName = devUserEditSelect.value;
      if (selectedName && devUserEditFields) {
        devUserEditFields.style.display = 'block';
        document.getElementById('dev-user-edit-name').value = selectedName;
      } else if (devUserEditFields) {
        devUserEditFields.style.display = 'none';
      }
    });
  }

  // 1) 유저 / 하디스트 신규 등록
  const devUserAddSubmitBtn = document.getElementById('dev-user-add-submit-btn');
  if (devUserAddSubmitBtn) {
    devUserAddSubmitBtn.addEventListener('click', () => {
      const name = (document.getElementById('dev-user-add-name').value || '').trim();
      const mode = document.getElementById('dev-user-add-mode').value;
      const pt = parseFloat(document.getElementById('dev-user-add-pt').value) || 0;
      const hardest = (document.getElementById('dev-user-add-hardest').value || '').trim();
      const clears = parseInt(document.getElementById('dev-user-add-clears').value, 10) || 0;

      if (!name) {
        alert('유저 닉네임을 입력하세요.');
        return;
      }

      const list = getCustomRankingData();
      const existingIdx = list.findIndex(c => (c.name || '').toLowerCase() === name.toLowerCase());

      if (existingIdx !== -1) {
        list[existingIdx] = { name, mode, points: pt, hardestTitle: hardest, clearCount: clears, isDeleted: false };
      } else {
        list.push({ name, mode, points: pt, hardestTitle: hardest, clearCount: clears, isDeleted: false });
      }

      saveCustomRankingData(list);
      alert(`'${name}' 유저 정보가 성공적으로 추가/등록되었습니다!`);
      hideAllDevPanels();
      renderRanking();
    });
  }

  // 2) 유저 정보 / 하디스트 수정 및 삭제
  const devUserEditSubmitBtn = document.getElementById('dev-user-edit-submit-btn');
  const devUserEditDeleteBtn = document.getElementById('dev-user-edit-delete-btn');

  if (devUserEditSubmitBtn) {
    devUserEditSubmitBtn.addEventListener('click', () => {
      const selectedName = devUserEditSelect.value;
      if (!selectedName) {
        alert('수정할 유저를 선택하세요.');
        return;
      }

      const newName = (document.getElementById('dev-user-edit-name').value || '').trim();
      const pt = parseFloat(document.getElementById('dev-user-edit-pt').value);
      const hardest = (document.getElementById('dev-user-edit-hardest').value || '').trim();
      const clears = parseInt(document.getElementById('dev-user-edit-clears').value, 10);

      const list = getCustomRankingData();
      let target = list.find(c => (c.name || '').toLowerCase() === selectedName.toLowerCase());

      if (!target) {
        target = { name: selectedName, mode: currentMode };
        list.push(target);
      }

      if (newName) target.name = newName;
      if (!isNaN(pt)) target.points = pt;
      if (hardest) target.hardestTitle = hardest;
      if (!isNaN(clears)) target.clearCount = clears;
      target.isDeleted = false;

      saveCustomRankingData(list);
      alert(`'${selectedName}' 유저 정보가 수정되었습니다.`);
      hideAllDevPanels();
      renderRanking();
    });
  }

  if (devUserEditDeleteBtn) {
    devUserEditDeleteBtn.addEventListener('click', () => {
      const selectedName = devUserEditSelect.value;
      if (!selectedName) {
        alert('삭제할 유저를 선택하세요.');
        return;
      }

      if (confirm(`정말로 '${selectedName}' 유저를 랭킹에서 삭제하시겠습니까?`)) {
        const list = getCustomRankingData();
        const target = list.find(c => (c.name || '').toLowerCase() === selectedName.toLowerCase());
        if (target) {
          target.isDeleted = true;
        } else {
          list.push({ name: selectedName, isDeleted: true });
        }

        saveCustomRankingData(list);
        alert(`'${selectedName}' 유저가 랭킹에서 삭제되었습니다.`);
        hideAllDevPanels();
        renderRanking();
      }
    });
  }

  // 3) 포인트 / 클리어 수 갱신
  const devPtSubmitBtn = document.getElementById('dev-pt-submit-btn');
  if (devPtSubmitBtn) {
    devPtSubmitBtn.addEventListener('click', () => {
      const selectedName = devPtUserSelect.value;
      if (!selectedName) {
        alert('유저를 선택하세요.');
        return;
      }

      const ptDelta = parseFloat(document.getElementById('dev-pt-add-val').value) || 0;
      const clearsDelta = parseInt(document.getElementById('dev-clears-add-val').value, 10) || 0;

      const list = getCustomRankingData();
      let target = list.find(c => (c.name || '').toLowerCase() === selectedName.toLowerCase());

      if (!target) {
        target = { name: selectedName, points: 0, clearCount: 0, mode: currentMode };
        list.push(target);
      }

      target.points = (target.points || 0) + ptDelta;
      target.clearCount = (target.clearCount || 0) + clearsDelta;

      saveCustomRankingData(list);
      alert(`'${selectedName}' 유저의 포인트(+${ptDelta}) 및 클리어 수(+${clearsDelta})가 갱신되었습니다!`);
      hideAllDevPanels();
      renderRanking();
    });
  }

  if (devLogClearBtn) {
    devLogClearBtn.addEventListener('click', () => {
      if (confirm('랭킹 및 하디스트 커스텀 변경 데이터를 초기화하시겠습니까?')) {
        localStorage.removeItem('dev_custom_ranking');
        alert('랭킹 커스텀 데이터가 초기화되었습니다.');
        hideAllDevPanels();
        renderRanking();
      }
    });
  }

  // Initial Fetch & Render
  await fetchHardestData();
  renderRanking();
});
