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
  const devSettingsArea = document.getElementById('dev-settings-area');

  const devUserAddOpenBtn = document.getElementById('dev-user-add-open-btn');
  const devUserEditOpenBtn = document.getElementById('dev-user-edit-open-btn');
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');
  const devLogClearBtn = document.getElementById('dev-log-clear-btn');

  const devUserAddBackBtn = document.getElementById('dev-user-add-back-btn');
  const devUserEditBackBtn = document.getElementById('dev-user-edit-back-btn');
  const devSettingsBackBtn = document.getElementById('dev-settings-back-btn');

  const devUserEditSelect = document.getElementById('dev-user-edit-select');
  const devUserEditFields = document.getElementById('dev-user-edit-fields');

  function getCustomHardestData() {
    try {
      const raw = localStorage.getItem('dev_custom_hardest');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCustomHardestData(arr) {
    hardestData = arr;
    localStorage.setItem('dev_custom_hardest', JSON.stringify(arr));
  }

  function hideAllDevPanels() {
    if (devUserAddArea) devUserAddArea.style.display = 'none';
    if (devUserEditArea) devUserEditArea.style.display = 'none';
    if (devSettingsArea) devSettingsArea.style.display = 'none';
    if (devMainControls) devMainControls.style.display = 'block';
  }

  function showDevPanel(panel) {
    hideAllDevPanels();
    if (devMainControls) devMainControls.style.display = 'none';
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

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => showDevPanel(devSettingsArea));
  }

  [devUserAddBackBtn, devUserEditBackBtn, devSettingsBackBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', hideAllDevPanels);
  });

  function populateUserSelects() {
    if (!devUserEditSelect) return;
    devUserEditSelect.innerHTML = '<option value="">-- 수정할 유저 선택 --</option>';
    hardestData.forEach((item, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `${item.name} (${item.hardest || '-'})`;
      devUserEditSelect.appendChild(opt);
    });
    if (devUserEditFields) devUserEditFields.style.display = 'none';
  }

  if (devUserEditSelect) {
    devUserEditSelect.addEventListener('change', () => {
      const idx = parseInt(devUserEditSelect.value, 10);
      if (!isNaN(idx) && hardestData[idx] && devUserEditFields) {
        devUserEditFields.style.display = 'block';
        document.getElementById('dev-user-edit-name').value = hardestData[idx].name || '';
        document.getElementById('dev-user-edit-hardest').value = hardestData[idx].hardest || '';
      } else if (devUserEditFields) {
        devUserEditFields.style.display = 'none';
      }
    });
  }

  // 1) 하디스트 신규 등록
  const devUserAddSubmitBtn = document.getElementById('dev-user-add-submit-btn');
  if (devUserAddSubmitBtn) {
    devUserAddSubmitBtn.addEventListener('click', () => {
      const name = (document.getElementById('dev-user-add-name').value || '').trim();
      const hardest = (document.getElementById('dev-user-add-hardest').value || '').trim();

      if (!name || !hardest) {
        alert('유저 닉네임과 하디스트 레벨 제목을 모두 입력하세요.');
        return;
      }

      const existingIdx = hardestData.findIndex(c => (c.name || '').toLowerCase() === name.toLowerCase());

      if (existingIdx !== -1) {
        hardestData[existingIdx].hardest = hardest;
      } else {
        hardestData.push({ name, hardest });
      }

      saveCustomHardestData(hardestData);
      alert(`'${name}' 유저의 하디스트 정보가 성공적으로 등록되었습니다!`);
      document.getElementById('dev-user-add-name').value = '';
      document.getElementById('dev-user-add-hardest').value = '';
      hideAllDevPanels();
      renderRanking();
    });
  }

  // 2) 하디스트 수정 및 삭제
  const devUserEditSubmitBtn = document.getElementById('dev-user-edit-submit-btn');
  const devUserEditDeleteBtn = document.getElementById('dev-user-edit-delete-btn');

  if (devUserEditSubmitBtn) {
    devUserEditSubmitBtn.addEventListener('click', () => {
      const idx = parseInt(devUserEditSelect.value, 10);
      if (isNaN(idx) || !hardestData[idx]) {
        alert('수정할 유저를 선택하세요.');
        return;
      }

      const newName = (document.getElementById('dev-user-edit-name').value || '').trim();
      const hardest = (document.getElementById('dev-user-edit-hardest').value || '').trim();

      if (!newName || !hardest) {
        alert('유저 닉네임과 하디스트 레벨을 모두 입력하세요.');
        return;
      }

      hardestData[idx].name = newName;
      hardestData[idx].hardest = hardest;

      saveCustomHardestData(hardestData);
      alert(`'${newName}' 유저 정보가 수정되었습니다.`);
      hideAllDevPanels();
      renderRanking();
    });
  }

  if (devUserEditDeleteBtn) {
    devUserEditDeleteBtn.addEventListener('click', () => {
      const idx = parseInt(devUserEditSelect.value, 10);
      if (isNaN(idx) || !hardestData[idx]) {
        alert('삭제할 유저를 선택하세요.');
        return;
      }

      const targetName = hardestData[idx].name;
      if (confirm(`정말로 '${targetName}' 유저를 하디스트 랭킹에서 삭제하시겠습니까?`)) {
        hardestData.splice(idx, 1);
        saveCustomHardestData(hardestData);
        alert(`'${targetName}' 유저가 하디스트 랭킹에서 삭제되었습니다.`);
        hideAllDevPanels();
        renderRanking();
      }
    });
  }

  // 3) GitHub 설정 화면 연동
  const devTokenInput = document.getElementById('dev-token-input');
  const devOwnerInput = document.getElementById('dev-owner-input');
  const devRepoInput = document.getElementById('dev-repo-input');
  const devSettingsSaveBtn = document.getElementById('dev-settings-save-btn');
  const devSettingsTestBtn = document.getElementById('dev-settings-test-btn');

  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => {
      showDevPanel(devSettingsArea);
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
      hideAllDevPanels();
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

      const testUrl = `https://api.github.com/repos/${owner}/${repo}/contents/hardest.json`;
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

      if (!confirm(`현재 모든 하디스트 랭킹 데이터를 GitHub (${config.owner}/${config.repo}의 hardest.json)에 자동으로 커밋 & 푸시하시겠습니까?`)) {
        return;
      }

      devGithubSyncBtn.disabled = true;
      const origText = devGithubSyncBtn.textContent;
      devGithubSyncBtn.textContent = '동기화 중... ⏳';

      try {
        const result = await window.GitHubSyncEngine.commitAndPush(
          'hardest.json',
          hardestData,
          'Update hardest rankings via DevTools'
        );

        localStorage.removeItem('dev_custom_hardest');
        const shortCommit = result.commitSha ? result.commitSha.substring(0, 7) : 'Success';
        alert(`🎉 하디스트 랭킹 데이터가 GitHub에 성공적으로 커밋 & 푸시되었습니다!\n(Commit: ${shortCommit})`);
        hideAllDevPanels();
        await fetchHardestData();
        renderRanking();
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
      if (confirm('로컬에 저장된 하디스트 변경사항을 모두 초기화하고 원본 hardest.json으로 되돌리시겠습니까?')) {
        localStorage.removeItem('dev_custom_hardest');
        await fetchHardestData();
        renderRanking();
        alert('하디스트 랭킹 데이터가 원본 상태로 초기화되었습니다.');
        hideAllDevPanels();
      }
    });
  }

  // Initial Fetch & Render
  await fetchHardestData();
  const customH = getCustomHardestData();
  if (customH && Array.isArray(customH) && customH.length > 0) {
    hardestData = customH;
  }
  renderRanking();
});
