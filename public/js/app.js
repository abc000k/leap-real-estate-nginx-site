(function () {
  const SERVICE_DETAILS = {
    advisory: {
      title: '城市战略与资产咨询',
      copy: '通过商圈竞品、客群迁移、租金承压点和公共配套分析，帮助业主确定产品定位、业态比例、改造节奏和招商叙事。'
    },
    capital: {
      title: '资本市场与交易支持',
      copy: '围绕现金流、租约质量、改造成本和退出场景建立投资判断，支持买方尽调、卖方材料、融资沟通和董事会决策。'
    },
    workplace: {
      title: '办公与品牌空间策略',
      copy: '把企业组织变化、员工体验和品牌展示转化为空间需求，形成选址、面积、功能配比和运营指标建议。'
    }
  };

  function getStoredTheme() {
    try {
      return window.localStorage.getItem('leap-theme');
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem('leap-theme', theme);
    } catch (error) {
      // Storage can be disabled in private browsing; theme still works for this page view.
    }
  }

  function preferredTheme() {
    const stored = getStoredTheme();
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    storeTheme(nextTheme);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(nextTheme === 'dark'));
      const icon = toggle.querySelector ? toggle.querySelector('[data-theme-icon]') : null;
      if (icon) icon.textContent = nextTheme === 'dark' ? '☀' : '☾';
    }
  }

  function typewriter(element, text, speed = 46, scheduler = window.setTimeout) {
    if (!element || !text) return;
    let index = 0;
    element.textContent = '';

    function step() {
      element.textContent = text.slice(0, index + 1);
      index += 1;
      if (index < text.length) scheduler(step, speed);
    }

    scheduler(step, speed);
  }

  function openServiceModal(card) {
    const service = card && SERVICE_DETAILS[card.dataset.serviceId];
    const modal = document.getElementById('serviceModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const close = document.getElementById('modalClose');
    if (!service || !modal || !title || !body) return;

    title.textContent = service.title;
    body.textContent = service.copy;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (close) close.focus();
  }

  function closeServiceModal() {
    const modal = document.getElementById('serviceModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  async function loadMarketSignal(target, fetcher = window.fetch) {
    if (!target || !fetcher) return;
    target.textContent = '正在连接 /api 市场信号...';

    try {
      const response = await fetcher('/api/repos/octocat/Hello-World');
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const data = await response.json();
      const stars = Number(data.stargazers_count || 0).toLocaleString('zh-CN');
      const updated = data.updated_at ? new Date(data.updated_at).toLocaleDateString('zh-CN') : '未知日期';
      target.textContent = `GitHub API 已通过 Nginx /api 返回：${data.full_name || 'octocat/Hello-World'}，关注度 ${stars}，最近更新 ${updated}。`;
    } catch (error) {
      target.textContent = '实时信号暂不可用，但 /api 反向代理配置已保留，可在 Nginx 环境中重试。';
    }
  }

  function bindCards() {
    document.querySelectorAll('[data-service-id]').forEach((card) => {
      card.addEventListener('click', () => openServiceModal(card));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openServiceModal(card);
        }
      });
    });
  }

  function bindModal() {
    const close = document.getElementById('modalClose');
    const modal = document.getElementById('serviceModal');
    if (close) close.addEventListener('click', closeServiceModal);
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target && event.target.matches && event.target.matches('[data-modal-close]')) {
          closeServiceModal();
        }
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeServiceModal();
    });
  }

  function init() {
    setTheme(preferredTheme());

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    const slogan = document.getElementById('slogan-typewriter');
    if (slogan) typewriter(slogan, slogan.dataset.text || slogan.textContent.trim());

    bindCards();
    bindModal();
    loadMarketSignal(document.getElementById('apiStatus'));
  }

  window.LeapApp = {
    SERVICE_DETAILS,
    setTheme,
    typewriter,
    openServiceModal,
    closeServiceModal,
    loadMarketSignal
  };

  document.addEventListener('DOMContentLoaded', init);
})();
