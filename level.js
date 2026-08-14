document.addEventListener('DOMContentLoaded', () => {
  const classicBox = document.querySelector('.box_classic');
  if (classicBox) {
    classicBox.style.cursor = 'pointer';
    classicBox.addEventListener('click', () => {
      window.location.href = 'level/classic.html';
    });
  }

  const challengeBox = document.querySelector('.box_challenge');
  if (challengeBox) {
    challengeBox.style.cursor = 'pointer';
    challengeBox.addEventListener('click', () => {
      window.location.href = 'level/challenge.html';
    });
  }

  const platformerBox = document.querySelector('.box_platformer');
  if (platformerBox) {
    platformerBox.style.cursor = 'pointer';
    platformerBox.addEventListener('click', () => {
      window.location.href = 'level/platformer.html';
    });
  }

  function extractYoutubeId(videoUrl) {
    if (!videoUrl) return '';
    const str = String(videoUrl).trim();
    if (/^[\w-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|embed\/|v=)([\w-]{11})/);
    if (match) return match[1];
    const loose = str.match(/([a-zA-Z0-9_-]{11})/);
    return loose ? loose[1] : '';
  }

  async function loadTopLevelThumbnail(mode, elementSelector, defaultYtId) {
    const cardEl = document.querySelector(elementSelector);
    if (!cardEl) return;

    try {
      const res = await fetch(`level/${mode}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let levels = data.levels || [];

      if (typeof window.applyDevCustomData === 'function') {
        const customResult = window.applyDevCustomData(levels, data.history || [], mode);
        if (customResult && Array.isArray(customResult.levels)) {
          levels = customResult.levels;
        }
      }

      if (levels.length > 0 && levels[0].video) {
        const ytId = extractYoutubeId(levels[0].video);
        if (ytId) {
          const thumbUrl = `https://img.youtube.com/vi/${ytId}/sddefault.jpg`;
          cardEl.style.setProperty('--card-bg', `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65)), url('${thumbUrl}')`);
          return;
        }
      }
    } catch (e) {
      console.warn(`[Level] Failed to load top level thumbnail for ${mode}:`, e);
    }

    if (defaultYtId) {
      const defaultThumb = `https://img.youtube.com/vi/${defaultYtId}/sddefault.jpg`;
      cardEl.style.setProperty('--card-bg', `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65)), url('${defaultThumb}')`);
    }
  }

  function updateAllCards() {
    loadTopLevelThumbnail('classic', '.box_classic', 'swG-0J9TBug');
    loadTopLevelThumbnail('challenge', '.box_challenge', 'IDoYqoZal0E');
    loadTopLevelThumbnail('platformer', '.box_platformer', 'VucerZF6Ewk');
  }

  updateAllCards();

  window.addEventListener('devDataUpdated', updateAllCards);
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('dev_custom_levels_')) {
      updateAllCards();
    }
  });
});
