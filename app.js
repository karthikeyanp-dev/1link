const STORAGE_KEY = 'one-link:v1';
const state = {
  collections: [],
  activeId: null,
  installPrompt: null,
};

const els = {
  collectionList: document.getElementById('collectionList'),
  collectionCount: document.getElementById('collectionCount'),
  activeCollectionTitle: document.getElementById('activeCollectionTitle'),
  addLinkForm: document.getElementById('addLinkForm'),
  linkGrid: document.getElementById('linkGrid'),
  emptyState: document.getElementById('emptyState'),
  newCollectionBtn: document.getElementById('newCollectionBtn'),
  renameCollectionBtn: document.getElementById('renameCollectionBtn'),
  deleteCollectionBtn: document.getElementById('deleteCollectionBtn'),
  exportCollectionBtn: document.getElementById('exportCollectionBtn'),
  installBtn: document.getElementById('installBtn'),
  linkUrl: document.getElementById('linkUrl'),
  linkTitle: document.getElementById('linkTitle'),
  collectionItemTpl: document.getElementById('collectionItemTpl'),
  linkCardTpl: document.getElementById('linkCardTpl'),
};

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ collections: state.collections, activeId: state.activeId }));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.collections = Array.isArray(data.collections) ? data.collections : [];
    state.activeId = data.activeId;
  } catch {
    state.collections = [];
  }
}

function getActiveCollection() {
  return state.collections.find((c) => c.id === state.activeId) || null;
}

function setActiveCollection(id) {
  state.activeId = id;
  save();
  render();
}

function createCollection(name) {
  const collection = { id: uid(), name, createdAt: now(), links: [] };
  state.collections.unshift(collection);
  state.activeId = collection.id;
  save();
  render();
}

function deleteActiveCollection() {
  const active = getActiveCollection();
  if (!active) return;
  if (!confirm(`Delete "${active.name}" collection?`)) return;
  state.collections = state.collections.filter((c) => c.id !== active.id);
  state.activeId = state.collections[0]?.id || null;
  save();
  render();
}

function renameActiveCollection() {
  const active = getActiveCollection();
  if (!active) return;
  const name = prompt('Rename collection', active.name)?.trim();
  if (!name) return;
  active.name = name;
  save();
  render();
}

function addLinkToActive(urlInput, customTitle) {
  const active = getActiveCollection();
  if (!active) return;
  let parsed;
  try {
    parsed = new URL(urlInput);
  } catch {
    alert('Please add a valid URL.');
    return;
  }

  const url = parsed.toString();
  const host = parsed.hostname.replace('www.', '');
  const link = {
    id: uid(),
    url,
    title: customTitle?.trim() || host,
    hostname: host,
    addedAt: now(),
    previewImage: '',
    previewNote: 'Fetching preview…',
  };
  active.links.unshift(link);
  save();
  render();
  enrichLinkPreview(link);
}

async function enrichLinkPreview(link) {
  try {
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(link.url)}&meta=true&screenshot=true`;
    const response = await fetch(endpoint);
    const data = await response.json();
    const result = data?.data;
    if (result?.title && !link.title) link.title = result.title;
    if (result?.image?.url) link.previewImage = result.image.url;
    if (result?.publisher) link.previewNote = `Source: ${result.publisher}`;
    else link.previewNote = 'Live preview available';
  } catch {
    link.previewImage = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.hostname)}&sz=128`;
    link.previewNote = 'Fallback preview';
  } finally {
    save();
    renderLinks();
  }
}

function renderCollections() {
  els.collectionList.innerHTML = '';
  els.collectionCount.textContent = String(state.collections.length);

  for (const collection of state.collections) {
    const node = els.collectionItemTpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.collection-name').textContent = collection.name;
    node.querySelector('.collection-meta').textContent = `${collection.links.length} links`;
    if (collection.id === state.activeId) node.classList.add('active');
    node.addEventListener('click', () => setActiveCollection(collection.id));
    els.collectionList.appendChild(node);
  }
}

function renderLinks() {
  const active = getActiveCollection();
  els.linkGrid.innerHTML = '';

  if (!active) {
    els.emptyState.classList.remove('hidden');
    els.linkGrid.classList.add('hidden');
    return;
  }

  if (active.links.length === 0) {
    els.emptyState.innerHTML = '<p>No links yet. Add your first URL above.</p>';
    els.emptyState.classList.remove('hidden');
    els.linkGrid.classList.add('hidden');
    return;
  }

  els.emptyState.classList.add('hidden');
  els.linkGrid.classList.remove('hidden');

  for (const link of active.links) {
    const node = els.linkCardTpl.content.firstElementChild.cloneNode(true);
    node.href = link.url;
    node.querySelector('.link-title').textContent = link.title;
    node.querySelector('.link-url').textContent = link.url;
    node.querySelector('.link-note').textContent = link.previewNote || link.hostname;
    const image = node.querySelector('.preview-image');
    const fallback = node.querySelector('.preview-fallback');

    if (link.previewImage) {
      image.src = link.previewImage;
      image.classList.remove('hidden');
      fallback.classList.add('hidden');
    } else {
      image.classList.add('hidden');
      fallback.classList.remove('hidden');
      fallback.textContent = link.hostname[0]?.toUpperCase() || '🔗';
    }
    els.linkGrid.appendChild(node);
  }
}

function render() {
  const active = getActiveCollection();
  renderCollections();
  renderLinks();

  if (!active) {
    els.activeCollectionTitle.textContent = 'Choose a collection';
    els.addLinkForm.classList.add('hidden');
    els.renameCollectionBtn.classList.add('hidden');
    els.deleteCollectionBtn.classList.add('hidden');
    els.exportCollectionBtn.classList.add('hidden');
    els.emptyState.innerHTML = '<p>Create your first collection to start adding links.</p>';
    return;
  }

  els.activeCollectionTitle.textContent = active.name;
  els.addLinkForm.classList.remove('hidden');
  els.renameCollectionBtn.classList.remove('hidden');
  els.deleteCollectionBtn.classList.remove('hidden');
  els.exportCollectionBtn.classList.remove('hidden');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function exportActiveCollection() {
  const active = getActiveCollection();
  if (!active) return;
  const cards = active.links
    .map((link) => {
      const image = link.previewImage
        ? `<img src="${escapeHtml(link.previewImage)}" alt="${escapeHtml(link.title)}" />`
        : `<div class="ph">${escapeHtml(link.hostname[0]?.toUpperCase() || '🔗')}</div>`;
      return `
      <a class="card" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
        ${image}
        <div class="ct">
          <h3>${escapeHtml(link.title)}</h3>
          <p>${escapeHtml(link.url)}</p>
        </div>
      </a>`;
    })
    .join('');

  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(active.name)} • 1Link Export</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#070b14;color:#e2e8f0;margin:0;padding:1rem}
main{max-width:1000px;margin:auto}.top{margin-bottom:1rem}h1{margin:.2rem 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.8rem}
.card{text-decoration:none;color:inherit;border:1px solid #334155;border-radius:12px;overflow:hidden;background:#0f172a;display:block}
img,.ph{width:100%;height:120px;object-fit:cover;display:grid;place-items:center;background:linear-gradient(120deg,#172554,#0f766e);font-size:2rem}
.ct{padding:.6rem}.ct h3{margin:0 0 .3rem;font-size:1rem}.ct p{margin:0;color:#94a3b8;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
small{color:#94a3b8}
</style></head><body><main><div class="top"><small>Exported with 1Link</small><h1>${escapeHtml(active.name)}</h1></div><section class="grid">${cards || '<p>No links in this collection.</p>'}</section></main></body></html>`;

  const blob = new Blob([page], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${active.name.toLowerCase().replace(/\s+/g, '-') || 'collection'}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function setupEvents() {
  els.newCollectionBtn.addEventListener('click', () => {
    const name = prompt('Collection name')?.trim();
    if (name) createCollection(name);
  });

  els.renameCollectionBtn.addEventListener('click', renameActiveCollection);
  els.deleteCollectionBtn.addEventListener('click', deleteActiveCollection);
  els.exportCollectionBtn.addEventListener('click', exportActiveCollection);

  els.addLinkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addLinkToActive(els.linkUrl.value.trim(), els.linkTitle.value.trim());
    els.addLinkForm.reset();
    els.linkUrl.focus();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    els.installBtn.classList.remove('hidden');
  });

  els.installBtn.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    els.installBtn.classList.add('hidden');
  });
}

function bootstrap() {
  load();
  if (state.collections.length > 0 && !state.activeId) state.activeId = state.collections[0].id;
  setupEvents();
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
  }
}

bootstrap();
