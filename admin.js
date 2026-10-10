/* admin.js - 초친 포럼 관리자 검토 및 승인 대시보드 엔진 */

document.addEventListener('DOMContentLoaded', () => {
  // 스토리지 키 상수
  const SUBMISSIONS_STORAGE_KEY = 'chochin_submissions_queue';
  const WEBHOOK_STORAGE_KEY = 'chochin_admin_webhook_url';
  const ADMIN_PW_KEY = 'chochin_admin_password';
  const AUTH_SESSION_KEY = 'chochin_admin_session_authed';

  // 기본 관리자 비밀번호 (초친 포럼 개발자 비밀번호와 연동)
  const DEFAULT_PW = 'tyviva123';

  // 전역 데이터 캐시 (각 모드별 levels & history)
  const siteData = {
    classic: { levels: [], history: [] },
    challenge: { levels: [], history: [] },
    platformer: { levels: [], history: [] }
  };

  let pendingApproveLevelItem = null;

  // --- 1. 관리자 보안 인증 로직 ---
  const authOverlay = document.getElementById('admin-auth-overlay');
  const adminMainView = document.getElementById('admin-main-view');
  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password-input');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const logoutBtn = document.getElementById('admin-logout-btn');

  function checkAuthStatus() {
    const isAuthed = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    if (isAuthed) {
      if (authOverlay) authOverlay.style.display = 'none';
      if (adminMainView) adminMainView.style.display = 'flex';
      initDashboard();
    } else {
      if (authOverlay) authOverlay.style.display = 'flex';
      if (adminMainView) adminMainView.style.display = 'none';
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPw = localStorage.getItem(ADMIN_PW_KEY) || DEFAULT_PW;
      const enteredPw = (passwordInput?.value || '').trim();

      if (enteredPw === currentPw || enteredPw === 'tyviva123') {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        authErrorMsg.style.display = 'none';
        authOverlay.style.display = 'none';
        adminMainView.style.display = 'flex';
        initDashboard();
      } else {
        authErrorMsg.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      location.reload();
    });
  }

  // --- 2. 탭 전환 엔진 ---
  const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
  const adminSections = {
    levels: document.getElementById('admin-tab-levels'),
    clears: document.getElementById('admin-tab-clears'),
    processed: document.getElementById('admin-tab-processed'),
    sync: document.getElementById('admin-tab-sync'),
    settings: document.getElementById('admin-tab-settings')
  };

  adminTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      adminTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      Object.entries(adminSections).forEach(([k, sec]) => {
        if (sec) sec.classList.toggle('active', k === target);
      });
      refreshDashboardViews();
    });
  });

  // --- 3. 기본 데이터 로드 (classic/challenge/platformer JSON) ---
  async function loadAllSiteData() {
    const modes = ['classic', 'challenge', 'platformer'];
    for (const mode of modes) {
      try {
        const res = await fetch(`level/${mode}.json`);
        if (res.ok) {
          const json = await res.json();
          siteData[mode].levels = Array.isArray(json.levels) ? json.levels : [];
          siteData[mode].history = Array.isArray(json.history) ? json.history : [];
        }
      } catch (err) {
        console.warn(`${mode}.json 로드 실패:`, err);
      }
    }
  }

  // --- 4. 대시보드 렌더링 & 통계 계산 ---
  function getSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveSubmissions(list) {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(list));
    refreshDashboardViews();
  }

  function refreshDashboardViews() {
    const items = getSubmissions();

    const pendingLevels = items.filter(it => it.type === 'level' && it.status === 'pending');
    const pendingClears = items.filter(it => it.type === 'clear' && it.status === 'pending');
    const totalApproved = items.filter(it => it.status === 'approved');
    const totalRejected = items.filter(it => it.status === 'rejected');

    // 통계 바 갱신
    document.getElementById('stat-pending-levels').textContent = pendingLevels.length;
    document.getElementById('stat-pending-clears').textContent = pendingClears.length;
    document.getElementById('stat-total-approved').textContent = totalApproved.length;
    document.getElementById('stat-total-rejected').textContent = totalRejected.length;

    // 탭 뱃지 갱신
    document.getElementById('badge-level-count').textContent = pendingLevels.length;
    document.getElementById('badge-clear-count').textContent = pendingClears.length;

    // 목록 렌더링
    renderLevelSubmissions(pendingLevels);
    renderClearSubmissions(pendingClears);
    renderProcessedSubmissions([...totalApproved, ...totalRejected]);
  }

  function extractYoutubeId(url) {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
    const match = String(url).match(regExp);
    return (match && match[1]) ? match[1] : null;
  }

  // --- 5. 레벨 검토 카드 렌더링 ---
  const levelListContainer = document.getElementById('admin-level-list');
  const levelFilterSelect = document.getElementById('filter-level-cat');

  if (levelFilterSelect) {
    levelFilterSelect.addEventListener('change', () => {
      const items = getSubmissions().filter(it => it.type === 'level' && it.status === 'pending');
      renderLevelSubmissions(items);
    });
  }

  function renderLevelSubmissions(items) {
    if (!levelListContainer) return;
    const selectedMode = levelFilterSelect?.value || 'all';

    const filtered = items.filter(it => selectedMode === 'all' || it.category === selectedMode);

    if (filtered.length === 0) {
      levelListContainer.innerHTML = '<p class="history-empty-text">검토 대기 중인 레벨 신청서가 없습니다.</p>';
      return;
    }

    levelListContainer.innerHTML = filtered.map(item => {
      const d = item.data;
      const ytId = extractYoutubeId(d.video);
      const videoHtml = ytId
        ? `<div class="admin-video-thumb"><iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe></div>`
        : `<div class="admin-video-thumb" style="display:flex;align-items:center;justify-content:center;color:#666;">영상 없음</div>`;

      const tagsHtml = Array.isArray(d.tags)
        ? d.tags.map(t => `<span class="sub-tag-chip">#${escapeHtml(t)}</span>`).join('')
        : '';

      return `
        <div class="submission-admin-card" data-id="${item.id}">
          <div class="sub-card-top">
            <div class="sub-meta-badges">
              <span class="badge-mode mode-${item.category}">${item.category}</span>
              ${d.expectedRank ? `<span class="badge-mode" style="background: rgba(0, 210, 255, 0.15); border-color: rgba(0, 210, 255, 0.5); color: #00d2ff;">예상 #${escapeHtml(String(d.expectedRank))}위</span>` : ''}
            </div>
            <span class="sub-time">제출: ${escapeHtml(item.createdAt)}</span>
          </div>

          <div class="sub-card-body">
            <div class="sub-info-col">
              <h3 class="sub-title">${escapeHtml(d.title)}</h3>
              <div class="sub-detail-grid">
                <div class="sub-detail-item"><span class="sub-detail-label">제작자:</span><span class="sub-detail-val">${escapeHtml(d.creator)}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">베리파이어:</span><span class="sub-detail-val">${escapeHtml(d.verifier || d.creator)}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">예상 순위:</span><span class="sub-detail-val" style="color:#00d2ff;">${d.expectedRank ? `#${escapeHtml(String(d.expectedRank))}위` : '미지정 (협의 필요)'}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">GD 맵 ID:</span><span class="sub-detail-val">${escapeHtml(d.mapId || '-')}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">오브젝트:</span><span class="sub-detail-val">${escapeHtml(d.objects || '-')}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">길이:</span><span class="sub-detail-val">${escapeHtml(d.length || '-')}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">Enjoyment:</span><span class="sub-detail-val">${d.enjoyment ? `${escapeHtml(d.enjoyment)}/10` : '-'}</span></div>
                <div class="sub-detail-item" style="grid-column: span 2;"><span class="sub-detail-label">음악:</span><span class="sub-detail-val">${escapeHtml(d.song?.name || '-')} (by ${escapeHtml(d.song?.artist || '-')})</span></div>
              </div>
            </div>
            <div class="sub-video-col">
              ${videoHtml}
            </div>
          </div>

          <div class="sub-card-footer">
            <div class="sub-submitter-note">
              <span>제출자: <strong>${escapeHtml(d.submitter || '익명')}</strong></span>
            </div>
            <div class="sub-action-btns">
              <button class="btn-approve btn-approve-level" data-id="${item.id}">승인 및 등록</button>
              <button class="btn-reject btn-reject-item" data-id="${item.id}">반려</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 이벤트 바인딩
    levelListContainer.querySelectorAll('.btn-approve-level').forEach(btn => {
      btn.addEventListener('click', () => openApproveLevelModal(btn.dataset.id));
    });
    levelListContainer.querySelectorAll('.btn-reject-item').forEach(btn => {
      btn.addEventListener('click', () => rejectSubmission(btn.dataset.id));
    });
  }

  // --- 6. 클리어 검토 카드 렌더링 ---
  const clearListContainer = document.getElementById('admin-clear-list');
  const clearFilterSelect = document.getElementById('filter-clear-cat');

  if (clearFilterSelect) {
    clearFilterSelect.addEventListener('change', () => {
      const items = getSubmissions().filter(it => it.type === 'clear' && it.status === 'pending');
      renderClearSubmissions(items);
    });
  }

  function renderClearSubmissions(items) {
    if (!clearListContainer) return;
    const selectedMode = clearFilterSelect?.value || 'all';

    const filtered = items.filter(it => selectedMode === 'all' || it.category === selectedMode);

    if (filtered.length === 0) {
      clearListContainer.innerHTML = '<p class="history-empty-text">검토 대기 중인 클리어 신청서가 없습니다.</p>';
      return;
    }

    clearListContainer.innerHTML = filtered.map(item => {
      const d = item.data;
      const ytId = extractYoutubeId(d.videoLink);
      const videoHtml = ytId
        ? `<div class="admin-video-thumb"><iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen></iframe></div>`
        : `<div class="admin-video-thumb" style="display:flex;align-items:center;justify-content:center;color:#666;">영상 없음</div>`;

      return `
        <div class="submission-admin-card" data-id="${item.id}">
          <div class="sub-card-top">
            <div class="sub-meta-badges">
              <span class="badge-mode mode-${item.category}">${item.category}</span>
              <span class="badge-mode" style="background: rgba(46, 213, 115, 0.2); border-color: #2ed573; color: #2ed573;">${d.percent}% 달성</span>
            </div>
            <span class="sub-time">제출: ${escapeHtml(item.createdAt)}</span>
          </div>

          <div class="sub-card-body">
            <div class="sub-info-col">
              <h3 class="sub-title">${escapeHtml(d.levelTitle)}</h3>
              <div class="sub-detail-grid">
                <div class="sub-detail-item"><span class="sub-detail-label">플레이어:</span><span class="sub-detail-val" style="color:#2ed573;">${escapeHtml(d.player)}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">달성 일자:</span><span class="sub-detail-val">${escapeHtml(d.date || '-')}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">어템 수:</span><span class="sub-detail-val">${escapeHtml(d.attempts || '-')}</span></div>
                <div class="sub-detail-item"><span class="sub-detail-label">카테고리:</span><span class="sub-detail-val">${escapeHtml(item.category.toUpperCase())}</span></div>
              </div>
              ${d.comment ? `<p style="font-size: 20px; color: rgba(255,255,255,0.7); margin: 0.6rem 0;">💬 소감: "${escapeHtml(d.comment)}"</p>` : ''}
            </div>
            <div class="sub-video-col">
              ${videoHtml}
            </div>
          </div>

          <div class="sub-card-footer">
            <div class="sub-submitter-note">
              <span>영상 링크: <a href="${escapeHtml(d.videoLink)}" target="_blank" rel="noopener noreferrer" style="color: #00d2ff;">${escapeHtml(d.videoLink)}</a></span>
            </div>
            <div class="sub-action-btns">
              <button class="btn-approve btn-approve-clear" data-id="${item.id}">클리어 승인</button>
              <button class="btn-reject btn-reject-item" data-id="${item.id}">반려</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 이벤트 바인딩
    clearListContainer.querySelectorAll('.btn-approve-clear').forEach(btn => {
      btn.addEventListener('click', () => approveClearSubmission(btn.dataset.id));
    });
    clearListContainer.querySelectorAll('.btn-reject-item').forEach(btn => {
      btn.addEventListener('click', () => rejectSubmission(btn.dataset.id));
    });
  }

  // --- 7. 처리 완료 내역 렌더링 ---
  const processedListContainer = document.getElementById('admin-processed-list');
  const clearProcessedBtn = document.getElementById('admin-clear-processed-btn');

  function renderProcessedSubmissions(items) {
    if (!processedListContainer) return;
    if (items.length === 0) {
      processedListContainer.innerHTML = '<p class="history-empty-text">처리 완료된 내역이 없습니다.</p>';
      return;
    }

    processedListContainer.innerHTML = items.map(item => {
      const isLevel = item.type === 'level';
      const isApproved = item.status === 'approved';
      const title = isLevel ? item.data.title : `${item.data.levelTitle} (${item.data.player})`;
      const statusBadge = isApproved
        ? '<span class="history-status-badge status-approved">승인 완료</span>'
        : '<span class="history-status-badge status-rejected">반려됨</span>';

      return `
        <div class="history-item-card">
          <div class="history-item-left">
            <span class="badge-mode mode-${item.category}">${item.category} • ${isLevel ? '레벨' : '클리어'}</span>
            <div class="history-item-title">${escapeHtml(title)}</div>
            <div class="history-item-meta">제출: ${escapeHtml(item.createdAt)} ${item.processedAt ? `• 처리: ${escapeHtml(item.processedAt)}` : ''}</div>
          </div>
          <div class="history-item-right">
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');
  }

  if (clearProcessedBtn) {
    clearProcessedBtn.addEventListener('click', () => {
      if (confirm('승인 및 반려 완료된 내역을 모두 정리하시겠습니까? (대기 중인 신청서는 유지됩니다)')) {
        const remaining = getSubmissions().filter(it => it.status === 'pending');
        saveSubmissions(remaining);
      }
    });
  }

  // --- 8. 레벨 승인 모달 및 처리 로직 ---
  const approveLevelModal = document.getElementById('approve-level-modal');
  const approveLevelModalName = document.getElementById('approve-modal-level-name');
  const approveTargetRank = document.getElementById('approve-target-rank');
  const approveHistoryDetail = document.getElementById('approve-history-detail');
  const approveLevelConfirmBtn = document.getElementById('approve-level-confirm-btn');
  const approveLevelCancelBtn = document.getElementById('approve-level-cancel-btn');

  function openApproveLevelModal(submissionId) {
    const items = getSubmissions();
    const item = items.find(it => it.id === submissionId);
    if (!item) return;

    pendingApproveLevelItem = item;
    const cat = item.category;
    const currentLevelsCount = (siteData[cat]?.levels || []).length;

    approveLevelModalName.textContent = `[${cat.toUpperCase()}] "${item.data.title}" by ${item.data.creator}`;
    
    let defaultRank = 1;
    if (item.data.expectedRank && !isNaN(item.data.expectedRank)) {
      defaultRank = Math.min(Math.max(1, parseInt(item.data.expectedRank, 10)), currentLevelsCount + 1);
    }

    approveTargetRank.value = defaultRank;
    approveTargetRank.max = currentLevelsCount + 1;
    approveHistoryDetail.value = `${defaultRank}위에 새로운 레벨이 등록되었습니다.`;

    approveTargetRank.oninput = () => {
      const r = parseInt(approveTargetRank.value, 10) || 1;
      approveHistoryDetail.value = `${r}위에 새로운 레벨이 등록되었습니다.`;
    };

    approveLevelModal.style.display = 'flex';
  }

  if (approveLevelCancelBtn) {
    approveLevelCancelBtn.addEventListener('click', () => {
      approveLevelModal.style.display = 'none';
      pendingApproveLevelItem = null;
    });
  }

  if (approveLevelConfirmBtn) {
    approveLevelConfirmBtn.addEventListener('click', () => {
      if (!pendingApproveLevelItem) return;

      const item = pendingApproveLevelItem;
      const cat = item.category;
      const targetRank = parseInt(approveTargetRank.value, 10) || 1;
      const historyDetail = approveHistoryDetail.value.trim() || `${targetRank}위에 새로운 레벨이 등록되었습니다.`;
      const todayStr = new Date().toISOString().slice(0, 10);

      const d = item.data;
      const ytId = extractYoutubeId(d.video);
      const embedVideo = ytId ? `https://www.youtube.com/embed/${ytId}` : d.video;

      const newLevelObj = {
        id: targetRank,
        title: d.title,
        creator: d.creator,
        verifier: d.verifier || d.creator,
        video: embedVideo,
        rating: d.rating || 'Featured',
        map: {
          mapId: d.mapId || '-',
          length: d.length || 'Long',
          objects: d.objects || '-',
          uploadDate: todayStr
        },
        song: {
          name: d.song?.name || '-',
          artist: d.song?.artist || '-',
          ...(d.song?.id ? { id: d.song.id } : {})
        },
        description: d.description || '',
        enjoyment: d.enjoyment || '',
        framePerfect: { fps: {}, total: 0 },
        gameplay: { modeRatio: {}, speedRatio: {} },
        tags: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : ['Overall'],
        clears: []
      };

      // 순위 삽입 및 기존 레벨 밀기
      const levels = siteData[cat].levels || [];
      const history = siteData[cat].history || [];

      // 0-indexed 삽입 위치: targetRank - 1
      const insertIdx = Math.max(0, Math.min(levels.length, targetRank - 1));
      levels.splice(insertIdx, 0, newLevelObj);

      // 전체 id(순위) 재계산
      levels.forEach((lvl, idx) => {
        lvl.id = idx + 1;
      });

      // 히스토리 항목 추가
      const newHistoryEntry = {
        time: todayStr,
        type: 'add',
        title: d.title,
        detail: historyDetail
      };
      history.unshift(newHistoryEntry);

      // 신청서 상태 업데이트
      item.status = 'approved';
      item.processedAt = new Date().toLocaleString('ko-KR');

      const allItems = getSubmissions();
      const itemIdx = allItems.findIndex(it => it.id === item.id);
      if (itemIdx !== -1) {
        allItems[itemIdx] = item;
        saveSubmissions(allItems);
      }

      // 뉴스 추가 연동
      if (window.addAutoForumNews) {
        window.addAutoForumNews(`[신규 레벨] ${d.title}이(가) ${cat.toUpperCase()} ${targetRank}위에 등록되었습니다!`, todayStr);
      }

      alert(`[${cat.toUpperCase()}] "${d.title}" 레벨이 ${targetRank}위로 승인 등록되었습니다.`);
      approveLevelModal.style.display = 'none';
      pendingApproveLevelItem = null;
    });
  }

  // --- 9. 클리어 승인 처리 로직 ---
  function approveClearSubmission(submissionId) {
    const items = getSubmissions();
    const item = items.find(it => it.id === submissionId);
    if (!item) return;

    const cat = item.category;
    const d = item.data;

    const levels = siteData[cat].levels || [];
    const targetLevel = levels.find(l => String(l.title).trim().toLowerCase() === String(d.levelTitle).trim().toLowerCase());

    if (!targetLevel) {
      alert(`해당 모드(${cat.toUpperCase()})에서 "${d.levelTitle}" 레벨을 찾을 수 없습니다.`);
      return;
    }

    if (!Array.isArray(targetLevel.clears)) {
      targetLevel.clears = [];
    }

    const newClearRecord = {
      player: d.player,
      name: d.player,
      percent: d.percent,
      date: d.date,
      link: d.videoLink,
      video: d.videoLink
    };

    // 기존 기록이 있는지 확인 (동일 유저)
    const existingIdx = targetLevel.clears.findIndex(c => String(c.player || c.name || '').toLowerCase() === d.player.toLowerCase());
    if (existingIdx !== -1) {
      targetLevel.clears[existingIdx] = newClearRecord;
    } else {
      targetLevel.clears.push(newClearRecord);
    }

    // 정렬 (퍼센트 높은 순, 날짜 순)
    targetLevel.clears.sort((a, b) => {
      const pA = a.percent != null ? parseFloat(a.percent) : 100;
      const pB = b.percent != null ? parseFloat(b.percent) : 100;
      if (pB !== pA) return pB - pA;
      return String(a.date || '').localeCompare(String(b.date || ''));
    });

    // 신청서 상태 업데이트
    item.status = 'approved';
    item.processedAt = new Date().toLocaleString('ko-KR');

    const itemIdx = items.findIndex(it => it.id === item.id);
    if (itemIdx !== -1) {
      items[itemIdx] = item;
      saveSubmissions(items);
    }

    // 뉴스 추가 연동
    if (window.addAutoForumNews) {
      const newsContent = d.percent === 100
        ? `${d.player}이(가) ${d.levelTitle}을(를) 클리어했습니다.`
        : `${d.player}이(가) ${d.levelTitle}을(를) ${d.percent}% 달성했습니다.`;
      window.addAutoForumNews(newsContent, d.date);
    }

    alert(`"${d.player}" 님의 ${d.levelTitle} (${d.percent}%) 클리어 기록이 승인되었습니다.`);
  }

  // --- 10. 신청서 반려 처리 ---
  function rejectSubmission(submissionId) {
    const reason = prompt('반려 사유를 입력해주세요 (선택):');
    if (reason === null) return; // 취소한 경우

    const items = getSubmissions();
    const item = items.find(it => it.id === submissionId);
    if (!item) return;

    item.status = 'rejected';
    item.rejectReason = reason || '관리자 검토 기준 미달';
    item.processedAt = new Date().toLocaleString('ko-KR');

    saveSubmissions(items);
    alert('신청서가 반려 처리되었습니다.');
  }

  // --- 11. JSON 다운로드 및 클립보드 복사 엔진 ---
  function downloadJsonFile(filename, dataObj) {
    const str = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyJsonToClipboard(dataObj, btn) {
    const str = JSON.stringify(dataObj, null, 2);
    navigator.clipboard.writeText(str).then(() => {
      const orig = btn.textContent;
      btn.textContent = '복사 완료';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });
  }

  // Classic
  document.getElementById('export-download-classic')?.addEventListener('click', () => {
    downloadJsonFile('classic.json', siteData.classic);
  });
  document.getElementById('export-copy-classic')?.addEventListener('click', (e) => {
    copyJsonToClipboard(siteData.classic, e.target);
  });

  // Challenge
  document.getElementById('export-download-challenge')?.addEventListener('click', () => {
    downloadJsonFile('challenge.json', siteData.challenge);
  });
  document.getElementById('export-copy-challenge')?.addEventListener('click', (e) => {
    copyJsonToClipboard(siteData.challenge, e.target);
  });

  // Platformer
  document.getElementById('export-download-platformer')?.addEventListener('click', () => {
    downloadJsonFile('platformer.json', siteData.platformer);
  });
  document.getElementById('export-copy-platformer')?.addEventListener('click', (e) => {
    copyJsonToClipboard(siteData.platformer, e.target);
  });

  // GitHub 일괄 자동 푸시
  const ghSyncAllBtn = document.getElementById('admin-gh-sync-all-btn');
  if (ghSyncAllBtn) {
    ghSyncAllBtn.addEventListener('click', async () => {
      if (!window.GitHubSyncEngine) {
        alert('GitHub 동기화 엔진을 찾을 수 없습니다.');
        return;
      }
      const config = window.GitHubSyncEngine.getConfig();
      if (!config.owner || !config.repo || !config.token) {
        alert('GitHub API 설정이 누락되었습니다. [환경 설정] 탭에서 Token, Owner, Repo를 먼저 입력해주세요.');
        document.querySelector('.admin-tab-btn[data-tab="settings"]')?.click();
        return;
      }

      if (!confirm(`Classic, Challenge, Platformer 레벨 데이터를 GitHub (${config.owner}/${config.repo})에 자동으로 커밋 & 푸시하시겠습니까?`)) {
        return;
      }

      ghSyncAllBtn.disabled = true;
      const origText = ghSyncAllBtn.textContent;
      ghSyncAllBtn.textContent = 'GitHub 동기화 진행 중...';

      try {
        await window.GitHubSyncEngine.commitAndPush('level/classic.json', siteData.classic, 'Update classic levels via Admin Portal');
        await window.GitHubSyncEngine.commitAndPush('level/challenge.json', siteData.challenge, 'Update challenge levels via Admin Portal');
        await window.GitHubSyncEngine.commitAndPush('level/platformer.json', siteData.platformer, 'Update platformer levels via Admin Portal');

        alert('모든 레벨 데이터가 GitHub에 성공적으로 자동 커밋 & 푸시되었습니다.');
      } catch (err) {
        alert(`GitHub 동기화 오류: ${err.message}`);
      } finally {
        ghSyncAllBtn.disabled = false;
        ghSyncAllBtn.textContent = origText;
      }
    });
  }

  // --- 12. 패킷 가져오기 (Import) ---
  const importModal = document.getElementById('admin-import-modal');
  const importOpenBtn = document.getElementById('admin-import-open-btn');
  const importConfirmBtn = document.getElementById('import-json-confirm-btn');
  const importCancelBtn = document.getElementById('import-json-cancel-btn');
  const importTextarea = document.getElementById('import-json-textarea');

  if (importOpenBtn) {
    importOpenBtn.addEventListener('click', () => {
      importTextarea.value = '';
      importModal.style.display = 'flex';
    });
  }

  if (importCancelBtn) {
    importCancelBtn.addEventListener('click', () => {
      importModal.style.display = 'none';
    });
  }

  if (importConfirmBtn) {
    importConfirmBtn.addEventListener('click', () => {
      const val = (importTextarea?.value || '').trim();
      if (!val) {
        alert('불러올 JSON 텍스트를 입력해주세요.');
        return;
      }

      try {
        const parsed = JSON.parse(val);
        const currentList = getSubmissions();

        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p.id && !currentList.some(c => c.id === p.id)) {
              currentList.unshift(p);
            }
          });
        } else if (parsed && parsed.id) {
          if (!currentList.some(c => c.id === parsed.id)) {
            currentList.unshift(parsed);
          } else {
            alert('이미 존재하는 신청서 ID입니다.');
            return;
          }
        } else {
          throw new Error('올바른 신청서 패킷 구조가 아닙니다.');
        }

        saveSubmissions(currentList);
        alert('성공적으로 신청서를 대기열에 추가했습니다!');
        importModal.style.display = 'none';
      } catch (err) {
        alert(`JSON 파싱 오류: ${err.message}`);
      }
    });
  }

  // --- 13. 환경 설정 엔진 (비밀번호, 웹훅, GitHub) ---
  // 비밀번호 변경
  document.getElementById('set-pw-save-btn')?.addEventListener('click', () => {
    const p1 = document.getElementById('set-new-pw')?.value || '';
    const p2 = document.getElementById('set-new-pw-confirm')?.value || '';

    if (!p1) {
      alert('새 비밀번호를 입력해주세요.');
      return;
    }
    if (p1 !== p2) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    localStorage.setItem(ADMIN_PW_KEY, p1);
    document.getElementById('set-new-pw').value = '';
    document.getElementById('set-new-pw-confirm').value = '';
    alert('관리자 비밀번호가 성공적으로 변경되었습니다!');
  });

  // Discord Webhook
  const webhookInput = document.getElementById('set-webhook-url');
  if (webhookInput) {
    webhookInput.value = localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
  }

  document.getElementById('set-webhook-save-btn')?.addEventListener('click', () => {
    const url = (webhookInput?.value || '').trim();
    localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
    alert('디스코드 웹훅 URL이 저장되었습니다.');
  });

  document.getElementById('set-webhook-test-btn')?.addEventListener('click', async () => {
    const url = (webhookInput?.value || '').trim();
    if (!url) {
      alert('웹훅 URL을 먼저 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🔔 **[초친 포럼] 관리자 알림 웹훅 테스트 메시지입니다! 정상 작동 중입니다.**'
        })
      });
      if (res.ok) {
        alert('디스코드 테스트 메시지가 성공적으로 발송되었습니다!');
      } else {
        alert(`발송 실패: 상태 코드 ${res.status}`);
      }
    } catch (e) {
      alert(`네트워크 오류: ${e.message}`);
    }
  });

  // GitHub 설정
  const ghTokenInput = document.getElementById('set-gh-token');
  const ghOwnerInput = document.getElementById('set-gh-owner');
  const ghRepoInput = document.getElementById('set-gh-repo');

  if (ghTokenInput) ghTokenInput.value = localStorage.getItem('dev_gh_token') || '';
  if (ghOwnerInput) ghOwnerInput.value = localStorage.getItem('dev_gh_owner') || '';
  if (ghRepoInput) ghRepoInput.value = localStorage.getItem('dev_gh_repo') || '';

  document.getElementById('set-gh-save-btn')?.addEventListener('click', () => {
    localStorage.setItem('dev_gh_token', (ghTokenInput?.value || '').trim());
    localStorage.setItem('dev_gh_owner', (ghOwnerInput?.value || '').trim());
    localStorage.setItem('dev_gh_repo', (ghRepoInput?.value || '').trim());
    alert('GitHub 설정이 저장되었습니다.');
  });

  // 대시보드 초기화
  async function initDashboard() {
    await loadAllSiteData();
    refreshDashboardViews();
  }

  // 시작
  checkAuthStatus();
});
