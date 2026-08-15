const ICONS = {
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
  list: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
};

let activeLevelId = null;
let cachedLevelsData = [];
let cachedHistoryData = [];
let tagFilterStates = {}; // e.g. { "Wave": "include", "Robot": "exclude" }

function parseRankChange(item) {
  const type = String(item?.type || '').toLowerCase();
  const detail = String(item?.detail || '');

  const match = detail.match(/(\d+)위에서\s*(\d+)위로/);
  if (match) {
    const fromRank = parseInt(match[1], 10);
    const toRank = parseInt(match[2], 10);
    const diff = Math.abs(fromRank - toRank);
    const isMinor = diff === 1 ? ' minor-change' : '';

    if (detail.includes('상승') || fromRank > toRank) {
      return {
        cardClass: `history-card-rise${isMinor}`,
        badgeClass: 'badge-type-rise',
        badgeLabel: '순위 상승',
        deltaHtml: `<div class="detail-history-delta delta-rise"><span class="delta-num">+${diff}</span><span class="delta-arrow">▲</span></div>`,
        fromToText: `${fromRank}위 ➔ ${toRank}위`
      };
    } else if (detail.includes('하락') || fromRank < toRank) {
      return {
        cardClass: `history-card-drop${isMinor}`,
        badgeClass: 'badge-type-drop',
        badgeLabel: '순위 하락',
        deltaHtml: `<div class="detail-history-delta delta-drop"><span class="delta-num">-${diff}</span><span class="delta-arrow">▼</span></div>`,
        fromToText: `${fromRank}위 ➔ ${toRank}위`
      };
    } else {
      return {
        cardClass: `history-card-re-eval${isMinor}`,
        badgeClass: 'badge-type-re-eval',
        badgeLabel: '순위 재평가',
        deltaHtml: `<div class="detail-history-delta delta-move"><span class="delta-num">#${toRank}</span><span class="delta-arrow">➔</span></div>`,
        fromToText: `${fromRank}위 ➔ ${toRank}위`
      };
    }
  }

  const newMatch = detail.match(/(\d+)위에\s*새로운/);
  if (type === 'add' || newMatch || detail.includes('등록')) {
    const rankNum = newMatch ? `#${newMatch[1]}` : 'NEW';
    return {
      cardClass: 'history-card-add',
      badgeClass: 'badge-type-add',
      badgeLabel: '신규 등록',
      deltaHtml: `<div class="detail-history-delta delta-add"><span class="delta-num">${rankNum}</span><span class="delta-arrow">★</span></div>`,
      fromToText: ''
    };
  }

  if (type === 'remove' || detail.includes('삭제')) {
    return {
      cardClass: 'history-card-remove',
      badgeClass: 'badge-type-remove',
      badgeLabel: '레벨 삭제',
      deltaHtml: `<div class="detail-history-delta delta-remove"><span class="delta-num">DEL</span><span class="delta-arrow">✕</span></div>`,
      fromToText: ''
    };
  }

  return {
    cardClass: 'history-card-default',
    badgeClass: 'badge-type-default',
    badgeLabel: '순위 변동',
    deltaHtml: `<div class="detail-history-delta delta-move"><span class="delta-num">•</span></div>`,
    fromToText: ''
  };
}

function getLevelPeakRank(level, currentRankNum, historyData) {
  const ranks = [];
  if (typeof currentRankNum === 'number' && currentRankNum > 0) {
    ranks.push(currentRankNum);
  }

  const levelTitle = String(level?.title || '').trim().toLowerCase();
  const levelHistory = (historyData || []).filter(
    h => h.title && String(h.title).trim().toLowerCase() === levelTitle
  );

  levelHistory.forEach(h => {
    const detail = String(h.detail || '');
    const mFromTo = detail.match(/(\d+)위에서\s*(\d+)위로/);
    if (mFromTo) {
      ranks.push(parseInt(mFromTo[1], 10));
      ranks.push(parseInt(mFromTo[2], 10));
    }
    const mAdd = detail.match(/(\d+)위에/);
    if (mAdd) {
      ranks.push(parseInt(mAdd[1], 10));
    }
  });

  const validRanks = ranks.filter(r => Number.isInteger(r) && r > 0);
  return validRanks.length > 0 ? Math.min(...validRanks) : currentRankNum;
}

function getUserNickname() {
  return (localStorage.getItem('forumNickname') || '').trim();
}

function isLevelClearedByUser(level) {
  const user = getUserNickname();
  if (!user) return false;
  const userLower = user.toLowerCase();

  if (Array.isArray(level.clears) && level.clears.some(c => {
    const p = (c.player || c.name || c.user || '').trim().toLowerCase();
    return p === userLower;
  })) {
    return true;
  }
  if (level.verifier && String(level.verifier).trim().toLowerCase() === userLower) {
    return true;
  }
  return false;
}

const TAG_CATEGORIES = [
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

const TAG_COLOR_MAP = {
  // 1. 스타일
  'Standard': '#ff5252',
  'Layout': '#0abde3',
  'Design': '#fed330',
  'Glow': '#e056fd',
  'Effect': '#70a1ff',
  'Modern': '#7efff5',
  'Simplism': '#ffb8b8',
  'Art': '#ff3f34',
  'Realism': '#78e08f',
  'Pixel': '#2ed573',
  'Core': '#a4b0be',
  'Atmospheric': '#747d8c',
  'Experimental': '#00ff88',
  'Eclectic': '#fffa65',
  'Circles': '#ff4757',
  'Sunset': '#ff793f',
  'Minigame': '#ffd32a',

  // 2. 테마
  '1.0': '#00d2d3',
  '1.9': '#a29bfe',
  'Abstract': '#74b9ff',
  'Acid': '#55efc4',
  'Anxious': '#ff7675',
  'Apocalyptic': '#e17055',
  'Asian': '#fd79a8',
  'Aquatic': '#00cec9',
  'Cartoon': '#74b9ff',
  'Castle': '#e58e26',
  'Cave': '#b2bec3',
  'City': '#dfe4ea',
  'Cold': '#70a1ff',
  'Colorful': '#ff9ff3',
  'Dark': '#747d8c',
  'Desert': '#f6e58d',
  'Dungeon': '#e77f67',
  'Factory': '#ced6e0',
  'Fantasy': '#c7ecee',
  'Food': '#ffa502',
  'Futuristic': '#00d2d3',
  'Glitchy': '#be2edd',
  'Grayscale': '#a4b0be',
  'Happy': '#fffa65',
  'Heaven': '#ffffff',
  'Hell': '#ff3838',
  'Horror': '#eb4d4b',
  'Hot': '#ff793f',
  'Mechanical': '#a4b0be',
  'Monochromatic': '#747d8c',
  'Nature': '#2ed573',
  'Night': '#70a1ff',
  'Party': '#e056fd',
  'Pixel Art': '#7bed9f',
  'Retro': '#2ed573',
  'RobTop': '#ffffff',
  'Sad': '#70a1ff',
  'Sky': '#c7ecee',
  'Space': '#70a1ff',
  'Temple': '#fed330',
  'Western': '#e58e26',
  'Domestic': '#e17055',
  'Love': '#ff9ff3',
  'Lyrics': '#c8d6e5',
  'Meta': '#ff4d4d',

  // 3. 메타
  'Flashy': '#fff200',
  'NONG': '#54a0ff',
  'Checkpointless': '#dfe4ea',
  'Collab': '#2ed573',
  '2P': '#ff9f43',
  'XXL': '#a29bfe',
  'Remake': '#f7d794',
  'Recreation': '#e77f67',
  'Animation': '#e056fd',
  'Story': '#dfe6e9',
  'Fixed Hitboxes': '#ffffff',
  'Multi Path': '#ff9ff3',
  'Humorous': '#fff200',
  'Jumpscares': '#ff6b6b',
  '3D': '#70a1ff',
  'Hard Coins': '#2ed573',
  'Sensitive': '#ff4757',

  // 4. 게임플레이
  'Overall': '#00d2d3',
  'Bossfight': '#ffd32a',
  'Flow': '#ff9ff3',
  'Fast Paced': '#ff4757',
  'Slow Paced': '#ff9f43',
  'Sync': '#2ed573',
  'Blinds': '#00d2d3',
  'Memory': '#54a0ff',
  'Puzzle': '#ff7675',
  'Duals': '#ff9f43',
  'Maze': '#dfe4ea',
  'Timing': '#00d2d3',
  'Tower': '#ced6e0',
  'Sideways': '#7bed9f',
  'Random': '#dfe6e9',
  'High CPS': '#ff3838',
  'Nerve Control': '#70a1ff',
  'Learny': '#2ed573',
  'Chokepoints': '#ff4757',
  'Collectathon': '#fed330',
  'Gimmicky': '#2bcbba',
  'Gravity': '#70a1ff',
  'Mirror': '#ff793f',
  'Needle': '#ff6b81',
  'Timed': '#a29bfe',
  'Momentum': '#70a1ff',
  'Wall Jump': '#7efff5',
  'Cycle': '#ffffff',
  'Slope Boost': '#70a1ff',
  'Slippery': '#70a1ff',
  'Zippers': '#a29bfe',
  'Wavedash': '#78e08f',
  'Force Blocks': '#55efc4',
  'Blinkers': '#fffa65',
  'Avoidance': '#dfe4ea',
  'Foddian': '#2ed573',
  'Autoscroller': '#70a1ff',
  'Rooms': '#ff4757',
  'Double Jump': '#7efff5',
  'Speedrun': '#70a1ff',
  'Classic': '#ff7675',
  'Metroidvania': '#ced6e0',
  'Quests': '#dfe4ea',
  'Progressive': '#70a1ff',
  'Jetpack': '#ff9ff3',
  'Ball': '#ff4757',
  'UFO': '#fed330',
  'Wave': '#70a1ff',
  'Spider': '#be2edd',
  'Swing': '#ffd32a',
  'Robot': '#ffffff',
  'Cube': '#2ed573',
  'Ship': '#ff9ff3',

  // 기타/레거시 태그 호환
  'Any-Mode': '#54a0ff',
  'One-Mode': '#ff9f43',
  'No-Clear': '#ff4757',
  'Full-Effect': '#70a1ff',
  'Low-Effect': '#a4b0be',
  'None-Effect': '#747d8c',
  'Short': '#55efc4',
  'Medium': '#74b9ff',
  'Long': '#fed330',
  'XL': '#ff9f43',
  'Physical': '#ff6b81',
  'Fast': '#ff4757',
  'Slow': '#ff9f43',
  'Boss': '#ffd32a',
  'Gimmick': '#2bcbba',
  'Dual': '#ff9f43',
  'Spam': '#ff3838'
};

function getTagColor(tag) {
  if (!tag) return '#a4b0be';
  return TAG_COLOR_MAP[tag] || TAG_COLOR_MAP[String(tag).trim()] || '#a4b0be';
}

function updateDetailTagPills() {
  const detailContainer = document.getElementById('classic-detail-container');
  if (!detailContainer) return;
  detailContainer.querySelectorAll('.detail-tag-pill').forEach(pill => {
    const tag = pill.dataset.tag;
    if (!tag) return;
    const state = tagFilterStates[tag];
    pill.classList.remove('tag-include', 'tag-exclude');
    if (state === 'include') {
      pill.classList.add('tag-include');
      pill.textContent = `+ ${tag}`;
    } else if (state === 'exclude') {
      pill.classList.add('tag-exclude');
      pill.textContent = `- ${tag}`;
    } else {
      pill.textContent = `#${tag}`;
    }
  });
}

function toggleTagState(tagName) {
  const currentState = tagFilterStates[tagName];
  if (!currentState) {
    tagFilterStates[tagName] = 'include';
  } else if (currentState === 'include') {
    tagFilterStates[tagName] = 'exclude';
  } else {
    delete tagFilterStates[tagName];
  }
  renderTagChips();
  renderLevelList(cachedLevelsData);
  updateDetailTagPills();
}

function resetTagFilters() {
  tagFilterStates = {};
  renderTagChips();
  renderLevelList(cachedLevelsData);
  updateDetailTagPills();
}

function groupTagsByCategory(levelTags) {
  if (!Array.isArray(levelTags) || levelTags.length === 0) return [];

  const rawTags = levelTags.map(t => String(t).trim()).filter(Boolean);
  if (rawTags.length === 0) return [];

  const tagMap = new Map();
  rawTags.forEach(t => tagMap.set(t.toLowerCase(), t));

  const matchedTags = new Set();
  const grouped = [];

  TAG_CATEGORIES.forEach(cat => {
    const categoryTags = [];
    cat.tags.forEach(catTag => {
      const lower = catTag.toLowerCase();
      if (tagMap.has(lower)) {
        categoryTags.push(tagMap.get(lower));
        matchedTags.add(lower);
      }
    });
    if (categoryTags.length > 0) {
      grouped.push({
        name: cat.name,
        tags: categoryTags
      });
    }
  });

  const otherTags = [];
  rawTags.forEach(t => {
    if (!matchedTags.has(t.toLowerCase())) {
      otherTags.push(t);
    }
  });

  if (otherTags.length > 0) {
    grouped.push({
      name: '기타',
      tags: otherTags
    });
  }

  return grouped;
}

function renderTagChips() {
  const wrapper = document.getElementById('classic-tag-chips-wrapper');
  const resetBtn = document.getElementById('classic-tag-reset-btn');
  if (!wrapper) return;

  const datasetTags = new Set();
  cachedLevelsData.forEach(level => {
    if (Array.isArray(level.tags)) {
      level.tags.forEach(t => {
        if (t && String(t).trim()) datasetTags.add(String(t).trim());
      });
    }
  });

  wrapper.innerHTML = '';
  let hasActiveFilter = false;
  const processedTags = new Set();

  const createChip = (tag) => {
    const state = tagFilterStates[tag];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.dataset.tag = tag;
    chip.style.setProperty('--tag-color', getTagColor(tag));

    if (state === 'include') {
      hasActiveFilter = true;
      chip.className = 'classic-tag-chip tag-include';
      chip.innerHTML = `+ #${escapeHtml(tag)}`;
    } else if (state === 'exclude') {
      hasActiveFilter = true;
      chip.className = 'classic-tag-chip tag-exclude';
      chip.innerHTML = `- #${escapeHtml(tag)}`;
    } else {
      chip.className = 'classic-tag-chip';
      chip.innerHTML = `#${escapeHtml(tag)}`;
    }

    chip.addEventListener('click', () => toggleTagState(tag));
    return chip;
  };

  TAG_CATEGORIES.forEach(cat => {
    if (cat.tags.length > 0) {
      const row = document.createElement('div');
      row.className = 'classic-tag-category-row';
      row.dataset.category = cat.name;

      const catBadge = document.createElement('span');
      catBadge.className = 'classic-tag-cat-badge';
      catBadge.textContent = cat.name;
      row.appendChild(catBadge);

      const chipsGroup = document.createElement('div');
      chipsGroup.className = 'classic-tag-chips-group';

      cat.tags.forEach(tag => {
        processedTags.add(tag);
        chipsGroup.appendChild(createChip(tag));
      });

      row.appendChild(chipsGroup);
      wrapper.appendChild(row);
    }
  });

  if (resetBtn) {
    resetBtn.style.display = hasActiveFilter ? 'inline-block' : 'none';
  }
}

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text ?? '';
  return el.innerHTML;
}

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

function getYoutubeWatchUrl(videoUrl) {
  const id = getYoutubeId(videoUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : videoUrl;
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

function getOrCreateBackdrop() {
  let backdrop = document.getElementById('detail-overlay-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'detail-overlay-backdrop';
    backdrop.className = 'detail-overlay-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', () => {
      deselectLevel();
    });
  }
  return backdrop;
}

function deselectLevel() {
  activeLevelId = null;

  const listContainer = document.getElementById('classic-list-container');
  const detailContainer = document.getElementById('classic-detail-container');
  const backdrop = document.getElementById('detail-overlay-backdrop');

  if (listContainer) listContainer.classList.remove('has-detail');
  if (detailContainer) {
    detailContainer.classList.remove('active');
    const iframes = detailContainer.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.src = '';
    });
  }
  if (backdrop) backdrop.classList.remove('active');

  document.querySelectorAll('.classic-level-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
}

function selectLevel(level, rank, cardElement) {
  const listContainer = document.getElementById('classic-list-container');
  const detailContainer = document.getElementById('classic-detail-container');
  const backdrop = getOrCreateBackdrop();

  if (!listContainer || !detailContainer) return;

  if (activeLevelId === level.id) {
    deselectLevel();
    return;
  }

  activeLevelId = level.id;

  document.querySelectorAll('.classic-level-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
  cardElement.classList.add('selected');

  listContainer.classList.add('has-detail');
  renderLevelDetail(level, rank, detailContainer);
  detailContainer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    deselectLevel();
  }
});

function renderLevelDetail(level, rank, detailContainer) {
  const ytId = getYoutubeId(level.video);
  const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : '';
  const rating = level.rating ? String(level.rating).trim() : '';
  const ratingClass = rating ? `badge-${rating.toLowerCase()}` : '';
  const title = escapeHtml(level.title);
  const creator = escapeHtml(level.creator);
  const verifier = escapeHtml(level.verifier);
  const mapId = level.map?.mapId ? escapeHtml(String(level.map.mapId)) : '-';
  const rawLength = level.map?.length || level.length || '-';
  const length = escapeHtml(window.formatLevelLength ? window.formatLevelLength(rawLength) : rawLength);
  const objects = level.map?.objects ? Number(level.map.objects).toLocaleString() : '-';
  const uploadDate = level.map?.uploadDate ? escapeHtml(level.map.uploadDate) : '-';
  const songName = level.song?.name ? escapeHtml(level.song.name) : '';
  const songArtist = level.song?.artist ? escapeHtml(level.song.artist) : '';
  const rawSongId = level.song?.id != null ? String(level.song.id).trim() : '';
  const isNong = rawSongId.toUpperCase() === 'NONG';
  const numSongId = /^\d+$/.test(rawSongId) ? parseInt(rawSongId, 10) : null;
  const isNgAudio = numSongId !== null && numSongId >= 100 && numSongId < 10000000;

  let songIdBadgeHtml = '';
  if (rawSongId && !isNong) {
    if (isNgAudio) {
      songIdBadgeHtml = `<a href="https://www.newgrounds.com/audio/listen/${numSongId}" class="song-id-badge song-id-link" target="_blank" rel="noopener noreferrer" title="Newgrounds에서 음악 듣기"><span>(ID: ${escapeHtml(rawSongId)})</span><svg class="song-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></a>`;
    } else {
      songIdBadgeHtml = `<span class="song-id-badge">(ID: ${escapeHtml(rawSongId)})</span>`;
    }
  }

  const rankNum = parseInt(String(rank).replace(/[^0-9]/g, ''), 10) || 1;
  const basePt = window.getBasePoints ? window.getBasePoints(rankNum) : 10;
  const userNick = getUserNickname();
  const earnedPt = userNick && window.calcPlayerLevelPoints ? window.calcPlayerLevelPoints(level, rankNum, userNick) : 0;

  const ptBadgeHtml = earnedPt > 0
    ? `<span class="classic-level-pt-badge pt-earned" title="획득 완료한 포인트">획득: +${Math.round(earnedPt)} PT</span>`
    : `<span class="classic-level-pt-badge pt-potential" title="클리어 시 획득 기본 포인트">클리어 시 +${basePt} PT</span>`;

  const isCleared = isLevelClearedByUser(level);
  const clearBadgeHtml = isCleared
    ? `<span class="classic-level-clear-badge">✓ CLEAR</span>`
    : '';

  let songDisplay = '-';
  if (songArtist || songName) {
    const mainTitle = songArtist && songName ? `${songArtist} - ${songName}` : (songName || songArtist);
    songDisplay = `<span class="song-title">${mainTitle}</span>${songIdBadgeHtml}`;
  } else if (songIdBadgeHtml) {
    songDisplay = songIdBadgeHtml;
  }
  const description = level.description ? escapeHtml(level.description) : '';

  const groupedTags = groupTagsByCategory(level.tags);
  const tagsHtml = groupedTags.length > 0
    ? `
      <div class="detail-tags-container">
        ${groupedTags.map(cat => `
          <div class="detail-tag-category-row" data-category="${escapeHtml(cat.name)}">
            <span class="detail-tag-cat-badge">${escapeHtml(cat.name)}</span>
            <div class="detail-tag-chips-group">
              ${cat.tags.map(tag => {
                const state = tagFilterStates[tag];
                const stateClass = state === 'include' ? 'tag-include' : (state === 'exclude' ? 'tag-exclude' : '');
                const prefix = state === 'include' ? '+ ' : (state === 'exclude' ? '- ' : '#');
                const tagColor = getTagColor(tag);
                return `<span class="detail-tag-pill ${stateClass}" data-tag="${escapeHtml(tag)}" style="--tag-color: ${tagColor}; cursor:pointer;" title="클릭하여 태그 필터 토글">${prefix}${escapeHtml(tag)}</span>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const mediaHtml = embedUrl
    ? `<iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`
    : `<img src="${getYoutubeThumbnail(level.video)}" alt="${title}" loading="lazy" decoding="async">`;

  const ratingBadgeHtml = rating
    ? `<span class="classic-level-badge ${ratingClass}">${escapeHtml(rating)}</span>`
    : '';

  const userLower = getUserNickname().toLowerCase();

    const isSameCreatorVerifier = Boolean(
      creator && verifier &&
      creator !== '-' && verifier !== '-' &&
      creator.trim().toLowerCase() === verifier.trim().toLowerCase()
    );

    const creatorVerifierDetailHtml = isSameCreatorVerifier
      ? `
        <div class="detail-info-item">
          <div class="detail-info-label">제작 및 베리파이어</div>
          <div class="detail-info-value">${creator}</div>
        </div>
      `
      : `
        <div class="detail-info-item">
          <div class="detail-info-label">제작자</div>
          <div class="detail-info-value">${creator}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">베리파이어</div>
          <div class="detail-info-value">${verifier}</div>
        </div>
      `;

    detailContainer.innerHTML = `
    <div class="detail-header">
      <div class="detail-title-wrapper">
        <span class="detail-rank">${rank}</span>
        <span class="detail-title">${title}</span>
        ${ptBadgeHtml}
        ${clearBadgeHtml}
        ${ratingBadgeHtml}
      </div>
      <button class="detail-close-btn" id="detail-close-btn" aria-label="닫기">✕</button>
    </div>

    <div class="detail-video-container">
      ${mediaHtml}
    </div>

    ${description ? `
      <div class="detail-desc-box">
        <div class="detail-desc-title">설명</div>
        <div class="detail-desc-text">${description}</div>
      </div>
    ` : ''}

    <div class="detail-info-grid">
      ${creatorVerifierDetailHtml}
      <div class="detail-info-item">
        <div class="detail-info-label">맵 ID</div>
        <div class="detail-info-value">
          <span>${mapId}</span>
          ${mapId !== '-' ? `<button class="detail-copy-btn" id="detail-copy-mapid-btn">복사</button>` : ''}
        </div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">Enjoyment</div>
        <div class="detail-info-value">${level.enjoyment ? `${escapeHtml(String(level.enjoyment))} / 10` : '-'}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">레벨 길이</div>
        <div class="detail-info-value">${length}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">오브젝트 수</div>
        <div class="detail-info-value">${objects}</div>
      </div>
      <div class="detail-info-item detail-info-item-song detail-info-item-wide">
        <div class="detail-info-label">음악</div>
        <div class="detail-info-value">${songDisplay}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">업로드 날짜</div>
        <div class="detail-info-value">${uploadDate}</div>
      </div>
    </div>

    ${tagsHtml}

    <div class="detail-clears-box">
      <div class="detail-clears-title">
        <span>기록 명단</span>
        <span class="detail-clears-count">${Array.isArray(level.clears) ? level.clears.length : 0}명</span>
      </div>
      ${Array.isArray(level.clears) && level.clears.length > 0 ? `
        <table class="detail-clears-table">
          <thead>
            <tr>
              <th class="detail-clears-th th-rank">#</th>
              <th class="detail-clears-th th-name">닉네임</th>
              <th class="detail-clears-th th-percent">퍼센트</th>
              <th class="detail-clears-th th-date">날짜</th>
              <th class="detail-clears-th th-link">영상</th>
            </tr>
          </thead>
          <tbody>
            ${level.clears.map((clear, i) => {
    const playerName = clear.player || clear.name || clear.user || '-';
    const isUser = userLower && playerName && String(playerName).trim().toLowerCase() === userLower;
    const rowClass = isUser ? 'detail-clears-row user-clear' : 'detail-clears-row';
    const videoLink = clear.link || clear.video || '';
    return `
              <tr class="${rowClass}">
                <td class="detail-clears-td td-rank">${i + 1}</td>
                <td class="detail-clears-td td-name">${escapeHtml(playerName)}${isUser ? ' (나)' : ''}</td>
                <td class="detail-clears-td td-percent">${clear.percent != null ? escapeHtml(String(clear.percent)) + '%' : '-'}</td>
                <td class="detail-clears-td td-date">${escapeHtml(clear.date ?? '-')}</td>
                <td class="detail-clears-td td-link">
                  ${videoLink ? `<a class="detail-clears-link" href="${escapeHtml(videoLink)}" target="_blank" rel="noopener noreferrer">▶</a>` : '<span style="opacity:0.35">-</span>'}
                </td>
              </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      ` : `<p class="detail-clears-empty">아직 클리어한 사람이 없습니다.</p>`}
    </div>

    ${(() => {
      const levelHistory = cachedHistoryData.filter(h => h.title && String(h.title).trim().toLowerCase() === String(level.title).trim().toLowerCase());
      const peakRank = getLevelPeakRank(level, rankNum, cachedHistoryData);
      const peakRankBadgeHtml = peakRank ? `
            <span class="detail-history-peak-badge peak-rank-${peakRank}">
              <span class="peak-label">최고 순위</span>
              <span class="peak-value">#${peakRank}</span>
            </span>
          ` : '';
      return `
        <div class="detail-history-box">
          <div class="detail-history-title">
            <span class="detail-history-title-text">순위 변동 기록</span>
            ${peakRankBadgeHtml}
            <span class="detail-history-count">${levelHistory.length}건</span>
          </div>
          ${levelHistory.length > 0 ? `
            <ul class="detail-history-list">
              ${levelHistory.map(item => {
        const info = parseRankChange(item);
        return `
                <li class="detail-history-item ${info.cardClass}">
                  ${info.deltaHtml}
                  <div class="detail-history-content">
                    <div class="detail-history-header-row">
                      <span class="detail-history-badge ${info.badgeClass}">${info.badgeLabel}</span>
                      ${info.fromToText ? `<span class="detail-history-fromto">${info.fromToText}</span>` : ''}
                    </div>
                    <div class="detail-history-detail">${escapeHtml(item.detail ?? '-')}</div>
                    <div class="detail-history-time">${escapeHtml(item.time ?? '-')}</div>
                  </div>
                </li>
              `;
      }).join('')}
            </ul>
          ` : `<p class="detail-history-empty">순위 변동 기록이 없습니다.</p>`}
        </div>
      `;
    })()}
  `;

  const closeBtn = detailContainer.querySelector('#detail-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', deselectLevel);
  }

  const copyBtn = detailContainer.querySelector('#detail-copy-mapid-btn');
  if (copyBtn && mapId !== '-') {
    copyBtn.addEventListener('click', () => copyToClipboard(mapId, copyBtn));
  }

  detailContainer.querySelectorAll('.detail-tag-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const tag = pill.dataset.tag;
      if (tag) toggleTagState(tag);
    });
  });
}

function createLevelCard(level, index, total) {
  const card = document.createElement('article');
  const rating = level.rating ? String(level.rating).trim() : '';
  const ratingClass = rating ? `badge-${rating.toLowerCase()}` : '';
  const cardRatingClass = rating ? `card-${rating.toLowerCase()}` : '';
  const isCleared = isLevelClearedByUser(level);
  const cardClearedClass = isCleared ? 'card-cleared' : '';

  if (activeLevelId === level.id) {
    card.className = `classic-level-card ${cardRatingClass} ${cardClearedClass} selected`.trim();
  } else {
    card.className = `classic-level-card ${cardRatingClass} ${cardClearedClass}`.trim();
  }
  card.dataset.levelId = String(level.id);

  const thumbSrc = getYoutubeThumbnail(level.video);
  const rank = `#${index + 1}`;
  const creator = escapeHtml(level.creator);
  const verifier = escapeHtml(level.verifier);
  const title = escapeHtml(level.title);

  const rankNum = index + 1;
  const basePt = window.getBasePoints ? window.getBasePoints(rankNum) : 10;
  const userNick = getUserNickname();
  const earnedPt = userNick && window.calcPlayerLevelPoints ? window.calcPlayerLevelPoints(level, rankNum, userNick) : 0;

  const ptBadgeHtml = earnedPt > 0
    ? `<span class="classic-level-pt-badge pt-earned" title="획득 완료한 포인트">획득: +${Math.round(earnedPt)} PT</span>`
    : `<span class="classic-level-pt-badge pt-potential" title="클리어 시 획득 기본 포인트">클리어 시 +${basePt} PT</span>`;

  const clearBadgeHtml = isCleared
    ? `<span class="classic-level-clear-badge">✓ CLEAR</span>`
    : '';

  const ratingBadgeHtml = rating
    ? `<span class="classic-level-badge ${ratingClass}">${escapeHtml(rating)}</span>`
    : '';

  const actionsHtml = `<div class="classic-level-actions">${ptBadgeHtml}${clearBadgeHtml}${ratingBadgeHtml}</div>`;

  const isSameCreatorVerifier = Boolean(
    creator && verifier &&
    creator !== '-' && verifier !== '-' &&
    creator.trim().toLowerCase() === verifier.trim().toLowerCase()
  );

  const metaHtml = isSameCreatorVerifier
    ? `<span class="classic-level-creator">${creator}</span>`
    : `
      <span class="classic-level-creator">${creator}</span>
      <span class="classic-level-separator">|</span>
      <span class="classic-level-verifier">${verifier}</span>
    `;

  card.innerHTML = `
    <img class="classic-level-thumb" src="${thumbSrc}" alt="${title}" loading="lazy" decoding="async">
    <div class="classic-level-info">
      <div class="classic-level-title-row">
        <span class="classic-level-rank">${rank}</span>
        <span class="classic-level-title">${title}</span>
      </div>
      <div class="classic-level-meta">
        ${metaHtml}
      </div>
    </div>
    ${actionsHtml}
  `;

  if (!thumbSrc) {
    const thumbEl = card.querySelector('.classic-level-thumb');
    if (thumbEl) thumbEl.style.display = 'none';
  }

  card.addEventListener('click', () => {
    selectLevel(level, rank, card);
  });

  return card;
}

function createSectionDivider(type, labelText) {
  const div = document.createElement('div');
  div.className = `level-section-divider divider-${type}`;
  div.innerHTML = `
    <span class="divider-line"></span>
    <span class="divider-label">${labelText}</span>
    <span class="divider-line"></span>
  `;
  return div;
}

function filterLevels(levels, query) {
  const q = (query || '').trim().toLowerCase();
  const includedTags = Object.keys(tagFilterStates).filter(t => tagFilterStates[t] === 'include');
  const excludedTags = Object.keys(tagFilterStates).filter(t => tagFilterStates[t] === 'exclude');

  return levels.filter(level => {
    const levelTags = Array.isArray(level.tags) ? level.tags : [];

    // Level MUST contain ALL included tags
    for (const inc of includedTags) {
      if (!levelTags.includes(inc)) return false;
    }

    // Level MUST NOT contain ANY excluded tags
    for (const exc of excludedTags) {
      if (levelTags.includes(exc)) return false;
    }

    // Text search query filter
    if (q) {
      const title = String(level.title || '').toLowerCase();
      const creator = String(level.creator || '').toLowerCase();
      const verifier = String(level.verifier || '').toLowerCase();
      const mapId = String(level.map?.mapId || '').toLowerCase();
      const songName = String(level.song?.name || '').toLowerCase();
      const songArtist = String(level.song?.artist || '').toLowerCase();
      const songId = String(level.song?.id || '').toLowerCase();
      const rating = String(level.rating || '').toLowerCase();
      const tagsStr = levelTags.map(t => String(t)).join(' ').toLowerCase();

      const matchesText = title.includes(q) ||
        creator.includes(q) ||
        verifier.includes(q) ||
        mapId.includes(q) ||
        songName.includes(q) ||
        songArtist.includes(q) ||
        songId.includes(q) ||
        rating.includes(q) ||
        tagsStr.includes(q);

      if (!matchesText) return false;
    }

    return true;
  });
}

function renderLevelList(levels) {
  const listEl = document.getElementById('classic-level-list-body');
  if (!listEl) return;

  listEl.innerHTML = '';

  const query = (document.getElementById('classic-search-input')?.value || '').trim();
  const filteredLevels = filterLevels(levels, query);

  if (!filteredLevels.length) {
    listEl.innerHTML = (query || Object.keys(tagFilterStates).length)
      ? '<p class="classic-level-empty">검색 조건에 맞는 레벨이 없습니다.</p>'
      : '<p class="classic-level-empty">등록된 레벨이 없습니다.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  let insertedMain = false;
  let insertedExtended = false;
  let insertedLegacy = false;

  filteredLevels.forEach((level) => {
    const originalIndex = cachedLevelsData.findIndex(l => l.id === level.id);
    const rankIndex = originalIndex !== -1 ? originalIndex : 0;

    // Check Section Dividers based on rank index
    if (rankIndex < 10 && !insertedMain) {
      fragment.appendChild(createSectionDivider('main', 'MAIN LIST (1 ~ 10위)'));
      insertedMain = true;
    } else if (rankIndex >= 10 && rankIndex < 20 && !insertedExtended) {
      fragment.appendChild(createSectionDivider('extended', 'EXTENDED LIST (11 ~ 20위)'));
      insertedExtended = true;
    } else if (rankIndex >= 20 && !insertedLegacy) {
      fragment.appendChild(createSectionDivider('legacy', 'LEGACY LIST (21위~)'));
      insertedLegacy = true;
    }

    fragment.appendChild(createLevelCard(level, rankIndex, cachedLevelsData.length));
  });

  listEl.appendChild(fragment);
}

function refreshLevelView() {
  if (cachedLevelsData.length) {
    renderTagChips();
    renderLevelList(cachedLevelsData);

    if (activeLevelId) {
      const activeLevelIndex = cachedLevelsData.findIndex(l => l.id === activeLevelId);
      if (activeLevelIndex !== -1) {
        const activeLevel = cachedLevelsData[activeLevelIndex];
        const detailContainer = document.getElementById('classic-detail-container');
        if (detailContainer) {
          renderLevelDetail(activeLevel, `#${activeLevelIndex + 1}`, detailContainer);
        }
      }
    }
  }
}

async function initClassicPage() {
  const container = document.getElementById('classic-list-container');
  if (!container) return;

  const searchInput = document.getElementById('classic-search-input');
  const searchClearBtn = document.getElementById('classic-search-clear');
  const tagResetBtn = document.getElementById('classic-tag-reset-btn');

  if (searchInput) {
    const handleClassicSearch = window.debounce ? window.debounce(() => {
      renderLevelList(cachedLevelsData);
    }, 120) : () => renderLevelList(cachedLevelsData);

    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = val ? 'block' : 'none';
      }
      handleClassicSearch();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchClearBtn.style.display = 'none';
      renderLevelList(cachedLevelsData);
    });
  }

  const tagToggleBtn = document.getElementById('classic-tag-toggle-btn');
  const tagChipsWrapper = document.getElementById('classic-tag-chips-wrapper');

  if (tagResetBtn) {
    tagResetBtn.addEventListener('click', resetTagFilters);
  }

  if (tagToggleBtn && tagChipsWrapper) {
    tagToggleBtn.addEventListener('click', () => {
      const isOpen = tagChipsWrapper.classList.toggle('open');
      tagToggleBtn.textContent = isOpen ? '태그 닫기 ▲' : '태그 펼치기 ▼';
    });
  }

  function applyDevCustomData(jsonLevels, jsonHistory, modeKey) {
    if (window.applyDevCustomData) {
      return window.applyDevCustomData(jsonLevels, jsonHistory, modeKey);
    }
    return { levels: jsonLevels || [], history: jsonHistory || [] };
  }

  const loadClassicData = async () => {
    try {
      const response = await fetch('classic.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const merged = applyDevCustomData(data.levels ?? [], data.history ?? [], 'classic');
      cachedLevelsData = merged.levels;
      cachedHistoryData = merged.history;
      window.cachedLevelsData = cachedLevelsData;

      const totalBadge = document.getElementById('classic-total-badge');
      if (totalBadge) {
        totalBadge.textContent = `TOTAL ${cachedLevelsData.length}`;
      }

      renderTagChips();
      renderLevelList(cachedLevelsData);

      // Auto select level if URL parameters ?id= or ?title= are present
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('id') || urlParams.get('levelId');
      const targetTitle = urlParams.get('title');

      let targetLevel = null;
      if (targetId) {
        targetLevel = cachedLevelsData.find(l => String(l.id) === String(targetId) || String(l.map?.mapId || l.mapId) === String(targetId));
      } else if (targetTitle) {
        targetLevel = cachedLevelsData.find(l => l.title === targetTitle);
      }

      if (targetLevel) {
        const idx = cachedLevelsData.indexOf(targetLevel);
        const rankStr = `#${idx + 1}`;
        const cardEl = document.querySelector(`.classic-level-card[data-level-id="${targetLevel.id}"]`);
        if (cardEl) {
          selectLevel(targetLevel, rankStr, cardEl);
          setTimeout(() => {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      } else if (activeLevelId) {
        const detailContainer = document.getElementById('classic-detail-container');
        const activeLevel = cachedLevelsData.find(l => l.id === activeLevelId);
        if (activeLevel && detailContainer) {
          const idx = cachedLevelsData.indexOf(activeLevel);
          renderLevelDetail(activeLevel, `#${idx + 1}`, detailContainer);
        }
      }
    } catch (err) {
      const listEl = document.getElementById('classic-level-list-body');
      if (listEl) {
        listEl.innerHTML = `<p class="classic-level-error">레벨 목록을 불러오지 못했습니다.</p>`;
      }
      console.error('classic.json load failed:', err);
    }
  };

  window.addEventListener('devDataUpdated', loadClassicData);
  await loadClassicData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClassicPage);
} else {
  initClassicPage();
}
