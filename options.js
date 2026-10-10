// Stealth Browsing Assistant - Options Script

document.addEventListener('DOMContentLoaded', async () => {
  let settings = null;
  let selectedIgnoreSites = new Set();
  let selectedLogEntries = new Set();
  let filteredIgnoreList = [];
  let filteredPrivateLog = [];
  let pendingImportData = null;

  const elements = {
    newSiteInput: document.getElementById('new-site-input'),
    addSiteButton: document.getElementById('add-site-button'),
    ignoreList: document.getElementById('ignore-list'),
    privateLog: document.getElementById('private-log'),
    clearAllLogsButton: document.getElementById('clear-all-logs-button'),
    ignoreSearch: document.getElementById('ignore-search'),
    logSearch: document.getElementById('log-search'),
    ignoreCountBadge: document.getElementById('ignore-count-badge'),
    ignoreBatchActions: document.getElementById('ignore-batch-actions'),
    ignoreSelectedCount: document.getElementById('ignore-selected-count'),
    ignoreSelectAll: document.getElementById('ignore-select-all'),
    ignoreDeselectAll: document.getElementById('ignore-deselect-all'),
    ignoreDeleteSelected: document.getElementById('ignore-delete-selected'),
    logBatchActions: document.getElementById('log-batch-actions'),
    logSelectedCount: document.getElementById('log-selected-count'),
    logSelectAll: document.getElementById('log-select-all'),
    logDeselectAll: document.getElementById('log-deselect-all'),
    logDeleteSelected: document.getElementById('log-delete-selected'),
    logSelectAllHeader: document.getElementById('log-select-all-header'),
    ignoreEmpty: document.getElementById('ignore-empty'),
    logEmpty: document.getElementById('log-empty'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    settingsDarkMode: document.getElementById('settings-dark-mode'),
    autoCleanupHistory: document.getElementById('auto-cleanup-history'),
    cleanupInterval: document.getElementById('cleanup-interval'),
    autoCleanupLogs: document.getElementById('auto-cleanup-logs'),
    logRetention: document.getElementById('log-retention'),
    silentBlockEnabled: document.getElementById('silent-block-enabled'),
    blockMode: document.getElementById('block-mode'),
    exportIgnoreList: document.getElementById('export-ignore-list'),
    exportPrivateLog: document.getElementById('export-private-log'),
    exportAllData: document.getElementById('export-all-data'),
    importFile: document.getElementById('import-file'),
    importPreview: document.getElementById('import-preview'),
    previewContent: document.getElementById('preview-content'),
    cancelImport: document.getElementById('cancel-import'),
    confirmImport: document.getElementById('confirm-import'),
    confirmModal: document.getElementById('confirm-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalCancel: document.getElementById('modal-cancel'),
    modalConfirm: document.getElementById('modal-confirm'),
    modalClose: document.querySelector('.modal-close'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    cleanupIntervalRow: document.getElementById('cleanup-interval-row'),
    logRetentionRow: document.getElementById('log-retention-row'),
    blockModeRow: document.getElementById('block-mode-row')
  };

  let modalCallback = null;

  async function init() {
    Utils.applyLocalization();
    await loadSettings();
    await applySavedTheme();
    setupEventListeners();
    setupTabNavigation();
    renderAll();
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response && response.success) {
          settings = response.settings;
          populateSettingsUI();
        }
        resolve();
      });
    });
  }

  async function applySavedTheme() {
    const isDark = await Utils.getSavedTheme();
    Utils.applyTheme(isDark);
    elements.darkModeToggle.checked = isDark;
    elements.settingsDarkMode.checked = isDark;
  }

  function populateSettingsUI() {
    if (!settings) return;

    elements.autoCleanupHistory.checked = settings.autoCleanupHistory;
    elements.cleanupInterval.value = settings.cleanupIntervalMinutes;
    elements.autoCleanupLogs.checked = settings.autoCleanupLogs;
    elements.logRetention.value = settings.logRetentionDays;
    elements.silentBlockEnabled.checked = settings.silentBlockEnabled;
    elements.blockMode.value = settings.blockMode;

    updateConditionalSettings();
  }

  function updateConditionalSettings() {
    elements.cleanupIntervalRow.style.opacity = elements.autoCleanupHistory.checked ? '1' : '0.5';
    elements.cleanupIntervalRow.style.pointerEvents = elements.autoCleanupHistory.checked ? 'auto' : 'none';
    
    elements.logRetentionRow.style.opacity = elements.autoCleanupLogs.checked ? '1' : '0.5';
    elements.logRetentionRow.style.pointerEvents = elements.autoCleanupLogs.checked ? 'auto' : 'none';
    
    elements.blockModeRow.style.opacity = elements.silentBlockEnabled.checked ? '1' : '0.5';
    elements.blockModeRow.style.pointerEvents = elements.silentBlockEnabled.checked ? 'auto' : 'none';
  }

  function setupTabNavigation() {
    elements.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        elements.tabPanels.forEach(panel => panel.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
  }

  function renderAll() {
    renderIgnoreList();
    renderPrivateLog();
  }

  function filterIgnoreList() {
    const searchTerm = elements.ignoreSearch.value.toLowerCase().trim();
    if (!searchTerm) {
      filteredIgnoreList = [...(settings?.ignoreList || [])];
    } else {
      filteredIgnoreList = (settings?.ignoreList || []).filter(site => 
        site.toLowerCase().includes(searchTerm)
      );
    }
    renderIgnoreList();
  }

  function filterPrivateLog() {
    const searchTerm = elements.logSearch.value.toLowerCase().trim();
    if (!searchTerm) {
      filteredPrivateLog = [...(settings?.privateLog || [])];
    } else {
      filteredPrivateLog = (settings?.privateLog || []).filter(entry => 
        entry.title.toLowerCase().includes(searchTerm) ||
        entry.url.toLowerCase().includes(searchTerm)
      );
    }
    renderPrivateLog();
  }

  function renderIgnoreList() {
    const list = filteredIgnoreList;
    elements.ignoreList.innerHTML = '';
    
    elements.ignoreCountBadge.textContent = list.length;
    
    if (list.length === 0) {
      elements.ignoreEmpty.style.display = 'flex';
      elements.ignoreList.style.display = 'none';
      elements.ignoreBatchActions.style.display = 'none';
      return;
    }

    elements.ignoreEmpty.style.display = 'none';
    elements.ignoreList.style.display = 'block';
    
    list.forEach((site, index) => {
      const li = document.createElement('div');
      li.className = 'list-item';
      li.dataset.site = site;
      
      const isSelected = selectedIgnoreSites.has(site);
      
      li.innerHTML = `
        <div class="item-select">
          <input type="checkbox" class="ignore-checkbox" data-site="${site}" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="item-content">
          <span class="site-domain">${site}</span>
        </div>
        <div class="item-actions">
          <button class="remove-btn small-btn" data-site="${site}">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;
      
      elements.ignoreList.appendChild(li);
    });

    updateIgnoreBatchUI();
  }

  function renderPrivateLog() {
    const log = filteredPrivateLog;
    elements.privateLog.innerHTML = '';
    
    if (log.length === 0) {
      elements.logEmpty.style.display = 'flex';
      elements.privateLog.parentElement.style.display = 'none';
      elements.logBatchActions.style.display = 'none';
      return;
    }

    elements.logEmpty.style.display = 'none';
    elements.privateLog.parentElement.style.display = 'block';
    
    log.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'log-table-row';
      row.dataset.id = entry.id;
      
      const isSelected = selectedLogEntries.has(entry.id);
      const date = new Date(entry.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const title = entry.title || '无标题';
      const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
      const domain = Utils.getDomainFromUrl(entry.url) || entry.url;
      
      row.innerHTML = `
        <div class="log-cell log-select">
          <input type="checkbox" class="log-checkbox" data-id="${entry.id}" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="log-cell log-date">${formattedDate}</div>
        <div class="log-cell log-title" title="${title}">${displayTitle}</div>
        <div class="log-cell log-url">
          <a href="${entry.url}" target="_blank" class="log-link" title="${entry.url}">
            <span class="log-domain-text">${domain}</span>
          </a>
        </div>
        <div class="log-cell log-actions">
          <button class="remove-btn small-btn" data-id="${entry.id}">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;
      
      elements.privateLog.appendChild(row);
    });

    updateLogBatchUI();
  }

  function updateIgnoreBatchUI() {
    const selectedCount = selectedIgnoreSites.size;
    
    if (selectedCount > 0) {
      elements.ignoreBatchActions.style.display = 'flex';
      elements.ignoreSelectedCount.textContent = selectedCount;
    } else {
      elements.ignoreBatchActions.style.display = 'none';
    }
  }

  function updateLogBatchUI() {
    const selectedCount = selectedLogEntries.size;
    const totalCount = filteredPrivateLog.length;
    
    elements.logSelectAllHeader.checked = selectedCount === totalCount && totalCount > 0;
    elements.logSelectAllHeader.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    
    if (selectedCount > 0) {
      elements.logBatchActions.style.display = 'flex';
      elements.logSelectedCount.textContent = selectedCount;
    } else {
      elements.logBatchActions.style.display = 'none';
    }
  }

  async function addSiteToIgnoreList() {
    const newSite = elements.newSiteInput.value.trim().toLowerCase();
    
    if (!newSite) {
      Utils.showWarning(Utils.getI18nMessage('errorInvalidDomain'));
      return;
    }

    if (!Utils.isValidDomain(newSite)) {
      Utils.showWarning(Utils.getI18nMessage('errorInvalidDomain'));
      return;
    }

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'addToIgnoreList',
        domain: newSite
      }, resolve);
    });

    if (response && response.success) {
      settings.ignoreList = response.ignoreList;
      elements.newSiteInput.value = '';
      filterIgnoreList();
      Utils.showSuccess(Utils.getI18nMessage('successAdded'));
    } else if (response && response.error === 'already_exists') {
      Utils.showWarning(Utils.getI18nMessage('errorAlreadyExists'));
    }
  }

  async function removeFromIgnoreList(site) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'removeFromIgnoreList',
        domain: site
      }, resolve);
    });

    if (response && response.success) {
      settings.ignoreList = response.ignoreList;
      selectedIgnoreSites.delete(site);
      filterIgnoreList();
      Utils.showSuccess(Utils.getI18nMessage('successRemoved'));
    }
  }

  async function deleteSelectedIgnoreSites() {
    if (selectedIgnoreSites.size === 0) return;

    const sitesToDelete = Array.from(selectedIgnoreSites);
    
    for (const site of sitesToDelete) {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'removeFromIgnoreList',
          domain: site
        }, resolve);
      });
    }

    await loadSettings();
    selectedIgnoreSites.clear();
    filterIgnoreList();
    Utils.showSuccess(Utils.getI18nMessage('successRemoved'));
  }

  async function removeLogEntry(entryId) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'removeLogEntry',
        entryId: entryId
      }, resolve);
    });

    if (response && response.success) {
      settings.privateLog = response.privateLog;
      selectedLogEntries.delete(entryId);
      filterPrivateLog();
      Utils.showSuccess(Utils.getI18nMessage('successRemoved'));
    }
  }

  async function deleteSelectedLogEntries() {
    if (selectedLogEntries.size === 0) return;

    const entryIds = Array.from(selectedLogEntries);
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'removeSelectedLogEntries',
        entryIds: entryIds
      }, resolve);
    });

    if (response && response.success) {
      settings.privateLog = response.privateLog;
      selectedLogEntries.clear();
      filterPrivateLog();
      Utils.showSuccess(Utils.getI18nMessage('successRemoved'));
    }
  }

  async function clearAllLogs() {
    showModal(
      Utils.getI18nMessage('clearAllPrivateLogsButton'),
      Utils.getI18nMessage('confirmClearLogs'),
      async () => {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'clearPrivateLog' }, resolve);
        });

        if (response && response.success) {
          settings.privateLog = [];
          selectedLogEntries.clear();
          filterPrivateLog();
          Utils.showSuccess(Utils.getI18nMessage('successLogsCleared'));
        }
      }
    );
  }

  function showModal(title, message, callback) {
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.confirmModal.style.display = 'flex';
    modalCallback = callback;
  }

  function hideModal() {
    elements.confirmModal.style.display = 'none';
    modalCallback = null;
  }

  function exportIgnoreList() {
    const data = {
      version: '2.0',
      type: 'ignoreList',
      exportDate: new Date().toISOString(),
      ignoreList: settings?.ignoreList || []
    };
    Utils.exportData(data, Utils.createExportFileName('ignore-list'));
    Utils.showSuccess(Utils.getI18nMessage('successExported'));
  }

  function exportPrivateLog() {
    const data = {
      version: '2.0',
      type: 'privateLog',
      exportDate: new Date().toISOString(),
      privateLog: settings?.privateLog || []
    };
    Utils.exportData(data, Utils.createExportFileName('private-log'));
    Utils.showSuccess(Utils.getI18nMessage('successExported'));
  }

  function exportAllData() {
    const data = {
      version: '2.0',
      type: 'allData',
      exportDate: new Date().toISOString(),
      ignoreList: settings?.ignoreList || [],
      privateLog: settings?.privateLog || [],
      settings: {
        autoCleanupHistory: settings?.autoCleanupHistory,
        cleanupIntervalMinutes: settings?.cleanupIntervalMinutes,
        autoCleanupLogs: settings?.autoCleanupLogs,
        logRetentionDays: settings?.logRetentionDays,
        silentBlockEnabled: settings?.silentBlockEnabled,
        blockMode: settings?.blockMode,
        darkMode: settings?.darkMode
      }
    };
    Utils.exportData(data, Utils.createExportFileName('backup'));
    Utils.showSuccess(Utils.getI18nMessage('successExported'));
  }

  async function handleImportFile(file) {
    try {
      const data = await Utils.importData(file);
      pendingImportData = data;
      
      let previewHtml = '<div class="preview-items">';
      
      if (data.ignoreList && data.ignoreList.length > 0) {
        previewHtml += `
          <div class="preview-item">
            <span class="preview-icon">🚫</span>
            <span class="preview-label">Ignore List:</span>
            <span class="preview-value">${data.ignoreList.length} sites</span>
          </div>
        `;
      }
      
      if (data.privateLog && data.privateLog.length > 0) {
        previewHtml += `
          <div class="preview-item">
            <span class="preview-icon">📋</span>
            <span class="preview-label">Private Log:</span>
            <span class="preview-value">${data.privateLog.length} entries</span>
          </div>
        `;
      }
      
      if (data.settings) {
        previewHtml += `
          <div class="preview-item">
            <span class="preview-icon">⚙️</span>
            <span class="preview-label">Settings:</span>
            <span class="preview-value">Included</span>
          </div>
        `;
      }
      
      previewHtml += '</div>';
      
      elements.previewContent.innerHTML = previewHtml;
      elements.importPreview.style.display = 'block';
      
    } catch (error) {
      Utils.showError(Utils.getI18nMessage('errorImportFailed'));
    }
  }

  async function confirmImport() {
    if (!pendingImportData) return;

    const currentIgnoreList = [...(settings?.ignoreList || [])];
    const currentPrivateLog = [...(settings?.privateLog || [])];

    if (pendingImportData.ignoreList) {
      pendingImportData.ignoreList.forEach(site => {
        if (!currentIgnoreList.includes(site)) {
          currentIgnoreList.push(site);
        }
      });
    }

    if (pendingImportData.privateLog) {
      const existingIds = new Set(currentPrivateLog.map(e => e.id));
      pendingImportData.privateLog.forEach(entry => {
        if (!existingIds.has(entry.id)) {
          currentPrivateLog.push(entry);
        }
      });
      currentPrivateLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    const newSettings = {
      ignoreList: currentIgnoreList,
      privateLog: currentPrivateLog
    };

    if (pendingImportData.settings) {
      Object.assign(newSettings, pendingImportData.settings);
    }

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      }, resolve);
    });

    await loadSettings();
    renderAll();
    
    elements.importPreview.style.display = 'none';
    pendingImportData = null;
    elements.importFile.value = '';
    
    Utils.showSuccess(Utils.getI18nMessage('successImported'));
  }

  async function updateSetting(key, value) {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { [key]: value }
      }, resolve);
    });

    if (response && response.success) {
      settings[key] = value;
    }
  }

  function setupEventListeners() {
    elements.addSiteButton.addEventListener('click', addSiteToIgnoreList);
    
    elements.newSiteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addSiteToIgnoreList();
    });

    elements.ignoreList.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.ignore-checkbox');
      const removeBtn = e.target.closest('.remove-btn');
      
      if (checkbox) {
        const site = checkbox.dataset.site;
        if (checkbox.checked) {
          selectedIgnoreSites.add(site);
        } else {
          selectedIgnoreSites.delete(site);
        }
        updateIgnoreBatchUI();
      }
      
      if (removeBtn) {
        const site = removeBtn.dataset.site;
        removeFromIgnoreList(site);
      }
    });

    elements.privateLog.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.log-checkbox');
      const removeBtn = e.target.closest('.remove-btn');
      
      if (checkbox) {
        const id = checkbox.dataset.id;
        if (checkbox.checked) {
          selectedLogEntries.add(id);
        } else {
          selectedLogEntries.delete(id);
        }
        updateLogBatchUI();
      }
      
      if (removeBtn) {
        const id = removeBtn.dataset.id;
        removeLogEntry(id);
      }
    });

    elements.ignoreSearch.addEventListener('input', Utils.debounce(filterIgnoreList, 300));
    elements.logSearch.addEventListener('input', Utils.debounce(filterPrivateLog, 300));

    elements.ignoreSelectAll.addEventListener('click', () => {
      filteredIgnoreList.forEach(site => selectedIgnoreSites.add(site));
      renderIgnoreList();
    });

    elements.ignoreDeselectAll.addEventListener('click', () => {
      selectedIgnoreSites.clear();
      renderIgnoreList();
    });

    elements.ignoreDeleteSelected.addEventListener('click', () => {
      if (selectedIgnoreSites.size === 0) return;
      showModal(
        Utils.getI18nMessage('deleteSelected'),
        Utils.getI18nMessage('confirmDeleteSelected'),
        deleteSelectedIgnoreSites
      );
    });

    elements.logSelectAll.addEventListener('click', () => {
      filteredPrivateLog.forEach(entry => selectedLogEntries.add(entry.id));
      renderPrivateLog();
    });

    elements.logDeselectAll.addEventListener('click', () => {
      selectedLogEntries.clear();
      renderPrivateLog();
    });

    elements.logDeleteSelected.addEventListener('click', () => {
      if (selectedLogEntries.size === 0) return;
      showModal(
        Utils.getI18nMessage('deleteSelected'),
        Utils.getI18nMessage('confirmDeleteSelected'),
        deleteSelectedLogEntries
      );
    });

    elements.logSelectAllHeader.addEventListener('change', () => {
      if (elements.logSelectAllHeader.checked) {
        filteredPrivateLog.forEach(entry => selectedLogEntries.add(entry.id));
      } else {
        selectedLogEntries.clear();
      }
      renderPrivateLog();
    });

    elements.clearAllLogsButton.addEventListener('click', clearAllLogs);

    const darkModeToggles = [elements.darkModeToggle, elements.settingsDarkMode];
    darkModeToggles.forEach(toggle => {
      toggle.addEventListener('change', async () => {
        const isDark = toggle.checked;
        Utils.applyTheme(isDark);
        await chrome.storage.local.set({ darkMode: isDark });
        darkModeToggles.forEach(t => t.checked = isDark);
      });
    });

    elements.autoCleanupHistory.addEventListener('change', async () => {
      await updateSetting('autoCleanupHistory', elements.autoCleanupHistory.checked);
      updateConditionalSettings();
    });

    elements.cleanupInterval.addEventListener('change', async () => {
      await updateSetting('cleanupIntervalMinutes', parseInt(elements.cleanupInterval.value));
    });

    elements.autoCleanupLogs.addEventListener('change', async () => {
      await updateSetting('autoCleanupLogs', elements.autoCleanupLogs.checked);
      updateConditionalSettings();
    });

    elements.logRetention.addEventListener('change', async () => {
      await updateSetting('logRetentionDays', parseInt(elements.logRetention.value));
    });

    elements.silentBlockEnabled.addEventListener('change', async () => {
      await updateSetting('silentBlockEnabled', elements.silentBlockEnabled.checked);
      updateConditionalSettings();
    });

    elements.blockMode.addEventListener('change', async () => {
      await updateSetting('blockMode', elements.blockMode.value);
    });

    elements.exportIgnoreList.addEventListener('click', exportIgnoreList);
    elements.exportPrivateLog.addEventListener('click', exportPrivateLog);
    elements.exportAllData.addEventListener('click', exportAllData);

    elements.importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImportFile(file);
      }
    });

    elements.cancelImport.addEventListener('click', () => {
      elements.importPreview.style.display = 'none';
      pendingImportData = null;
      elements.importFile.value = '';
    });

    elements.confirmImport.addEventListener('click', confirmImport);

    elements.modalCancel.addEventListener('click', hideModal);
    elements.modalClose.addEventListener('click', hideModal);
    elements.confirmModal.querySelector('.modal-overlay').addEventListener('click', hideModal);

    elements.modalConfirm.addEventListener('click', () => {
      if (modalCallback) {
        modalCallback();
      }
      hideModal();
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.ignoreList) {
        settings.ignoreList = changes.ignoreList.newValue || [];
        filterIgnoreList();
      }
      if (changes.privateLog) {
        settings.privateLog = changes.privateLog.newValue || [];
        filterPrivateLog();
      }
    }
  });

  await init();
}); 
