document.addEventListener('DOMContentLoaded', () => {
  // GitHub API 설정 (뉴스 데이터 저장소 - 로컬 스토리지에서 불러오기)
  const githubConfig = {
    token: localStorage.getItem('dev_gh_token') || "",
    owner: localStorage.getItem('dev_gh_owner') || "",
    repo: localStorage.getItem('dev_gh_repo') || "",
    path: localStorage.getItem('dev_gh_path') || "news.json"
  };

  const getApiUrl = () => {
    return `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${githubConfig.path}`;
  };

  // 뉴스 표시 영역
  const mainNewsContainer = document.getElementById('main-news-container');

  // 개발자 도구 내 화면 전환용 요소 (프레임워크는 all.js에 있음)
  const devMainControls = document.getElementById('dev-main-controls');
  const devConsole = document.querySelector('.dev-console'); // 설정 연결 테스트 로그 출력용

  // 뉴스 입력/수정 관련 요소
  const devNewsInputArea = document.getElementById('dev-news-input-area');
  const devNewsOpenBtn = document.getElementById('dev-news-open-btn');
  const devNewsBackBtn = document.getElementById('dev-news-back-btn');
  const devNewsInput = document.getElementById('dev-news-input');
  const devNewsPostBtn = document.getElementById('dev-news-post-btn');

  // 뉴스 관리 관련 요소
  const devNewsManageBtn = document.getElementById('dev-news-manage-btn');
  const devNewsManageArea = document.getElementById('dev-news-manage-area');
  const devManageList = document.getElementById('dev-manage-list');
  const devNewsManageBackBtn = document.getElementById('dev-news-manage-back-btn');
  const devNewsClearAllBtn = document.getElementById('dev-news-clear-all-btn');

  // 뉴스 저장소(GitHub) 설정 관련 요소
  const devSettingsOpenBtn = document.getElementById('dev-settings-open-btn');
  const devSettingsArea = document.getElementById('dev-settings-area');
  const devSettingsSaveBtn = document.getElementById('dev-settings-save-btn');
  const devSettingsTestBtn = document.getElementById('dev-settings-test-btn');
  const devSettingsBackBtn = document.getElementById('dev-settings-back-btn');
  const devTokenInput = document.getElementById('dev-token-input');
  const devOwnerInput = document.getElementById('dev-owner-input');
  const devRepoInput = document.getElementById('dev-repo-input');
  const devPathInput = document.getElementById('dev-path-input');

  let currentEditKey = null; // 현재 수정 중인 뉴스의 고유 키 저장

  // 컬러 태그 파싱 헬퍼 함수
  const parseColorTags = (text) => {
    return text.replace(/<color=(#[0-9a-fA-F]{6})>(.*?)<\/color>/g, '<span style="color: $1">$2</span>');
  };

  const defaultNewsList = [];

  const getLocalNews = () => {
    // 아직 정식 출시 전이므로 항시 비워둡니다.
    localStorage.setItem('dev_custom_news', JSON.stringify([]));
    return [];
  };

  // GitHub에서 데이터 가져오기 (실패 시 로컬 저장소 폴백)
  const fetchNewsFromGitHub = async () => {
    if (!githubConfig.owner || !githubConfig.repo) {
      return { news: getLocalNews(), sha: null, isLocal: true };
    }
    try {
      const headers = {};
      if (githubConfig.token) {
        headers.Authorization = `token ${githubConfig.token}`;
      }
      const response = await fetch(getApiUrl(), { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const content = decodeURIComponent(escape(atob(data.content)));
      return { news: JSON.parse(content), sha: data.sha, isLocal: false };
    } catch (error) {
      console.warn("GitHub News Load Fallback to LocalStorage:", error);
      return { news: getLocalNews(), sha: null, isLocal: true };
    }
  };

  // GitHub 및 로컬에 데이터 저장하기
  const updateGitHubNews = async (newNewsList, sha) => {
    localStorage.setItem('dev_custom_news', JSON.stringify(newNewsList));
    if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(newNewsList, null, 2))));
      try {
        await fetch(getApiUrl(), {
          method: 'PUT',
          headers: {
            Authorization: `token ${githubConfig.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: "Update news via Developer Tools",
            content: content,
            sha: sha
          })
        });
      } catch (error) {
        console.warn("GitHub API Save Error, saved to LocalStorage instead:", error);
      }
    }
    refreshNewsUI();
  };

  // UI 업데이트 통합 함수
  const refreshNewsUI = async () => {
    const { news } = await fetchNewsFromGitHub();

    // 메인 화면 업데이트
    if (mainNewsContainer) {
      mainNewsContainer.innerHTML = '';
      if (!news || news.length === 0) {
        mainNewsContainer.innerHTML = '<p style="color: rgba(255,255,255,0.4); text-align: center; padding: 3vw 1vw; font-size: 1.2vw; font-family: \'Paperozi\', sans-serif;">등록된 뉴스가 없습니다.</p>';
      } else {
        news.forEach(item => {
          const mainNewsItem = document.createElement('div');
          mainNewsItem.className = 'news-item';
          mainNewsItem.innerHTML = `<span class="news-date-tag">${item.date}</span> ${parseColorTags(item.content)}`;
          mainNewsContainer.prepend(mainNewsItem);
        });
      }
    }

    // 관리 목록 업데이트
    if (devNewsManageArea && devNewsManageArea.style.display === 'block') {
      renderManageList(news);
    }
  };

  // 초기 로드
  refreshNewsUI();

  // 뉴스 관리 목록 렌더링
  const renderManageList = (newsList) => {
    if (!devManageList) return;
    devManageList.innerHTML = '';

    if (!newsList || newsList.length === 0) {
      devManageList.innerHTML = '<p style="color: #888; text-align: center;">등록된 뉴스가 없습니다.</p>';
      return;
    }

    newsList.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'dev-manage-item';
      itemDiv.innerHTML = `
        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;">
          <span style="color: #888;">[${item.date}]</span> ${parseColorTags(item.content)}
        </div>
        <div style="display: flex; gap: 5px;">
          <button class="dev-edit-btn" data-index="${index}">수정</button>
          <button class="dev-delete-btn" data-index="${index}">삭제</button>
        </div>
      `;
      devManageList.appendChild(itemDiv);
    });

    // 삭제 버튼 이벤트 연결
    devManageList.querySelectorAll('.dev-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteNewsItem(parseInt(e.target.dataset.index)));
    });

    // 수정 버튼 이벤트 연결
    devManageList.querySelectorAll('.dev-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        currentEditKey = index; // 여기서는 index를 키로 활용
        fetchNewsFromGitHub().then(({ news }) => {
          devNewsInput.value = news[index].content;
          devNewsPostBtn.textContent = '수정';
          devNewsManageArea.style.display = 'none';
          devNewsInputArea.style.display = 'block';
          devNewsInput.focus();
        });
      });
    });
  };

  const deleteNewsItem = async (index) => {
    if (!confirm('이 뉴스 항목을 삭제하시겠습니까?')) return;
    const { news, sha } = await fetchNewsFromGitHub();
    news.splice(index, 1);
    updateGitHubNews(news, sha);
  };

  // 개발자 도구가 열릴 때(비밀번호 통과 시) 뉴스 화면 초기화 및 갱신
  document.addEventListener('devtools:opened', () => {
    if (devNewsInputArea) devNewsInputArea.style.display = 'none';
    if (devNewsManageArea) devNewsManageArea.style.display = 'none';
    if (devSettingsArea) devSettingsArea.style.display = 'none';
    currentEditKey = null;

    // 설정값이 있다면 UI 갱신 시도
    if (githubConfig.owner && githubConfig.repo) {
      refreshNewsUI();
    }
  });

  // GitHub(뉴스 저장소) 설정 화면 전환
  if (devSettingsOpenBtn) {
    devSettingsOpenBtn.addEventListener('click', () => {
      devMainControls.style.display = 'none';
      devSettingsArea.style.display = 'block';

      // 현재 저장된 설정값 표시
      devTokenInput.value = githubConfig.token;
      devOwnerInput.value = githubConfig.owner;
      devRepoInput.value = githubConfig.repo;
      devPathInput.value = githubConfig.path;
    });
  }

  // GitHub 연결 테스트 로직
  if (devSettingsTestBtn) {
    devSettingsTestBtn.addEventListener('click', async () => {
      const token = devTokenInput.value.trim();
      const owner = devOwnerInput.value.trim();
      const repo = devRepoInput.value.trim();
      const path = devPathInput.value.trim();

      if (!owner || !repo || !path) {
        alert('Owner, Repository, Path 정보를 모두 입력해주세요.');
        return;
      }

      const testUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = {};
      if (token) headers.Authorization = `token ${token}`;

      const logToConsole = (msg, color = '#fff') => {
        const p = document.createElement('p');
        p.style.color = color;
        p.textContent = `> ${msg}`;
        devConsole.appendChild(p);
        devConsole.scrollTop = devConsole.scrollHeight;
      };

      logToConsole(`연결 테스트 시도 중... (${owner}/${repo})`, '#aaa');

      try {
        const response = await fetch(testUrl, { headers });
        if (response.ok) {
          logToConsole('GitHub 연결 성공! 데이터를 불러올 수 있습니다.', '#0f0');
          alert('GitHub 연결 테스트 성공!');
        } else {
          const errData = await response.json();
          logToConsole(`연결 실패: ${response.status} (${errData.message})`, '#f00');
          alert(`연결 테스트 실패: ${response.status}`);
        }
      } catch (error) {
        logToConsole(`네트워크 오류: ${error.message}`, '#f00');
        alert('테스트 도중 네트워크 오류가 발생했습니다.');
      }
    });
  }

  // 설정 저장 로직
  if (devSettingsSaveBtn) {
    devSettingsSaveBtn.addEventListener('click', () => {
      const token = devTokenInput.value.trim();
      const owner = devOwnerInput.value.trim();
      const repo = devRepoInput.value.trim();
      const path = devPathInput.value.trim();

      githubConfig.token = token;
      githubConfig.owner = owner;
      githubConfig.repo = repo;
      githubConfig.path = path;

      localStorage.setItem('dev_gh_token', token);
      localStorage.setItem('dev_gh_owner', owner);
      localStorage.setItem('dev_gh_repo', repo);
      localStorage.setItem('dev_gh_path', path);

      alert('설정이 저장되었습니다.');
      devSettingsBackBtn.click();
      refreshNewsUI();
    });
  }

  // 설정 화면에서 뒤로가기
  if (devSettingsBackBtn) {
    devSettingsBackBtn.addEventListener('click', () => {
      devSettingsArea.style.display = 'none';
      devMainControls.style.display = 'block';
    });
  }

  // 뉴스 관리 화면 전환
  if (devNewsManageBtn) {
    devNewsManageBtn.addEventListener('click', () => {
      devMainControls.style.display = 'none';
      devNewsManageArea.style.display = 'block';
      refreshNewsUI();
    });
  }

  // 뉴스 관리에서 뒤로가기
  if (devNewsManageBackBtn) {
    devNewsManageBackBtn.addEventListener('click', () => {
      devNewsManageArea.style.display = 'none';
      devMainControls.style.display = 'block';
    });
  }

  // 전체 뉴스 삭제
  if (devNewsClearAllBtn) {
    devNewsClearAllBtn.addEventListener('click', () => {
      if (confirm('모든 뉴스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        fetchNewsFromGitHub().then(({ sha }) => {
          updateGitHubNews([], sha);
        });
      }
    });
  }

  // 뉴스 추가 화면 전환 (뉴스 추가 버튼 클릭 시)
  if (devNewsOpenBtn) {
    devNewsOpenBtn.addEventListener('click', () => {
      currentEditKey = null;
      devNewsPostBtn.textContent = '등록';
      devMainControls.style.display = 'none';
      devNewsInputArea.style.display = 'block';
      devNewsInput.value = '';
      devNewsInput.focus();
    });
  }

  // 뉴스 입력창에서 뒤로가기
  if (devNewsBackBtn) {
    devNewsBackBtn.addEventListener('click', () => {
      devNewsInputArea.style.display = 'none';
      if (currentEditKey !== null) {
        devNewsManageArea.style.display = 'block';
        currentEditKey = null;
        devNewsPostBtn.textContent = '등록';
      } else {
        devMainControls.style.display = 'block';
      }
    });
  }

  if (devNewsPostBtn) {
    devNewsPostBtn.addEventListener('click', async () => {
      const content = devNewsInput.value.trim();
      if (!content) return alert('내용을 입력해주세요.');

      const { news, sha } = await fetchNewsFromGitHub();

      if (currentEditKey !== null) {
        // 기존 항목 수정
        news[currentEditKey].content = content;
      } else {
        // 새 항목 추가
        const date = new Date().toISOString().split('T')[0];
        news.push({ date, content });
      }

      await updateGitHubNews(news, sha);

      devNewsBackBtn.click(); // 등록 후 다시 메인 메뉴로 이동
    });
  }
});
