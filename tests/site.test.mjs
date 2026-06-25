import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function readProjectFile(...parts) {
  return readFile(path.join(root, ...parts), 'utf8');
}

function makeClassList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle: (item, force) => {
      const shouldAdd = force ?? !values.has(item);
      if (shouldAdd) values.add(item);
      else values.delete(item);
      return shouldAdd;
    },
    contains: (item) => values.has(item),
    toString: () => [...values].join(' ')
  };
}

function makeElement(id = '') {
  return {
    id,
    textContent: '',
    innerHTML: '',
    dataset: {},
    attributes: {},
    style: {},
    classList: makeClassList(),
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    focus() {
      this.focused = true;
    },
    querySelector(selector) {
      if (selector === '[data-modal-title]') return this.modalTitle ?? null;
      if (selector === '[data-modal-copy]') return this.modalCopy ?? null;
      return null;
    }
  };
}

function loadClientScript(script) {
  const elements = new Map([
    ['themeToggle', makeElement('themeToggle')],
    ['slogan-typewriter', makeElement('slogan-typewriter')],
    ['serviceModal', makeElement('serviceModal')],
    ['modalTitle', makeElement('modalTitle')],
    ['modalBody', makeElement('modalBody')],
    ['modalClose', makeElement('modalClose')],
    ['cityDataStatus', makeElement('cityDataStatus')],
    ['newsStatus', makeElement('newsStatus')]
  ]);
  const cards = ['advisory', 'capital', 'workplace'].map((id) => {
    const card = makeElement(id);
    card.dataset.serviceId = id;
    return card;
  });
  const storage = new Map();
  const timers = [];
  const context = {
    console,
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout() {},
    fetch: async (url) => {
      context.fetchUrls.push(url);
      const payload = url.includes('/api/city/')
        ? {
            current: {
              temperature_2m: 27.4,
              relative_humidity_2m: 68,
              wind_speed_10m: 12.5
            }
          }
        : {
            hits: [
              {
                title: 'Shanghai office market tracks urban renewal demand',
                url: 'https://example.com/shanghai-office-market'
              },
              {
                title: 'Capital flows into mixed-use districts',
                url: 'https://example.com/capital-flows'
              }
            ]
          };
      return {
        ok: true,
        json: async () => payload
      };
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    matchMedia: () => ({ matches: false }),
    document: {
      documentElement: { dataset: {} },
      body: { classList: makeClassList() },
      getElementById: (id) => elements.get(id) ?? null,
      querySelectorAll: (selector) => (selector === '[data-service-id]' ? cards : []),
      addEventListener(type, handler) {
        if (type === 'DOMContentLoaded') context.readyHandler = handler;
      }
    }
  };
  context.fetchUrls = [];
  context.window = context;
  vm.createContext(context);
  vm.runInContext(script, context, { filename: 'public/js/app.js' });
  return { context, elements, cards, timers, storage };
}

test('homepage includes a polished LEAP real estate consulting structure', async () => {
  const html = await readProjectFile('public', 'index.html');
  assert.match(html, /立璞房产咨询有限公司/);
  assert.match(html, /id="slogan-typewriter"/);
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /public\/?css|css\/styles\.css/);
  assert.match(html, /js\/app\.js/);
  assert.equal([...html.matchAll(/data-service-id="/g)].length, 3);
  assert.match(html, /团队|联系|顾问/);
  assert.match(html, /cityDataStatus/);
  assert.match(html, /newsStatus/);
  assert.match(html, /assets\/leap-district\.webp/);
});

test('client script implements theme, typewriter, modal, city data, and news API behavior', async () => {
  const script = await readProjectFile('public', 'js', 'app.js');
  const { context, elements, cards, timers, storage } = loadClientScript(script);

  assert.equal(typeof context.window.LeapApp.setTheme, 'function');
  assert.equal(typeof context.window.LeapApp.typewriter, 'function');
  assert.equal(typeof context.window.LeapApp.openServiceModal, 'function');
  assert.equal(typeof context.window.LeapApp.loadCityData, 'function');
  assert.equal(typeof context.window.LeapApp.loadNewsFeed, 'function');

  context.window.LeapApp.setTheme('dark');
  assert.equal(context.document.documentElement.dataset.theme, 'dark');
  assert.equal(storage.get('leap-theme'), 'dark');

  const slogan = elements.get('slogan-typewriter');
  context.window.LeapApp.typewriter(slogan, '粉色增长曲线', 0);
  while (timers.length) timers.shift()();
  assert.equal(slogan.textContent, '粉色增长曲线');

  context.window.LeapApp.openServiceModal(cards[0]);
  assert.equal(elements.get('serviceModal').attributes['aria-hidden'], 'false');
  assert.match(elements.get('modalTitle').textContent, /战略|城市|咨询|资本|办公/);

  await context.window.LeapApp.loadCityData(elements.get('cityDataStatus'));
  await context.window.LeapApp.loadNewsFeed(elements.get('newsStatus'));
  assert.equal(context.fetchUrls[0], '/api/city/forecast?latitude=31.2304&longitude=121.4737&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FShanghai');
  assert.equal(context.fetchUrls[1], '/api/news/search?query=commercial%20real%20estate&tags=story&hitsPerPage=3');
  assert.match(elements.get('cityDataStatus').textContent, /27\.4|68|12\.5|上海/);
  assert.match(elements.get('newsStatus').textContent, /Shanghai office market|Capital flows/);
});

test('nginx configuration serves static files, proxies /api, handles 404, and enables HTTPS', async () => {
  const nginx = await readProjectFile('nginx', 'nginx.conf');
  assert.match(nginx, /listen\s+80;/);
  assert.match(nginx, /listen\s+443\s+ssl/);
  assert.match(nginx, /root\s+\/usr\/share\/nginx\/html;/);
  assert.match(nginx, /location\s+\/api\/city\//);
  assert.match(nginx, /proxy_pass\s+https:\/\/api\.open-meteo\.com\/v1\//);
  assert.match(nginx, /proxy_set_header\s+Host\s+api\.open-meteo\.com;/);
  assert.match(nginx, /location\s+\/api\/news\//);
  assert.match(nginx, /proxy_pass\s+https:\/\/hn\.algolia\.com\/api\/v1\//);
  assert.match(nginx, /proxy_set_header\s+Host\s+hn\.algolia\.com;/);
  assert.match(nginx, /error_page\s+404\s+\/404\.html;/);
  assert.match(nginx, /try_files\s+\$uri\s+\$uri\/\s+=404;/);
  assert.match(nginx, /Cache-Control/);
});

test('docker startup builds an nginx demo with generated self-signed HTTPS certs', async () => {
  const dockerfile = await readProjectFile('Dockerfile');
  const compose = await readProjectFile('docker-compose.yml');
  assert.match(dockerfile, /FROM\s+nginx:alpine/);
  assert.match(dockerfile, /COPY\s+public\/\s+\/usr\/share\/nginx\/html\//);
  assert.match(dockerfile, /COPY\s+nginx\/nginx\.conf/);
  assert.match(dockerfile, /openssl\s+req\s+-x509/);
  assert.match(compose, /8080:80/);
  assert.match(compose, /8443:443/);
});

test('README includes project name, copy-paste startup commands, nginx validation, and AI note', async () => {
  const readme = await readProjectFile('README.md');
  assert.match(readme, /立璞房产咨询有限公司官网/);
  assert.match(readme, /docker compose up --build/);
  assert.match(readme, /nginx -t/);
  assert.match(readme, /GitHub|公开仓库|public/i);
  assert.match(readme, /ChatGPT|Codex|Cursor|Copilot/);
});

test('404 page and compressed local hero image asset are present', async () => {
  const notFound = await readProjectFile('public', '404.html');
  assert.match(notFound, /404/);
  assert.match(notFound, /返回首页|Back/);

  const hero = await stat(path.join(root, 'public', 'assets', 'leap-district.webp'));
  assert.ok(hero.size > 1000, 'hero asset should not be empty');
  assert.ok(hero.size < 250 * 1024, 'hero asset should stay compressed for performance');
});
