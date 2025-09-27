(() => {
  'use strict';

  const state = {
    allIcons: [],
    filtered: [],
    query: '',
    theme: localStorage.getItem('themeFilter') || 'all',
    page: 1,
    pageSize: 60,
    pngSize: parseInt(localStorage.getItem('pngSize') || '512', 10)
  };

  const els = {
    grid: document.getElementById('grid'),
    empty: document.getElementById('emptyState'),
    counts: document.getElementById('counts'),
    pagination: document.getElementById('pagination'),
    searchInput: document.getElementById('searchInput'),
    pills: Array.from(document.querySelectorAll('.pill')),
    toast: document.getElementById('toast'),
    pngSizeBtn: document.getElementById('pngSizeBtn'),
    pngSizeDialog: document.getElementById('pngSizeDialog')
  };

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function fetchIconsOnce() {
    return fetch('/api/icons', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        state.allIcons = Array.isArray(data) ? data : [];
        applyFilters();
      })
      .catch(err => { console.error(err); showToast('Failed to load icons'); });
  }

  function applyFilters() {
    const q = state.query.trim().toLowerCase();
    let items = state.allIcons;

    if (state.theme !== 'all') items = items.filter(i => i.theme === state.theme);
    if (q) items = items.filter(i => i.icn_name.toLowerCase().includes(q));

    // Keep original order from the JSON; no sorting requested.
    state.filtered = items;
    state.page = 1;
    render();
  }

  function paginate(items) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    const page = Math.min(state.page, pages);
    const start = (page - 1) * state.pageSize;
    const slice = items.slice(start, start + state.pageSize);
    return { slice, total, pages, page };
  }

  function render() {
    const { slice, total, pages, page } = paginate(state.filtered);

    els.grid.innerHTML = '';
    slice.forEach((rec, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.tabIndex = 0;
      card.setAttribute('role', 'gridcell');
      card.dataset.index = String((page-1)*state.pageSize + idx);
      card.innerHTML = `
        <div class="preview">
          <button class="bg-switch" data-act="toggle-bg" aria-label="Toggle dark background" aria-pressed="false"><span class="dot"></span></button>
          <img loading="lazy" src="${rec.icn_loc}" alt="${rec.icn_name}" />
        </div>
        <div class="name">${rec.icn_name}</div>
        <div class="meta">${rec.theme}</div>
        <div class="actions">
          <button class="btn accent" data-act="copy-svg" aria-label="Copy SVG">Copy SVG</button>
          <button class="btn" data-act="copy-png" aria-label="Copy PNG">Copy PNG</button>
          <a class="btn" data-act="dl-svg" href="${rec.icn_loc}" download>Download SVG</a>
          <button class="btn" data-act="dl-png" aria-label="Download PNG">Download PNG</button>
        </div>
      `;
      els.grid.appendChild(card);
    });

    els.empty.hidden = total !== 0;
    els.counts.textContent = `Showing ${slice.length} of ${total} icons · Page ${page}/${pages}`;

    // Pagination
    els.pagination.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'btn'; prev.textContent = 'Prev'; prev.disabled = page <= 1;
    prev.addEventListener('click', () => { state.page = Math.max(1, page - 1); render(); });
    const next = document.createElement('button');
    next.className = 'btn'; next.textContent = 'Next'; next.disabled = page >= pages;
    next.addEventListener('click', () => { state.page = Math.min(pages, page + 1); render(); });
    els.pagination.append(prev);
    const info = document.createElement('span'); info.style.padding = '6px 10px'; info.textContent = ` ${page} / ${pages} `;
    els.pagination.append(info);
    els.pagination.append(next);
  }

  // Actions
  async function handleAction(target) {
    const card = target.closest('.card');
    if (!card) return;
    const index = parseInt(card.dataset.index, 10);
    const rec = state.filtered[index];
    const act = target.getAttribute('data-act');
    if (!rec || !act) return;

    try {
      if (act === 'copy-svg') {
        const text = await fetch(rec.icn_loc).then(r => r.text());
        await navigator.clipboard.writeText(text);
        showToast('SVG copied to clipboard');
      } else if (act === 'toggle-bg') {
        const btn = target;
        const preview = card.querySelector('.preview');
        const isDark = preview.classList.toggle('dark');
        btn.setAttribute('aria-pressed', String(isDark));
      } else if (act === 'dl-png' || act === 'copy-png') {
        const blob = await svgToPngBlob(rec.icn_loc, state.pngSize);
        if (act === 'copy-png' && 'ClipboardItem' in window) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('PNG copied to clipboard');
          } catch (e) {
            // fallback to download
            downloadBlob(blob, `${rec.icn_name}_${state.pngSize}.png`);
            showToast('Clipboard not allowed. Downloaded PNG instead');
          }
        } else {
          downloadBlob(blob, `${rec.icn_name}_${state.pngSize}.png`);
          showToast('PNG downloaded');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Action failed');
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  async function svgToPngBlob(src, size) {
    const svgText = await fetch(src).then(r => r.text());
    const svg = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svg);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const p = new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      img.src = url;
      await p;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Paint white background to improve visibility on transparent icons
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0,0,size,size);
      // Draw image fitting within canvas preserving aspect ratio
      const scale = Math.min(size / img.width, size / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const x = Math.floor((size - w) / 2);
      const y = Math.floor((size - h) / 2);
      ctx.drawImage(img, x, y, w, h);
      return await new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Events
  els.grid.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (t) handleAction(t);
  });

  // Search debounce
  const onSearch = debounce((val) => { state.query = val; applyFilters(); }, 250);
  els.searchInput.addEventListener('input', (e) => onSearch(e.target.value));

  // Theme pills
  els.pills.forEach(p => {
    if (p.dataset.theme === state.theme) { p.classList.add('active'); p.setAttribute('aria-pressed','true'); }
    p.addEventListener('click', () => {
      els.pills.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
      p.classList.add('active'); p.setAttribute('aria-pressed','true');
      state.theme = p.dataset.theme; localStorage.setItem('themeFilter', state.theme);
      applyFilters();
    });
  });


  // PNG size dialog
  function openPngDialog() {
    const form = els.pngSizeDialog.querySelector('form');
    form.querySelectorAll('input[name="pngSize"]').forEach(r => {
      r.checked = parseInt(r.value, 10) === state.pngSize;
    });
    els.pngSizeDialog.showModal();
    form.addEventListener('close', () => {}, { once: true });
  }

  els.pngSizeBtn.addEventListener('click', openPngDialog);
  els.pngSizeDialog.addEventListener('close', () => {
    const checked = els.pngSizeDialog.querySelector('input[name="pngSize"]:checked');
    if (checked) {
      state.pngSize = parseInt(checked.value, 10);
      localStorage.setItem('pngSize', String(state.pngSize));
      showToast(`PNG size set to ${state.pngSize}px`);
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === '/') { e.preventDefault(); els.searchInput.focus(); }
    if (e.key === '?') { e.preventDefault(); showToast('Shortcuts: / focus search, arrows navigate, Enter primary action'); }
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
      const focusable = Array.from(els.grid.querySelectorAll('.card'));
      const idx = focusable.indexOf(document.activeElement);
      if (idx >= 0) {
        e.preventDefault();
        const colsGuess = Math.max(1, Math.round(els.grid.clientWidth / 180));
        let next = idx;
        if (e.key === 'ArrowLeft') next = Math.max(0, idx - 1);
        if (e.key === 'ArrowRight') next = Math.min(focusable.length - 1, idx + 1);
        if (e.key === 'ArrowUp') next = Math.max(0, idx - colsGuess);
        if (e.key === 'ArrowDown') next = Math.min(focusable.length - 1, idx + colsGuess);
        focusable[next]?.focus();
      }
    }
    if (e.key === 'Enter' && document.activeElement?.classList.contains('card')) {
      const primary = document.activeElement.querySelector('[data-act="copy-svg"]');
      primary?.click();
    }
  });

  // Initialize
  fetchIconsOnce().then(() => {
    // set initial search input from prior value if any
    const params = new URLSearchParams(location.search);
    const q = params.get('q'); if (q) { els.searchInput.value = q; state.query = q; applyFilters(); }
  });
})();
