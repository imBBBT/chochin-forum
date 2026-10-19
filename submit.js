/* submit.js - 초친 포럼 제출 페이지 엔진 */

document.addEventListener('DOMContentLoaded', () => {
  // 스토리지 키 상수
  const SUBMISSIONS_STORAGE_KEY = 'chochin_submissions_queue';
  const WEBHOOK_STORAGE_KEY = 'chochin_admin_webhook_url';

  // 상태 변수
  let cachedLevels = {
    classic: [],
    challenge: [],
    platformer: []
  };
  let selectedTags = new Set(['Overall']);
  let activeTab = 'level';

  // 태그 목록 (classic.js 기준 주요 태그들)
  const PRESET_TAGS = [
    'Overall', 'Cube', 'Ship', 'Ball', 'UFO', 'Wave', 'Robot', 'Spider', 'Swing',
    'Timing', 'Fast Paced', 'Slow Paced', 'Sync', 'Duals', 'Memory', 'Flow',
    'Design', 'Art', 'Bossfight', 'Chokepoints', 'Learny', 'High CPS',
    'Nerve Control', 'Puzzle', 'Avoidance', 'Gimmicky', 'Short', 'Long', 'XL'
  ];

  // --- 1. 탭 전환 로직 ---
  const tabButtons = document.querySelectorAll('.submit-tab-btn');
  const sections = {
    level: document.getElementById('tab-level'),
    clear: document.getElementById('tab-clear'),
    history: document.getElementById('tab-history')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      activeTab = target;

      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      Object.entries(sections).forEach(([key, sec]) => {
        if (sec) sec.classList.toggle('active', key === target);
      });

      if (target === 'clear') {
        const checkedMode = document.querySelector('input[name="clear-category"]:checked')?.value || 'classic';
        loadLevelListForClear(checkedMode);
      } else if (target === 'history') {
        renderHistoryList();
      }
    });
  });

  // --- 2. 카테고리 라디오 카드 전환 스타일 연동 ---
  function setupCategoryRadioCards(radioName, onChange) {
    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        radios.forEach(r => {
          const card = r.closest('.category-radio-card');
          if (card) card.classList.toggle('active', r.checked);
        });
        if (onChange) onChange(radio.value);
      });
    });
  }

  setupCategoryRadioCards('level-category');
  setupCategoryRadioCards('clear-category', (mode) => {
    loadLevelListForClear(mode);
  });

  // --- 3. 태그 선택기 초기화 ---
  const tagChipsContainer = document.getElementById('lvl-tag-chips-container');
  const customTagInput = document.getElementById('lvl-custom-tag-input');
  const customTagAddBtn = document.getElementById('lvl-custom-tag-add-btn');

  function renderTagChips() {
    if (!tagChipsContainer) return;
    tagChipsContainer.innerHTML = '';

    const allTags = Array.from(new Set([...PRESET_TAGS, ...Array.from(selectedTags)]));
    allTags.forEach(tag => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `tag-picker-chip ${selectedTags.has(tag) ? 'selected' : ''}`;
      chip.textContent = selectedTags.has(tag) ? `✓ #${tag}` : `#${tag}`;
      chip.addEventListener('click', () => {
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
        } else {
          selectedTags.add(tag);
        }
        renderTagChips();
      });
      tagChipsContainer.appendChild(chip);
    });
  }

  if (customTagAddBtn && customTagInput) {
    const addCustomTag = () => {
      const val = customTagInput.value.trim().replace(/^#/, '');
      if (val) {
        selectedTags.add(val);
        customTagInput.value = '';
        renderTagChips();
      }
    };
    customTagAddBtn.addEventListener('click', addCustomTag);
    customTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomTag();
      }
    });
  }
  renderTagChips();

  // --- 4. 유튜브 링크 실시간 미리보기 엔진 ---
  function extractYoutubeId(url) {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
    const match = String(url).match(regExp);
    return (match && match[1]) ? match[1] : null;
  }

  function setupVideoPreview(inputId, containerId, iframeId, closeBtnId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const iframe = document.getElementById(iframeId);
    const closeBtn = document.getElementById(closeBtnId);

    if (!input || !container || !iframe) return;

    const updatePreview = () => {
      const ytId = extractYoutubeId(input.value.trim());
      if (ytId) {
        iframe.src = `https://www.youtube.com/embed/${ytId}`;
        container.style.display = 'flex';
      } else {
        container.style.display = 'none';
        iframe.src = '';
      }
    };

    input.addEventListener('input', debounce(updatePreview, 350));
    input.addEventListener('paste', () => setTimeout(updatePreview, 50));

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.style.display = 'none';
        iframe.src = '';
      });
    }
  }

  setupVideoPreview('lvl-video', 'lvl-video-preview-container', 'lvl-video-iframe', 'lvl-video-preview-close');
  setupVideoPreview('clear-video-link', 'clear-video-preview-container', 'clear-video-iframe', 'clear-video-preview-close');

  // --- 5. GD 레벨 정보 자동 조회 ---
  const fetchGdBtn = document.getElementById('lvl-fetch-gd-btn');
  const mapIdInput = document.getElementById('lvl-mapid');

  if (fetchGdBtn && mapIdInput) {
    fetchGdBtn.addEventListener('click', async () => {
      const rawMapId = mapIdInput.value.trim();
      const cleanId = rawMapId.replace(/\D/g, '');
      if (!cleanId) {
        alert('올바른 숫자 형식의 GD 맵 ID를 입력해주세요.');
        mapIdInput.focus();
        return;
      }

      fetchGdBtn.disabled = true;
      const originalText = fetchGdBtn.textContent;
      fetchGdBtn.textContent = '조회 중...';

      try {
        let info = null;
        if (typeof window.fetchGdLevelData === 'function') {
          info = await window.fetchGdLevelData(cleanId);
        } else {
          try {
            const res = await fetch(`https://gdbrowser.com/api/level/${cleanId}`);
            if (res.ok) info = await res.json();
          } catch (e) {
            console.warn('직접 조회 실패, 프록시 시도');
          }
          if (!info || !info.name) {
            const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://gdbrowser.com/api/level/${cleanId}`)}`);
            if (proxyRes.ok) info = await proxyRes.json();
          }
        }

        if (!info || (!info.name && !info.title)) {
          throw new Error('레벨 정보를 불러올 수 없습니다. 맵 ID를 다시 확인해주세요.');
        }

        // 폼 필드 자동 채우기
        const lvlTitle = info.name || info.title || '';
        const lvlAuthor = info.author || info.creator || '';
        const lvlObjects = info.objects != null ? String(info.objects) : '';
        const lvlLength = info.length || '';
        const lvlSongName = info.songName || info.song?.name || '';
        const lvlSongArtist = info.songArtist || info.songAuthor || info.song?.artist || '';
        const lvlSongId = info.songId != null ? String(info.songId) : (info.songID != null ? String(info.songID) : '');

        if (lvlTitle && document.getElementById('lvl-title')) document.getElementById('lvl-title').value = lvlTitle;
        if (lvlAuthor && document.getElementById('lvl-creator')) document.getElementById('lvl-creator').value = lvlAuthor;
        if (lvlObjects && document.getElementById('lvl-objects')) document.getElementById('lvl-objects').value = lvlObjects;
        if (lvlLength && document.getElementById('lvl-length')) document.getElementById('lvl-length').value = lvlLength;
        if (lvlSongName && document.getElementById('lvl-song-name')) document.getElementById('lvl-song-name').value = lvlSongName;
        if (lvlSongArtist && document.getElementById('lvl-song-artist')) document.getElementById('lvl-song-artist').value = lvlSongArtist;
        if (lvlSongId && document.getElementById('lvl-song-id')) document.getElementById('lvl-song-id').value = lvlSongId;

        fetchGdBtn.textContent = '조회 완료';
        setTimeout(() => {
          fetchGdBtn.textContent = originalText;
          fetchGdBtn.disabled = false;
        }, 1500);
      } catch (err) {
        alert(`GD 레벨 정보 조회 안내:\n${err.message}\n\n• 외부 GD 서버 일시 지연 또는 미등록 맵 ID일 수 있습니다.\n• 아래 항목들에 레벨 정보를 직접 입력하셔도 정상 제출 및 검토 등록이 가능합니다.`);
        fetchGdBtn.textContent = originalText;
        fetchGdBtn.disabled = false;
      }
    });
  }

  // --- 6. 클리어 탭: 레벨 목록 로드 및 검색 필터링 ---
  const clearLevelSelect = document.getElementById('clear-level-select');
  const clearLevelSearch = document.getElementById('clear-level-search');
  const clearLevelMeta = document.getElementById('clear-level-meta-text');

  async function loadLevelListForClear(mode) {
    if (!clearLevelSelect) return;

    if (!cachedLevels[mode] || cachedLevels[mode].length === 0) {
      clearLevelSelect.innerHTML = '<option value="">레벨 목록 로딩 중...</option>';
      try {
        const res = await fetch(`level/${mode}.json`);
        if (res.ok) {
          const json = await res.json();
          cachedLevels[mode] = Array.isArray(json.levels) ? json.levels : [];
        } else {
          cachedLevels[mode] = [];
        }
      } catch (e) {
        console.error('레벨 데이터 로드 실패:', e);
        cachedLevels[mode] = [];
      }
    }

    renderLevelSelectOptions(mode, clearLevelSearch?.value || '');
  }

  function renderLevelSelectOptions(mode, filterKeyword) {
    if (!clearLevelSelect) return;
    const levels = cachedLevels[mode] || [];
    const keyword = filterKeyword.trim().toLowerCase();

    clearLevelSelect.innerHTML = '<option value="">-- 레벨을 선택해주세요 --</option>';

    const filtered = levels.filter(lvl => {
      if (!keyword) return true;
      const title = String(lvl.title || '').toLowerCase();
      const creator = String(lvl.creator || '').toLowerCase();
      return title.includes(keyword) || creator.includes(keyword);
    });

    if (filtered.length === 0) {
      clearLevelSelect.innerHTML = '<option value="">검색 결과가 없습니다.</option>';
      return;
    }

    filtered.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      const rank = lvl.id != null ? `#${lvl.id}` : `#${idx + 1}`;
      opt.value = lvl.title;
      opt.textContent = `${rank} - ${lvl.title} (by ${lvl.creator || 'Unknown'})`;
      opt.dataset.rank = rank;
      opt.dataset.creator = lvl.creator || '';
      opt.dataset.mapid = lvl.map?.mapId || lvl.mapId || '';
      clearLevelSelect.appendChild(opt);
    });
  }

  if (clearLevelSearch) {
    clearLevelSearch.addEventListener('input', (e) => {
      const checkedMode = document.querySelector('input[name="clear-category"]:checked')?.value || 'classic';
      renderLevelSelectOptions(checkedMode, e.target.value);
    });
  }

  if (clearLevelSelect) {
    clearLevelSelect.addEventListener('change', () => {
      const selected = clearLevelSelect.selectedOptions[0];
      if (selected && selected.value) {
        const rank = selected.dataset.rank || '';
        const creator = selected.dataset.creator || '';
        const mapid = selected.dataset.mapid ? ` / Map ID: ${selected.dataset.mapid}` : '';
        clearLevelMeta.textContent = `선택된 레벨: ${selected.value} (${rank}위, 제작: ${creator}${mapid})`;
      } else {
        clearLevelMeta.textContent = '레벨을 선택하면 제작자와 현재 랭크가 표시됩니다.';
      }
    });
  }

  // --- 7. 사용자 닉네임 기본값 자동 연동 ---
  function syncUserNicknameToInputs() {
    const savedName = localStorage.getItem('nickname') || localStorage.getItem('chochin_player_nickname') || '';
    if (savedName) {
      const lvlSubmitter = document.getElementById('lvl-submitter-name');
      const clrPlayer = document.getElementById('clear-player-name');
      if (lvlSubmitter && !lvlSubmitter.value) lvlSubmitter.value = savedName;
      if (clrPlayer && !clrPlayer.value) clrPlayer.value = savedName;
    }
  }
  syncUserNicknameToInputs();

  // 클리어 날짜 기본값을 오늘 날짜로 세팅
  const clearDateInput = document.getElementById('clear-date');
  if (clearDateInput && !clearDateInput.value) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    clearDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- 8. 스토리지 저장 & 웹훅 발송 엔진 ---
  function getStoredSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(SUBMISSIONS_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveSubmission(item) {
    const list = getStoredSubmissions();
    list.unshift(item);
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(list));

    // 관리자 웹훅 전송 시도
    sendDiscordWebhook(item);

    // 성공 모달 띄우기
    showSuccessModal(item);
  }

  async function sendDiscordWebhook(submission) {
    const webhookUrl = localStorage.getItem(WEBHOOK_STORAGE_KEY);
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return;
    }

    try {
      const isLevel = submission.type === 'level';
      let packetContent = JSON.stringify(submission, null, 2);
      if (packetContent.length > 1700) {
        packetContent = JSON.stringify(submission);
      }
      if (packetContent.length > 1850) {
        packetContent = packetContent.slice(0, 1840) + '...}';
      }

      const adminUrl = window.location.protocol.startsWith('http')
        ? window.location.href.replace(/submit\.html.*/i, 'admin.html')
        : 'https://imbbbt.github.io/chochin-forum/admin.html';

      const embed = {
        title: isLevel ? `[신규 레벨 신청] ${submission.data.title}` : `[클리어 기록 제출] ${submission.data.levelTitle} (${submission.data.percent}%)`,
        color: isLevel ? 0x00d2ff : 0x2ed573,
        fields: isLevel ? [
          { name: '카테고리', value: submission.category.toUpperCase(), inline: true },
          { name: '제작자 / 베리파이어', value: `${submission.data.creator} / ${submission.data.verifier || submission.data.creator}`, inline: true },
          { name: '예상 순위', value: submission.data.expectedRank ? `${submission.data.expectedRank}위` : '미지정 (관리자 협의)', inline: true },
          { name: 'GD 맵 ID', value: submission.data.mapId || '-', inline: true },
          { name: 'Enjoyment', value: submission.data.enjoyment ? `${submission.data.enjoyment}/10` : '-', inline: true },
          { name: '영상 링크', value: submission.data.video || '-', inline: false },
          { name: '제출자', value: submission.data.submitter || '익명', inline: false }
        ] : [
          { name: '카테고리', value: submission.category.toUpperCase(), inline: true },
          { name: '플레이어', value: submission.data.player, inline: true },
          { name: '달성 퍼센트', value: `${submission.data.percent}%`, inline: true },
          { name: '달성 일자', value: submission.data.date, inline: true },
          { name: '영상 링크', value: submission.data.videoLink, inline: false },
          { name: '코멘트', value: submission.data.comment || '없음', inline: false }
        ],
        footer: { text: `초친 포럼 제출 시스템 • ID: ${submission.id}` },
        timestamp: new Date().toISOString()
      };

      const webhookBody = {
        content: `📥 **[초친 포럼 새로운 검토 신청서 접수]**\n아래 코드블록 우측의 **\`복사\`** 버튼을 눌러 JSON 패킷을 복사한 뒤, **[관리자 검토 센터](${adminUrl})**의 **[패킷 가져오기]**에서 불러오세요.\n\`\`\`json\n${packetContent}\n\`\`\``,
        embeds: [embed]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody)
      });
    } catch (err) {
      console.warn('Discord Webhook 발송 실패:', err);
    }
  }

  // --- 9. 모달 관리 ---
  const successModal = document.getElementById('submit-success-modal');
  const modalCloseBtn = document.getElementById('submit-modal-close-btn');
  const modalCopyPacketBtn = document.getElementById('modal-copy-packet-btn');
  const modalPacketTextarea = document.getElementById('modal-packet-textarea');

  function showSuccessModal(item) {
    if (!successModal) return;
    const packetString = JSON.stringify(item, null, 2);
    if (modalPacketTextarea) modalPacketTextarea.value = packetString;
    successModal.style.display = 'flex';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      successModal.style.display = 'none';
      if (activeTab === 'history') renderHistoryList();
    });
  }

  if (modalCopyPacketBtn && modalPacketTextarea) {
    modalCopyPacketBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(modalPacketTextarea.value).then(() => {
        const orig = modalCopyPacketBtn.textContent;
        modalCopyPacketBtn.textContent = '복사 완료';
        setTimeout(() => { modalCopyPacketBtn.textContent = orig; }, 1800);
      }).catch(() => {
        modalPacketTextarea.select();
        document.execCommand('copy');
        alert('패킷이 클립보드에 복사되었습니다.');
      });
    });
  }

  // --- 10. 레벨 제출 폼 제출 이벤트 ---
  const levelForm = document.getElementById('level-submit-form');
  if (levelForm) {
    levelForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const category = document.querySelector('input[name="level-category"]:checked')?.value || 'classic';
      const mapId = document.getElementById('lvl-mapid')?.value.trim();
      const title = document.getElementById('lvl-title')?.value.trim();
      const creator = document.getElementById('lvl-creator')?.value.trim();
      const verifier = document.getElementById('lvl-verifier')?.value.trim();
      const expectedRankVal = document.getElementById('lvl-expected-rank')?.value.trim();
      const expectedRank = expectedRankVal ? parseInt(expectedRankVal, 10) : null;
      const video = document.getElementById('lvl-video')?.value.trim();
      const length = document.getElementById('lvl-length')?.value.trim();
      const objects = document.getElementById('lvl-objects')?.value.trim();
      const enjoyment = document.getElementById('lvl-enjoyment')?.value.trim();
      const songName = document.getElementById('lvl-song-name')?.value.trim();
      const songArtist = document.getElementById('lvl-song-artist')?.value.trim();
      const songId = document.getElementById('lvl-song-id')?.value.trim();
      const submitter = document.getElementById('lvl-submitter-name')?.value.trim() || '익명';

      if (!title || !creator) {
        alert('레벨 제목과 제작자는 필수 입력 항목입니다.');
        return;
      }

      if (!video) {
        alert('베리파이 또는 쇼케이스 영상 링크를 입력해주세요.');
        return;
      }

      const submissionItem = {
        id: 'LVL_' + Date.now(),
        type: 'level',
        category: category,
        status: 'pending',
        createdAt: new Date().toLocaleString('ko-KR'),
        data: {
          title,
          creator,
          verifier: verifier || creator,
          expectedRank: expectedRank && !isNaN(expectedRank) ? expectedRank : null,
          mapId: mapId || '-',
          video,
          length: length || 'Long',
          objects: objects || '-',
          enjoyment: enjoyment || '',
          song: {
            name: songName || '-',
            artist: songArtist || '-',
            id: songId || ''
          },
          tags: ['Overall'],
          submitter
        }
      };

      saveSubmission(submissionItem);
      levelForm.reset();
      syncUserNicknameToInputs();
      const previewContainer = document.getElementById('lvl-video-preview-container');
      if (previewContainer) previewContainer.style.display = 'none';
    });
  }

  // --- 11. 클리어 제출 폼 제출 이벤트 ---
  const clearForm = document.getElementById('clear-submit-form');
  if (clearForm) {
    clearForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const category = document.querySelector('input[name="clear-category"]:checked')?.value || 'classic';
      const levelTitle = clearLevelSelect?.value;
      const player = document.getElementById('clear-player-name')?.value.trim();
      const percent = parseInt(document.getElementById('clear-percent')?.value || '100', 10);
      const date = document.getElementById('clear-date')?.value.trim();
      const attempts = document.getElementById('clear-attempts')?.value.trim();
      const videoLink = document.getElementById('clear-video-link')?.value.trim();
      const comment = document.getElementById('clear-comment')?.value.trim();

      if (!levelTitle) {
        alert('기록을 제출할 레벨을 선택해주세요.');
        clearLevelSelect.focus();
        return;
      }

      if (!player) {
        alert('플레이어 닉네임을 입력해주세요.');
        document.getElementById('clear-player-name').focus();
        return;
      }

      if (!videoLink) {
        alert('증거 영상 링크(YouTube)를 입력해주세요.');
        document.getElementById('clear-video-link').focus();
        return;
      }

      if (isNaN(percent) || percent < 1 || percent > 100) {
        alert('올바른 달성 퍼센트(1~100)를 입력해주세요.');
        return;
      }

      const submissionItem = {
        id: 'CLR_' + Date.now(),
        type: 'clear',
        category: category,
        status: 'pending',
        createdAt: new Date().toLocaleString('ko-KR'),
        data: {
          levelTitle,
          player,
          percent,
          date: date || new Date().toISOString().slice(0, 10),
          attempts,
          videoLink,
          comment
        }
      };

      saveSubmission(submissionItem);
      clearForm.reset();
      syncUserNicknameToInputs();
      document.getElementById('clear-video-preview-container').style.display = 'none';
    });
  }

  // --- 12. 내 제출 내역 렌더링 ---
  const historyListContainer = document.getElementById('history-list-container');
  const historyExportBtn = document.getElementById('history-export-btn');
  const historyClearBtn = document.getElementById('history-clear-btn');

  function renderHistoryList() {
    if (!historyListContainer) return;
    const items = getStoredSubmissions();

    if (items.length === 0) {
      historyListContainer.innerHTML = '<p class="history-empty-text">아직 제출한 내역이 없습니다.</p>';
      return;
    }

    historyListContainer.innerHTML = items.map(item => {
      const isLevel = item.type === 'level';
      const badgeClass = isLevel ? 'badge-lvl' : 'badge-clr';
      const typeLabel = isLevel ? `레벨 등록 (${item.category.toUpperCase()})` : `클리어 기록 (${item.category.toUpperCase()})`;

      const titleText = isLevel
        ? `${escapeHtml(item.data.title)} <span style="font-size: 22px; font-weight: 400; opacity: 0.8;">by ${escapeHtml(item.data.creator)}</span>`
        : `${escapeHtml(item.data.levelTitle)} - ${escapeHtml(item.data.player)} (${item.data.percent}%)`;

      const metaText = isLevel
        ? `제출일: ${item.createdAt} • GD 맵 ID: ${escapeHtml(item.data.mapId || '-')}`
        : `제출일: ${item.createdAt} • 클리어 일자: ${escapeHtml(item.data.date || '-')}`;

      let statusBadge = '<span class="history-status-badge status-pending">검토 대기중</span>';
      if (item.status === 'approved') {
        statusBadge = '<span class="history-status-badge status-approved">승인 완료</span>';
      } else if (item.status === 'rejected') {
        statusBadge = '<span class="history-status-badge status-rejected">반려됨</span>';
      }

      return `
        <div class="history-item-card">
          <div class="history-item-left">
            <span class="history-item-type-badge ${badgeClass}">${typeLabel}</span>
            <div class="history-item-title">${titleText}</div>
            <div class="history-item-meta">${metaText}</div>
          </div>
          <div class="history-item-right">
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');
  }

  if (historyExportBtn) {
    historyExportBtn.addEventListener('click', () => {
      const items = getStoredSubmissions();
      if (items.length === 0) {
        alert('복사할 제출 내역이 없습니다.');
        return;
      }
      navigator.clipboard.writeText(JSON.stringify(items, null, 2)).then(() => {
        alert('모든 제출 내역이 JSON 형태로 클립보드에 복사되었습니다.');
      });
    });
  }

  if (historyClearBtn) {
    historyClearBtn.addEventListener('click', () => {
      if (confirm('제출 내역을 모두 지우시겠습니까? (로컬 브라우저에서만 삭제됩니다)')) {
        localStorage.removeItem(SUBMISSIONS_STORAGE_KEY);
        renderHistoryList();
      }
    });
  }
});
