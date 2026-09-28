// App UI logic: dynamic converter blocks, summary list, navigation
document.addEventListener('DOMContentLoaded', () => {
  const landing = document.getElementById('landing');
  const converterView = document.getElementById('converterView');
  const otherView = document.getElementById('otherView');

  const navButtons = document.querySelectorAll('.nav-btn');
  const openButtons = document.querySelectorAll('.open-tool');
  const homeBtn = document.getElementById('homeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const fontSizeRange = document.getElementById('fontSizeRange');
  const fontSizeValue = document.getElementById('fontSizeValue');

  let savedSettings = {};
  try {
    savedSettings = JSON.parse(localStorage.getItem('converterSettings') || '{}');
  } catch {}

  function saveSettings() {
    try {
      localStorage.setItem('converterSettings', JSON.stringify({
        darkMode: darkModeToggle.checked,
        fontSize: Number(fontSizeRange.value)
      }));
    } catch {}
  }

  function applyFontSize(value) {
    const fontSize = Math.min(20, Math.max(14, Number(value) || 16));
    fontSizeRange.value = String(fontSize);
    fontSizeValue.value = `${fontSize} px`;
    fontSizeValue.textContent = `${fontSize} px`;
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }

  darkModeToggle.checked = savedSettings.darkMode === true;
  document.body.dataset.theme = darkModeToggle.checked ? 'dark' : 'light';
  applyFontSize(savedSettings.fontSize);

  settingsBtn.addEventListener('click', () => {
    const isExpanded = settingsBtn.getAttribute('aria-expanded') === 'true';
    settingsBtn.setAttribute('aria-expanded', String(!isExpanded));
    settingsPanel.hidden = isExpanded;
  });
  darkModeToggle.addEventListener('change', () => {
    document.body.dataset.theme = darkModeToggle.checked ? 'dark' : 'light';
    saveSettings();
  });
  fontSizeRange.addEventListener('input', () => {
    applyFontSize(fontSizeRange.value);
    saveSettings();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.settings-menu')) {
      settingsPanel.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      settingsPanel.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
      settingsBtn.focus();
    }
  });

  const blocksContainer = document.getElementById('blocksContainer');
  const addBlockBtn = document.getElementById('addBlockBtn');
  const summaryList = document.getElementById('summaryList');

  let currentTool = 'unit';
  let currentCategory = 'length';
  let currentStateKey = 'unit:length';

  // Keep a map of blockId -> { summaryId, summaryEl }
  let blockMap = new Map();
  const toolStates = new Map();

  function saveToolState(stateKey) {
    toolStates.set(stateKey, {
      blocks: Array.from(blocksContainer.children),
      blockMap: new Map(blockMap)
    });
  }

  function restoreToolState(stateKey) {
    const saved = toolStates.get(stateKey);
    if (!saved) return false;

    blockMap = new Map(saved.blockMap);
    blocksContainer.replaceChildren(...saved.blocks);
    return true;
  }

  function syncSummaryOrder() {
    const orderedItems = Array.from(summaryList.children).sort((left, right) => {
      return Date.parse(left.dataset.timestamp) - Date.parse(right.dataset.timestamp);
    });
    summaryList.replaceChildren(...orderedItems);
  }

  // Generate unique IDs
  function uid(prefix = '') {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  function escapeCsvValue(value) {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportSummaryCsv(items, filename = 'converter-summary.csv') {
    const rows = [['Tool', 'Category', 'From', 'To', 'Result', 'Timestamp']];
    const selectedItems = items || Array.from(summaryList.querySelectorAll('.summary-item')).filter(item => {
      return item.dataset.tool === currentTool && (currentTool !== 'unit' || item.dataset.category === currentCategory);
    });

    selectedItems.forEach(item => {
      if (!item.dataset.tool || item.dataset.result === '—' || item.dataset.result === 'Error') {
        return;
      }

      rows.push([
        item.dataset.tool,
        item.dataset.category || '',
        item.dataset.from || '',
        item.dataset.to || '',
        item.dataset.result || item.querySelector('.text')?.textContent || '',
        item.dataset.timestamp || new Date().toISOString()
      ]);
    });

    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportAllSummaryCsv() {
    exportSummaryCsv(Array.from(summaryList.querySelectorAll('.summary-item')), 'converter-all-summary.csv');
  }

  // Create a summary item DOM node
  function createSummaryItem(text, meta, summaryId, record = {}) {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.dataset.summaryId = summaryId;
    item.dataset.tool = record.tool || '';
    item.dataset.category = record.category || '';
    item.dataset.from = record.from || '';
    item.dataset.to = record.to || '';
    item.dataset.result = record.result || text;
    item.dataset.timestamp = record.timestamp || new Date().toISOString();
    item.dataset.preview = record.preview ? 'true' : 'false';
    item.innerHTML = `<div class="text">${text}</div><div class="meta">${meta}</div>`;
    item.addEventListener('click', () => {
      navigator.clipboard?.writeText(item.querySelector('.text').textContent).then(() => {
        item.classList.add('copied');
        setTimeout(() => item.classList.remove('copied'), 900);
      }).catch(() => {});
    });
    return item;
  }

  function persistSummaryHistory() {
    const history = Array.from(summaryList.querySelectorAll('.summary-item'))
      .filter(item => item.dataset.tool)
      .map(item => ({
        summaryId: item.dataset.summaryId,
        text: item.querySelector('.text')?.textContent || '',
        meta: item.querySelector('.meta')?.textContent || '',
        tool: item.dataset.tool,
        category: item.dataset.category,
        from: item.dataset.from,
        to: item.dataset.to,
        result: item.dataset.result,
        timestamp: item.dataset.timestamp
      }));
    try {
      localStorage.setItem('converterSummaryHistory', JSON.stringify(history));
    } catch {}
  }

  function restoreSummaryHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('converterSummaryHistory') || '[]');
      if (!Array.isArray(history)) return;
      history.forEach(record => {
        if (record.tool && record.summaryId) {
          summaryList.appendChild(createSummaryItem(record.text, record.meta, record.summaryId, record));
        }
      });
    } catch {}
  }

  function addSummaryRecord(blockId, text, meta, record) {
    let map = blockMap.get(blockId);
    if (!map) {
      for (const state of toolStates.values()) {
        map = state.blockMap.get(blockId);
        if (map) break;
      }
    }
    if (!map) return;
    const previewItem = map.summaryEl?.dataset.preview === 'true' ? map.summaryEl : null;
    if (!record.tool) {
      if (previewItem) {
        previewItem.remove();
        map.summaryEl = null;
        persistSummaryHistory();
      }
      return;
    }

    if (previewItem) {
      previewItem.querySelector('.text').textContent = text;
      previewItem.querySelector('.meta').textContent = meta;
      Object.entries(record).forEach(([key, value]) => {
        if (key !== 'preview') previewItem.dataset[key] = value;
      });
      previewItem.dataset.preview = record.preview ? 'true' : 'false';
      map.summaryEl = record.preview ? previewItem : null;
      persistSummaryHistory();
      return;
    }

    const summaryId = uid('sum_');
    const item = createSummaryItem(text, meta, summaryId, {
      ...record,
      timestamp: record.timestamp || new Date().toISOString()
    });
    summaryList.appendChild(item);
    map.summaryEl = record.preview ? item : null;
    persistSummaryHistory();
  }

  restoreSummaryHistory();

  function createCurrencyOptionBlock() {
    const blockId = uid('blk_');
    const summaryId = uid('sum_');

    const block = document.createElement('div');
    block.className = 'converter-block';
    block.dataset.blockId = blockId;
    block.dataset.tool = 'currency';

    block.innerHTML = `
      <div class="converter-top">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Conversion</strong>
          <button class="block-remove" title="Remove block" aria-label="Remove block">✕</button>
        </div>
      </div>

      <div class="block-controls">
        <div class="control-group">
          <label>Value</label>
          <input type="number" class="valueInput" placeholder="Enter amount" />
        </div>

        <div class="control-group">
          <label>From</label>
          <select class="fromUnit"></select>
        </div>

        <div class="control-group">
          <label>To</label>
          <select class="toUnit"></select>
        </div>
      </div>

      <div class="control-actions">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn convertBtn">Convert</button>
          <button class="btn ghost swapBtn" title="Swap currencies">⇄</button>
          <button class="btn ghost resetBtn">Reset</button>
        </div>
      </div>

      <div class="block-footer">
        <div class="block-result muted">Result: <span class="resultValue">—</span></div>
        <div class="block-meta muted">—</div>
      </div>
    `;

    blocksContainer.appendChild(block);

    const valueInput = block.querySelector('.valueInput');
    const fromUnit = block.querySelector('.fromUnit');
    const toUnit = block.querySelector('.toUnit');
    const convertBtn = block.querySelector('.convertBtn');
    const swapBtn = block.querySelector('.swapBtn');
    const resetBtn = block.querySelector('.resetBtn');
    const resultValueEl = block.querySelector('.resultValue');
    const blockMeta = block.querySelector('.block-meta');
    const removeBtn = block.querySelector('.block-remove');

    function populateCurrencyOptions() {
      const entries = Object.entries(getCurrencyOptions());
      fromUnit.innerHTML = '';
      toUnit.innerHTML = '';

      entries.forEach(([code, meta]) => {
        const fromOpt = document.createElement('option');
        fromOpt.value = code;
        fromOpt.textContent = `${meta.name} (${code})`;
        fromUnit.appendChild(fromOpt);

        const toOpt = document.createElement('option');
        toOpt.value = code;
        toOpt.textContent = `${meta.name} (${code})`;
        toUnit.appendChild(toOpt);
      });

      const defaultFrom = entries.some(([code]) => code === 'USD') ? 'USD' : entries[0]?.[0];
      const defaultTo = entries.some(([code]) => code === 'EUR') ? 'EUR' : entries[1]?.[0] || defaultFrom;
      fromUnit.value = defaultFrom;
      toUnit.value = defaultTo;
    }

    blockMap.set(blockId, { summaryId, summaryEl: null });

    function updateSummary(text, meta, record = {}) {
      addSummaryRecord(blockId, text, meta, record);
    }

    function doConvert(isPreview = false) {
      const from = fromUnit.value;
      const to = toUnit.value;
      const raw = parseFloat(valueInput.value);

      if (isNaN(raw)) {
        resultValueEl.textContent = '—';
        blockMeta.textContent = 'Enter a numeric value';
        updateSummary('—', 'Enter a numeric value');
        return;
      }

      try {
        const out = convertCurrencyValue(from, to, raw);
        const formatted = formatNumber(out);
        const text = `${raw} ${from} → ${formatted} ${to}`;
        resultValueEl.textContent = `${formatted} ${to}`;
        blockMeta.textContent = `${raw} ${from} → ${formatted} ${to}`;
        updateSummary(text, 'Currency', {
          tool: 'currency',
          category: 'Currency',
          from,
          to,
          result: `${formatted} ${to}`,
          timestamp: new Date().toISOString(),
          preview: isPreview
        });
      } catch (error) {
        resultValueEl.textContent = 'Error';
        blockMeta.textContent = error.message;
        updateSummary('Error', error.message);
      }
    }

    convertBtn.addEventListener('click', () => doConvert());
    valueInput.addEventListener('input', () => {
      if (valueInput.value !== '') doConvert(true);
      else updateSummary('—', '—');
    });
    valueInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConvert(); });
    fromUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    toUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    swapBtn.addEventListener('click', () => {
      const a = fromUnit.value;
      const b = toUnit.value;
      fromUnit.value = b;
      toUnit.value = a;
      doConvert();
    });
    resetBtn.addEventListener('click', () => {
      valueInput.value = '';
      resultValueEl.textContent = '—';
      blockMeta.textContent = '—';
      updateSummary('—', '—');
    });
    removeBtn.addEventListener('click', () => {
      blockMap.delete(blockId);
      block.remove();
      syncSummaryOrder();
    });

    populateCurrencyOptions();
    loadCurrencyRates();
    syncSummaryOrder();
    return blockId;
  }

  function createUnitBlock(initialCategory = 'length') {
    const blockId = uid('blk_');
    const summaryId = uid('sum_');

    const block = document.createElement('div');
    block.className = 'converter-block';
    block.dataset.blockId = blockId;

    block.innerHTML = `
      <div class="converter-top">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Conversion</strong>
          <button class="block-remove" title="Remove block" aria-label="Remove block">✕</button>
        </div>
      </div>

      <div class="block-controls">
        <div class="control-group">
          <label>Category</label>
          <select class="categorySelect"></select>
        </div>

        <div class="control-group">
          <label>Value</label>
          <input type="number" class="valueInput" placeholder="Enter value" />
        </div>

        <div class="control-group">
          <label>From</label>
          <select class="fromUnit"></select>
        </div>

        <div class="control-group">
          <label>To</label>
          <select class="toUnit"></select>
        </div>
      </div>

      <div class="control-actions">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn convertBtn">Convert</button>
          <button class="btn ghost swapBtn" title="Swap units">⇄</button>
          <button class="btn ghost resetBtn">Reset</button>
        </div>
      </div>

      <div class="block-footer">
        <div class="block-result muted">Result: <span class="resultValue">—</span></div>
        <div class="block-meta muted">—</div>
      </div>
    `;

    blocksContainer.appendChild(block);

    const categorySelect = block.querySelector('.categorySelect');
    const valueInput = block.querySelector('.valueInput');
    const fromUnit = block.querySelector('.fromUnit');
    const toUnit = block.querySelector('.toUnit');
    const convertBtn = block.querySelector('.convertBtn');
    const swapBtn = block.querySelector('.swapBtn');
    const resetBtn = block.querySelector('.resetBtn');
    const resultValueEl = block.querySelector('.resultValue');
    const blockMeta = block.querySelector('.block-meta');
    const removeBtn = block.querySelector('.block-remove');

    Object.keys(UNITS).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      categorySelect.appendChild(opt);
    });
    categorySelect.value = initialCategory;

    function populateUnitsForCategory(cat) {
      const defs = UNITS[cat].units;
      fromUnit.innerHTML = '';
      toUnit.innerHTML = '';
      Object.keys(defs).forEach(key => {
        const fromOpt = document.createElement('option');
        fromOpt.value = key;
        fromOpt.textContent = `${defs[key].name} (${key})`;
        fromUnit.appendChild(fromOpt);

        const toOpt = document.createElement('option');
        toOpt.value = key;
        toOpt.textContent = `${defs[key].name} (${key})`;
        toUnit.appendChild(toOpt);
      });

      const keys = Object.keys(defs);
      fromUnit.value = keys[0];
      toUnit.value = keys[1] || keys[0];
    }

    blockMap.set(blockId, { summaryId, summaryEl: null });

    function doConvert(isPreview = false) {
      const cat = categorySelect.value;
      const from = fromUnit.value;
      const to = toUnit.value;
      const raw = parseFloat(valueInput.value);
      if (isNaN(raw)) {
        resultValueEl.textContent = '—';
        blockMeta.textContent = 'Enter a numeric value';
        updateSummary('—', 'Enter a numeric value');
        return;
      }
      try {
        const out = convertValue(cat, from, to, raw);
        const formatted = formatNumber(out);
        const text = `${raw} ${from} → ${formatted} ${to}`;
        resultValueEl.textContent = `${formatted} ${to}`;
        blockMeta.textContent = `${raw} ${from} → ${formatted} ${to}`;
        updateSummary(text, cat, {
          tool: 'unit',
          category: cat,
          from,
          to,
          result: `${formatted} ${to}`,
          timestamp: new Date().toISOString(),
          preview: isPreview
        });
      } catch (err) {
        resultValueEl.textContent = 'Error';
        blockMeta.textContent = err.message;
        updateSummary('Error', err.message);
      }
    }

    function updateSummary(text, meta, record = {}) {
      addSummaryRecord(blockId, text, meta, record);
    }

    convertBtn.addEventListener('click', () => doConvert());
    valueInput.addEventListener('input', () => {
      if (valueInput.value !== '') doConvert(true);
      else updateSummary('—', '—');
    });
    valueInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConvert(); });
    fromUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    toUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    swapBtn.addEventListener('click', () => {
      const a = fromUnit.value;
      const b = toUnit.value;
      fromUnit.value = b;
      toUnit.value = a;
      doConvert();
    });
    resetBtn.addEventListener('click', () => {
      valueInput.value = '';
      resultValueEl.textContent = '—';
      blockMeta.textContent = '—';
      updateSummary('—', '—');
    });
    removeBtn.addEventListener('click', () => {
      blockMap.delete(blockId);
      block.remove();
      syncSummaryOrder();
    });

    categorySelect.addEventListener('change', () => {
      populateUnitsForCategory(categorySelect.value);
      if (valueInput.value !== '') doConvert(true);
    });
    populateUnitsForCategory(initialCategory);
    syncSummaryOrder();
    return blockId;
  }

  function createTimezoneBlock() {
    const blockId = uid('blk_');
    const summaryId = uid('sum_');

    const block = document.createElement('div');
    block.className = 'converter-block';
    block.dataset.blockId = blockId;

    block.innerHTML = `
      <div class="converter-top">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Conversion</strong>
          <button class="block-remove" title="Remove block" aria-label="Remove block">✕</button>
        </div>
      </div>

      <div class="block-controls">
        <div class="control-group">
          <label>Time</label>
          <input type="datetime-local" class="valueInput" />
        </div>

        <div class="control-group">
          <label>From</label>
          <select class="fromUnit"></select>
        </div>

        <div class="control-group">
          <label>To</label>
          <select class="toUnit"></select>
        </div>
      </div>

      <div class="control-actions">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn convertBtn">Convert</button>
          <button class="btn ghost swapBtn" title="Swap timezones">⇄</button>
          <button class="btn ghost currentTimeBtn" type="button">Current time</button>
          <button class="btn ghost resetBtn">Reset</button>
        </div>
      </div>

      <div class="block-footer">
        <div class="block-result muted">Result: <span class="resultValue">—</span></div>
        <div class="block-meta muted">—</div>
      </div>
    `;

    blocksContainer.appendChild(block);

    const valueInput = block.querySelector('.valueInput');
    const fromUnit = block.querySelector('.fromUnit');
    const toUnit = block.querySelector('.toUnit');
    const convertBtn = block.querySelector('.convertBtn');
    const swapBtn = block.querySelector('.swapBtn');
    const currentTimeBtn = block.querySelector('.currentTimeBtn');
    const resetBtn = block.querySelector('.resetBtn');
    const resultValueEl = block.querySelector('.resultValue');
    const blockMeta = block.querySelector('.block-meta');
    const removeBtn = block.querySelector('.block-remove');

    function populateTimeZones() {
      fromUnit.innerHTML = '';
      toUnit.innerHTML = '';
      TIMEZONE_OPTIONS.forEach(option => {
        const fromOpt = document.createElement('option');
        fromOpt.value = option.value;
        fromOpt.textContent = option.label;
        fromUnit.appendChild(fromOpt);

        const toOpt = document.createElement('option');
        toOpt.value = option.value;
        toOpt.textContent = option.label;
        toUnit.appendChild(toOpt);
      });

      fromUnit.value = 'UTC';
      toUnit.value = 'Europe/London';
    }

    function setCurrentTimeInSelectedZone() {
      valueInput.value = formatDateTimeLocalForTimeZone(new Date(), fromUnit.value);
    }

    blockMap.set(blockId, { summaryId, summaryEl: null });

    function updateSummary(text, meta, record = {}) {
      addSummaryRecord(blockId, text, meta, record);
    }

    function doConvert(isPreview = false) {
      const from = fromUnit.value;
      const to = toUnit.value;
      const value = valueInput.value;
      if (!value) {
        resultValueEl.textContent = '—';
        blockMeta.textContent = 'Choose a time';
        updateSummary('—', 'Choose a time');
        return;
      }

      try {
        const result = convertTimeZoneValue(from, to, value);
        const text = `${result.source} → ${result.target}`;
        resultValueEl.textContent = result.target;
        blockMeta.textContent = text;
        updateSummary(text, 'Timezone', {
          tool: 'timezone',
          category: 'Timezone',
          from,
          to,
          result: result.target,
          timestamp: new Date().toISOString(),
          preview: isPreview
        });
      } catch (error) {
        resultValueEl.textContent = 'Error';
        blockMeta.textContent = error.message;
        updateSummary('Error', error.message);
      }
    }

    convertBtn.addEventListener('click', () => doConvert());
    valueInput.addEventListener('input', () => {
      if (valueInput.value !== '') doConvert(true);
      else updateSummary('—', '—');
    });
    valueInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doConvert(); });
    fromUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    toUnit.addEventListener('change', () => { if (valueInput.value !== '') doConvert(true); });
    currentTimeBtn.addEventListener('click', () => {
      setCurrentTimeInSelectedZone();
      doConvert();
    });
    fromUnit.addEventListener('change', () => {
      if (!valueInput.value) {
        setCurrentTimeInSelectedZone();
      }
    });
    swapBtn.addEventListener('click', () => {
      const a = fromUnit.value;
      const b = toUnit.value;
      fromUnit.value = b;
      toUnit.value = a;
      doConvert();
    });
    resetBtn.addEventListener('click', () => {
      valueInput.value = '';
      resultValueEl.textContent = '—';
      blockMeta.textContent = '—';
      updateSummary('—', '—');
    });
    removeBtn.addEventListener('click', () => {
      blockMap.delete(blockId);
      block.remove();
      syncSummaryOrder();
    });

    populateTimeZones();
    setCurrentTimeInSelectedZone();
    syncSummaryOrder();
    return blockId;
  }

  function createFileBlock() {
    const blockId = uid('blk_');
    const summaryId = uid('sum_');

    const FILE_CATEGORIES = {
      image: {
        label: 'Image',
        formats: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WEBP' },
          { value: 'gif', label: 'GIF' }
        ]
      },
      video: {
        label: 'Video',
        formats: [
          { value: 'mp4', label: 'MP4' },
          { value: 'webm', label: 'WEBM' },
          { value: 'mov', label: 'MOV' }
        ]
      },
      audio: {
        label: 'Audio',
        formats: [
          { value: 'mp3', label: 'MP3' },
          { value: 'wav', label: 'WAV' },
          { value: 'ogg', label: 'OGG' }
        ]
      },
      text: {
        label: 'Text',
        formats: [
          { value: 'txt', label: 'TXT' },
          { value: 'csv', label: 'CSV' },
          { value: 'json', label: 'JSON' },
          { value: 'html', label: 'HTML' }
        ]
      },
      code: {
        label: 'Code',
        formats: [
          { value: 'js', label: 'JavaScript' },
          { value: 'ts', label: 'TypeScript' },
          { value: 'py', label: 'Python' },
          { value: 'json', label: 'JSON' }
        ]
      },
      document: {
        label: 'Document',
        formats: [
          { value: 'pdf', label: 'PDF' },
          { value: 'docx', label: 'DOCX' },
          { value: 'txt', label: 'TXT' }
        ]
      }
    };

    const block = document.createElement('div');
    block.className = 'converter-block';
    block.dataset.blockId = blockId;

    block.innerHTML = `
      <div class="converter-top">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Conversion</strong>
          <button class="block-remove" title="Remove block" aria-label="Remove block">✕</button>
        </div>
      </div>

      <div class="block-controls">
        <div class="control-group">
          <label>Category</label>
          <select class="categorySelect"></select>
        </div>

        <div class="control-group">
          <label>File</label>
          <input type="file" class="fileInput" />
        </div>

        <div class="control-group">
          <label>To</label>
          <select class="toFormat"></select>
        </div>
      </div>

      <div class="control-actions">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn convertBtn">Convert</button>
          <button class="btn ghost resetBtn">Reset</button>
        </div>
      </div>

      <div class="block-footer">
        <div class="block-result muted">Result: <span class="resultValue">—</span></div>
        <div class="block-meta muted">—</div>
      </div>
    `;

    blocksContainer.appendChild(block);

    const categorySelect = block.querySelector('.categorySelect');
    const fileInput = block.querySelector('.fileInput');
    const toFormat = block.querySelector('.toFormat');
    const convertBtn = block.querySelector('.convertBtn');
    const resetBtn = block.querySelector('.resetBtn');
    const resultValueEl = block.querySelector('.resultValue');
    const blockMeta = block.querySelector('.block-meta');
    const removeBtn = block.querySelector('.block-remove');

    function populateFormats(category) {
      const formats = FILE_CATEGORIES[category]?.formats || [];
      toFormat.innerHTML = '';
      formats.forEach(format => {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label;
        toFormat.appendChild(option);
      });
      if (formats[0]) {
        toFormat.value = formats[0].value;
      }
    }

    Object.entries(FILE_CATEGORIES).forEach(([key, meta]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = meta.label;
      categorySelect.appendChild(option);
    });
    categorySelect.value = 'image';
    populateFormats('image');

    blockMap.set(blockId, { summaryId, summaryEl: null });

    function updateSummary(text, meta, record = {}) {
      addSummaryRecord(blockId, text, meta, record);
    }

    function doConvert() {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        resultValueEl.textContent = '—';
        blockMeta.textContent = 'Choose a file';
        updateSummary('—', 'Choose a file');
        return;
      }

      const target = toFormat.value;
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const outputName = `${originalName}.${target}`;

      file.text().then((textContent) => {
        const mimeType = target === 'json' ? 'application/json' : target === 'csv' ? 'text/csv' : target === 'html' ? 'text/html' : target === 'mp3' || target === 'wav' || target === 'ogg' ? 'audio/mpeg' : target === 'mp4' || target === 'webm' || target === 'mov' ? 'video/mp4' : 'text/plain';
        const blob = new Blob([textContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        resultValueEl.textContent = outputName;
        blockMeta.textContent = `Converted ${file.name} → ${outputName}`;
        updateSummary(`${file.name} → ${outputName}`, FILE_CATEGORIES[categorySelect.value]?.label || 'File', {
          tool: 'file',
          category: FILE_CATEGORIES[categorySelect.value]?.label || 'File',
          from: file.name,
          to: outputName,
          result: outputName,
          timestamp: new Date().toISOString()
        });
      }).catch(() => {
        resultValueEl.textContent = 'Error';
        blockMeta.textContent = 'This file could not be converted in the browser';
        updateSummary('Error', 'File conversion failed');
      });
    }

    categorySelect.addEventListener('change', () => populateFormats(categorySelect.value));
    convertBtn.addEventListener('click', doConvert);
    resetBtn.addEventListener('click', () => {
      fileInput.value = '';
      resultValueEl.textContent = '—';
      blockMeta.textContent = '—';
      updateSummary('—', '—');
    });
    removeBtn.addEventListener('click', () => {
      blockMap.delete(blockId);
      block.remove();
      syncSummaryOrder();
    });

    syncSummaryOrder();
    return blockId;
  }

  function evaluateFormula(expression, variables) {
    const source = expression.replace(/\s+/g, '');
    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_]\w*|[()+\-*/^]/gi) || [];
    if (!source || tokens.join('').toLowerCase() !== source.toLowerCase()) {
      throw new Error('Use numbers, named variables, and arithmetic operators');
    }

    let position = 0;
    function parseExpression() {
      let value = parseTerm();
      while (tokens[position] === '+' || tokens[position] === '-') {
        const operator = tokens[position++];
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }
    function parseTerm() {
      let value = parseUnary();
      while (tokens[position] === '*' || tokens[position] === '/') {
        const operator = tokens[position++];
        const right = parseUnary();
        if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    }
    function parseUnary() {
      if (tokens[position] === '+' || tokens[position] === '-') {
        const operator = tokens[position++];
        const value = parseUnary();
        return operator === '-' ? -value : value;
      }
      return parsePower();
    }
    function parsePower() {
      const value = parsePrimary();
      if (tokens[position] === '^') {
        position += 1;
        return value ** parseUnary();
      }
      return value;
    }
    function parsePrimary() {
      const token = tokens[position++];
      if (!token) throw new Error('Formula is incomplete');
      if (token === '(') {
        const value = parseExpression();
        if (tokens[position++] !== ')') throw new Error('Add a closing parenthesis');
        return value;
      }
      if (token === ')') throw new Error('Unexpected closing parenthesis');
      if (/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token)) return Number(token);
      const value = variables[token.toLowerCase()];
      if (value === undefined) throw new Error(`Unknown variable: ${token}`);
      return value;
    }

    const result = parseExpression();
    if (position !== tokens.length) throw new Error('Check the formula syntax');
    if (!Number.isFinite(result)) throw new Error('The result is outside the supported range');
    return result;
  }

  function createFormulaBlock() {
    const blockId = uid('blk_');
    const summaryId = uid('sum_');
    const block = document.createElement('div');
    block.className = 'converter-block';
    block.dataset.blockId = blockId;
    block.dataset.tool = 'formula';
    block.innerHTML = `
      <div class="converter-top">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Custom formula</strong>
          <button class="block-remove" title="Remove block" aria-label="Remove block">✕</button>
        </div>
      </div>
      <div class="block-controls formula-controls">
        <div class="control-group">
          <label>Formula name</label>
          <input class="formulaName" value="Custom formula" />
        </div>
        <div class="control-group">
          <label>Expression</label>
          <input class="formulaExpression" value="a * b + c" />
        </div>
      </div>
      <div class="formula-variables">
        <label class="formula-variable">Input 1
          <span class="formula-variable-inputs"><input class="variableName" aria-label="Input 1 variable name" value="a" /><input class="variableValue" aria-label="Input 1 value" type="number" placeholder="Value" /></span>
        </label>
        <label class="formula-variable">Input 2
          <span class="formula-variable-inputs"><input class="variableName" aria-label="Input 2 variable name" value="b" /><input class="variableValue" aria-label="Input 2 value" type="number" placeholder="Value" /></span>
        </label>
        <label class="formula-variable">Input 3
          <span class="formula-variable-inputs"><input class="variableName" aria-label="Input 3 variable name" value="c" /><input class="variableValue" aria-label="Input 3 value" type="number" placeholder="Value" /></span>
        </label>
      </div>
      <div class="control-actions">
        <div><button class="btn convertBtn">Calculate</button><button class="btn ghost resetBtn">Reset values</button></div>
      </div>
      <div class="block-footer">
        <div class="block-result muted">Result: <span class="resultValue">—</span></div>
        <div class="block-meta muted">—</div>
      </div>
    `;
    blocksContainer.appendChild(block);

    const nameInput = block.querySelector('.formulaName');
    const expressionInput = block.querySelector('.formulaExpression');
    const variableNames = Array.from(block.querySelectorAll('.variableName'));
    const variableValues = Array.from(block.querySelectorAll('.variableValue'));
    const resultValueEl = block.querySelector('.resultValue');
    const blockMeta = block.querySelector('.block-meta');
    const blockMapEntry = { summaryId, summaryEl: null };
    blockMap.set(blockId, blockMapEntry);

    function updateSummary(text, meta, record = {}) {
      addSummaryRecord(blockId, text, meta, record);
    }

    function doCalculate(isPreview = false) {
      if (variableValues.some(input => input.value === '')) {
        resultValueEl.textContent = '—';
        blockMeta.textContent = 'Enter all three values';
        updateSummary('—', '—');
        return;
      }
      try {
        const variables = {};
        variableNames.forEach((input, index) => {
          const name = input.value.trim().toLowerCase();
          if (!/^[a-z_]\w*$/.test(name) || Object.hasOwn(variables, name)) {
            throw new Error('Use unique variable names');
          }
          variables[name] = Number(variableValues[index].value);
        });
        const result = formatNumber(evaluateFormula(expressionInput.value, variables));
        const formulaName = nameInput.value.trim() || 'Custom formula';
        const formulaText = `${formulaName}: ${expressionInput.value} = ${result}`;
        const inputsText = Object.entries(variables).map(([name, value]) => `${name}=${value}`).join('; ');
        resultValueEl.textContent = result;
        blockMeta.textContent = inputsText;
        updateSummary(formulaText, 'Custom Formula', {
          tool: 'formula',
          category: 'Custom Formula',
          from: inputsText,
          to: expressionInput.value,
          result,
          timestamp: new Date().toISOString(),
          preview: isPreview
        });
      } catch (error) {
        resultValueEl.textContent = 'Error';
        blockMeta.textContent = error.message;
        updateSummary('Error', error.message);
      }
    }

    const liveInputs = [nameInput, expressionInput, ...variableNames, ...variableValues];
    liveInputs.forEach(input => input.addEventListener('input', () => doCalculate(true)));
    liveInputs.forEach(input => input.addEventListener('keydown', event => {
      if (event.key === 'Enter') doCalculate();
    }));
    block.querySelector('.convertBtn').addEventListener('click', () => doCalculate());
    block.querySelector('.resetBtn').addEventListener('click', () => {
      variableValues.forEach(input => { input.value = ''; });
      resultValueEl.textContent = '—';
      blockMeta.textContent = '—';
      updateSummary('—', '—');
    });
    block.querySelector('.block-remove').addEventListener('click', () => {
      blockMap.delete(blockId);
      block.remove();
      syncSummaryOrder();
    });
    return blockId;
  }

  function createConverterBlock(initialCategory = 'length', mode = currentTool) {
    if (mode === 'formula') {
      return createFormulaBlock();
    }
    if (mode === 'currency') {
      return createCurrencyOptionBlock();
    }
    if (mode === 'timezone') {
      return createTimezoneBlock();
    }
    if (mode === 'file') {
      return createFileBlock();
    }
    return createUnitBlock(initialCategory);
  }

  function ensureAtLeastOneBlock(mode = currentTool, category = currentCategory) {
    if (blocksContainer.children.length === 0) createConverterBlock(category, mode);
  }

  addBlockBtn.addEventListener('click', () => {
    createConverterBlock(currentCategory, currentTool);
    document.querySelector('.converter-left-column').scrollTop = document.querySelector('.converter-left-column').scrollHeight;
  });

  function showView(tool, category) {
    const selectedCategory = tool === 'unit' ? category || 'length' : 'length';
    const stateKey = tool === 'unit' ? `unit:${selectedCategory}` : tool;
    const workspaceChanged = stateKey !== currentStateKey;
    if (workspaceChanged && currentStateKey) saveToolState(currentStateKey);
    currentTool = tool;
    currentCategory = selectedCategory;
    currentStateKey = stateKey;
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === tool && (tool !== 'unit' || b.dataset.category === selectedCategory)));

    if (tool === 'unit' || tool === 'currency' || tool === 'timezone' || tool === 'file' || tool === 'formula') {
      landing.style.display = 'none';
      otherView.style.display = 'none';
      converterView.style.display = 'block';
      const labels = {
        length: 'Length & Distance',
        temperature: 'Temperature',
        weight: 'Mass & Weight',
        volume: 'Volume & Cooking',
        area: 'Area',
        speed: 'Speed',
        pressure: 'Pressure',
        energy: 'Energy',
        currency: 'Currency Converter',
        timezone: 'Timezone Converter',
        file: 'File Converter',
        formula: 'Formula Builder'
      };
      document.getElementById('converterTitle').textContent = tool === 'unit' ? labels[selectedCategory] : labels[tool];

      if (workspaceChanged && !restoreToolState(stateKey)) {
        blocksContainer.replaceChildren();
        blockMap.clear();
      }
      ensureAtLeastOneBlock(tool, selectedCategory);
    } else {
      landing.style.display = 'none';
      converterView.style.display = 'none';
      otherView.style.display = 'block';
      document.getElementById('otherTitle').textContent = `${tool.charAt(0).toUpperCase() + tool.slice(1)} Converter`;
      document.getElementById('otherDesc').textContent = `Placeholder for the ${tool} converter. Implement the tool UI here.`;
    }
    document.querySelector('.main').scrollTop = 0;
  }

  navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.tool, btn.dataset.category)));
  openButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.tool, btn.dataset.category)));
  const packButtons = document.querySelectorAll('.pack-btn');
  const toolCards = document.querySelectorAll('.tool-card');
  packButtons.forEach(button => button.addEventListener('click', () => {
    const selectedPack = button.dataset.pack;
    let visibleCount = 0;
    packButtons.forEach(packButton => {
      const isActive = packButton === button;
      packButton.classList.toggle('active', isActive);
      packButton.setAttribute('aria-pressed', String(isActive));
    });
    toolCards.forEach(card => {
      const isVisible = selectedPack === 'all' || card.dataset.packs.split(' ').includes(selectedPack);
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    document.getElementById('toolCount').textContent = String(visibleCount);
  }));
  document.getElementById('exportSummaryBtn').addEventListener('click', () => exportSummaryCsv());
  document.getElementById('exportAllSummaryBtn').addEventListener('click', exportAllSummaryCsv);

  document.getElementById('backToLanding').addEventListener('click', () => {
    if (currentStateKey) saveToolState(currentStateKey);
    currentStateKey = null;
    landing.style.display = 'block';
    converterView.style.display = 'none';
    otherView.style.display = 'none';
    navButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.main').scrollTop = 0;
  });

  homeBtn.addEventListener('click', () => {
    document.getElementById('backToLanding').click();
  });

  landing.style.display = 'block';
  converterView.style.display = 'none';
  otherView.style.display = 'none';
});
