// Stealth Browsing Assistant - Options Script
// 简化版，确保稳定性和兼容性

document.addEventListener('DOMContentLoaded', function() {
  console.log('Options script loaded');

  var settings = {
    ignoreList: [],
    privateLog: [],
    darkMode: false,
    autoCleanupHistory: true,
    cleanupIntervalMinutes: 30,
    autoCleanupLogs: false,
    logRetentionDays: 30,
    silentBlockEnabled: false,
    blockMode: 'cancel'
  };

  var selectedIgnoreEntries = [];
  var selectedLogEntries = [];
  var importDataToProcess = null;

  var elements = {
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    settingsDarkMode: document.getElementById('settings-dark-mode'),
    autoCleanupHistory: document.getElementById('auto-cleanup-history'),
    cleanupInterval: document.getElementById('cleanup-interval'),
    cleanupIntervalRow: document.getElementById('cleanup-interval-row'),
    autoCleanupLogs: document.getElementById('auto-cleanup-logs'),
    logRetention: document.getElementById('log-retention'),
    logRetentionRow: document.getElementById('log-retention-row'),
    silentBlockEnabled: document.getElementById('silent-block-enabled'),
    blockMode: document.getElementById('block-mode'),
    blockModeRow: document.getElementById('block-mode-row'),
    newSiteInput: document.getElementById('new-site-input'),
    addSiteButton: document.getElementById('add-site-button'),
    ignoreSearch: document.getElementById('ignore-search'),
    ignoreList: document.getElementById('ignore-list'),
    ignoreEmpty: document.getElementById('ignore-empty'),
    ignoreCountBadge: document.getElementById('ignore-count-badge'),
    ignoreBatchActions: document.getElementById('ignore-batch-actions'),
    ignoreSelectedCount: document.getElementById('ignore-selected-count'),
    ignoreSelectAll: document.getElementById('ignore-select-all'),
    ignoreDeselectAll: document.getElementById('ignore-deselect-all'),
    ignoreDeleteSelected: document.getElementById('ignore-delete-selected'),
    logSearch: document.getElementById('log-search'),
    privateLog: document.getElementById('private-log'),
    logEmpty: document.getElementById('log-empty'),
    logBatchActions: document.getElementById('log-batch-actions'),
    logSelectedCount: document.getElementById('log-selected-count'),
    logSelectAll: document.getElementById('log-select-all'),
    logSelectAllHeader: document.getElementById('log-select-all-header'),
    logDeselectAll: document.getElementById('log-deselect-all'),
    logDeleteSelected: document.getElementById('log-delete-selected'),
    clearAllLogsButton: document.getElementById('clear-all-logs-button'),
    exportIgnoreList: document.getElementById('export-ignore-list'),
    exportPrivateLog: document.getElementById('export-private-log'),
    exportAllData: document.getElementById('export-all-data'),
    importFile: document.getElementById('import-file'),
    importPreview: document.getElementById('import-preview'),
    previewContent: document.getElementById('preview-content'),
    confirmImport: document.getElementById('confirm-import'),
    cancelImport: document.getElementById('cancel-import'),
    modal: document.getElementById('confirm-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalCancel: document.getElementById('modal-cancel'),
    modalConfirm: document.getElementById('modal-confirm'),
    modalClose: document.querySelector('.modal-close')
  };

  var modalCallback = null;
  var tabButtons = document.querySelectorAll('.tab-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');

  function init() {
    console.log('Initializing options page...');
    
    applyLocalization();
    
    loadSettings(function() {
      renderIgnoreList();
      renderPrivateLog();
      setupEventListeners();
      setupTabs();
      console.log('Options page initialization complete');
    });
  }

  function applyLocalization() {
    console.log('Applying localization...');
    
    var i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var message = chrome.i18n.getMessage(key);
      if (message) {
        el.textContent = message;
      } else {
        console.warn('No i18n message found for key:', key);
      }
    });

    var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var message = chrome.i18n.getMessage(key);
      if (message) {
        el.placeholder = message;
      }
    });

    var valueElements = document.querySelectorAll('[data-i18n-value]');
    valueElements.forEach(function(el) {
      var key = el.getAttribute('data-i18n-value');
      var message = chrome.i18n.getMessage(key);
      if (message) {
        el.textContent = message;
      }
    });

    console.log('Localization applied');
  }

  function loadSettings(callback) {
    chrome.storage.local.get({ 
      ignoreList: [], 
      privateLog: [],
      darkMode: false,
      autoCleanupHistory: true,
      cleanupIntervalMinutes: 30,
      autoCleanupLogs: false,
      logRetentionDays: 30,
      silentBlockEnabled: false,
      blockMode: 'cancel'
    }, function(result) {
      settings.ignoreList = result.ignoreList || [];
      settings.privateLog = result.privateLog || [];
      settings.darkMode = result.darkMode;
      settings.autoCleanupHistory = result.autoCleanupHistory;
      settings.cleanupIntervalMinutes = result.cleanupIntervalMinutes || 30;
      settings.autoCleanupLogs = result.autoCleanupLogs;
      settings.logRetentionDays = result.logRetentionDays || 30;
      settings.silentBlockEnabled = result.silentBlockEnabled;
      settings.blockMode = result.blockMode || 'cancel';
      
      updateSettingsUI();
      
      console.log('Settings loaded - ignoreList:', settings.ignoreList.length);
      console.log('Settings loaded - privateLog:', settings.privateLog.length);
      
      if (callback) callback();
    });
  }

  function updateSettingsUI() {
    applyTheme(settings.darkMode);
    elements.darkModeToggle.checked = settings.darkMode;
    elements.settingsDarkMode.checked = settings.darkMode;

    elements.autoCleanupHistory.checked = settings.autoCleanupHistory;
    elements.cleanupInterval.value = settings.cleanupIntervalMinutes;
    elements.cleanupIntervalRow.style.display = settings.autoCleanupHistory ? 'flex' : 'none';

    elements.autoCleanupLogs.checked = settings.autoCleanupLogs;
    elements.logRetention.value = settings.logRetentionDays;
    elements.logRetentionRow.style.display = settings.autoCleanupLogs ? 'flex' : 'none';

    elements.silentBlockEnabled.checked = settings.silentBlockEnabled;
    elements.blockMode.value = settings.blockMode;
    elements.blockModeRow.style.display = settings.silentBlockEnabled ? 'flex' : 'none';
  }

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-theme');
    }
  }

  function setupTabs() {
    tabButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetTab = btn.getAttribute('data-tab');
        
        tabButtons.forEach(function(b) { b.classList.remove('active'); });
        tabPanels.forEach(function(p) { p.classList.remove('active'); });
        
        btn.classList.add('active');
        document.getElementById(targetTab + '-tab').classList.add('active');
      });
    });
  }

  function getDomainFromUrl(url) {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch (e) {
      return null;
    }
  }

  function getMainDomain(domain) {
    if (!domain) return null;
    var parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2] + '.' + parts[parts.length - 1];
    }
    return domain;
  }

  function isValidDomain(domain) {
    if (!domain) return false;
    var pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return pattern.test(domain);
  }

  function showToast(message, type) {
    var toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.innerHTML = '<span class="toast-message">' + message + '</span><button class="toast-close">&times;</button>';
    
    toastContainer.appendChild(toast);
    
    setTimeout(function() {
      toast.classList.add('toast-show');
    }, 10);

    var closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', function() {
      hideToast(toast);
    });

    setTimeout(function() {
      hideToast(toast);
    }, 3000);
  }

  function hideToast(toast) {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  function showModal(title, message, confirmText, cancelText, callback) {
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.modalConfirm.textContent = confirmText || 'Confirm';
    elements.modalCancel.textContent = cancelText || 'Cancel';
    modalCallback = callback;
    elements.modal.style.display = 'flex';
  }

  function hideModal() {
    elements.modal.style.display = 'none';
    modalCallback = null;
  }

  function addSiteToIgnoreList() {
    var input = elements.newSiteInput.value.trim();
    if (!input) {
      showToast(chrome.i18n.getMessage('errorInvalidDomain') || 'Please enter a valid domain.', 'error');
      return;
    }

    var domain = input;
    if (input.startsWith('http://') || input.startsWith('https://')) {
      domain = getDomainFromUrl(input);
    }
    
    if (!domain || !isValidDomain(domain)) {
      showToast(chrome.i18n.getMessage('errorInvalidDomain') || 'Please enter a valid domain.', 'error');
      return;
    }

    var mainDomain = getMainDomain(domain);
    if (settings.ignoreList.includes(mainDomain)) {
      showToast(chrome.i18n.getMessage('errorAlreadyExists') || 'This site is already in the ignore list.', 'warning');
      return;
    }

    var newList = settings.ignoreList.concat([mainDomain]);
    chrome.storage.local.set({ ignoreList: newList }, function() {
      settings.ignoreList = newList;
      elements.newSiteInput.value = '';
      renderIgnoreList();
      showToast(chrome.i18n.getMessage('successAdded') || 'Site added to ignore list successfully.', 'success');
    });
  }

  function renderIgnoreList() {
    var searchTerm = elements.ignoreSearch.value.toLowerCase();
    var filteredList = settings.ignoreList.filter(function(site) {
      return site.toLowerCase().includes(searchTerm);
    });

    elements.ignoreList.innerHTML = '';
    elements.ignoreCountBadge.textContent = filteredList.length;

    if (filteredList.length === 0) {
      elements.ignoreEmpty.style.display = 'flex';
      elements.ignoreBatchActions.style.display = 'none';
      return;
    }

    elements.ignoreEmpty.style.display = 'none';

    filteredList.forEach(function(site, index) {
      var item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="item-select">
          <input type="checkbox" class="ignore-checkbox" data-site="${site}" ${selectedIgnoreEntries.includes(site) ? 'checked' : ''}>
        </div>
        <div class="item-content">
          <div class="item-title">${site}</div>
        </div>
        <div class="item-actions">
          <button class="remove-btn danger-btn" data-site="${site}">${chrome.i18n.getMessage('removeButton') || 'Remove'}</button>
        </div>
      `;
      elements.ignoreList.appendChild(item);
    });

    updateIgnoreBatchActions();
  }

  function updateIgnoreBatchActions() {
    var checkboxes = document.querySelectorAll('.ignore-checkbox:checked');
    selectedIgnoreEntries = Array.from(checkboxes).map(function(cb) {
      return cb.getAttribute('data-site');
    });

    elements.ignoreSelectedCount.textContent = selectedIgnoreEntries.length;
    elements.ignoreBatchActions.style.display = selectedIgnoreEntries.length > 0 ? 'flex' : 'none';
  }

  function removeFromIgnoreList(site) {
    var newList = settings.ignoreList.filter(function(s) {
      return s !== site;
    });
    
    chrome.storage.local.set({ ignoreList: newList }, function() {
      settings.ignoreList = newList;
      renderIgnoreList();
      showToast(chrome.i18n.getMessage('successRemoved') || 'Site removed from ignore list successfully.', 'success');
    });
  }

  function renderPrivateLog() {
    var searchTerm = elements.logSearch.value.toLowerCase();
    var filteredLog = settings.privateLog.filter(function(entry) {
      return (entry.title && entry.title.toLowerCase().includes(searchTerm)) ||
             (entry.url && entry.url.toLowerCase().includes(searchTerm));
    });

    elements.privateLog.innerHTML = '';

    if (filteredLog.length === 0) {
      elements.logEmpty.style.display = 'flex';
      elements.logBatchActions.style.display = 'none';
      return;
    }

    elements.logEmpty.style.display = 'none';

    filteredLog.forEach(function(entry) {
      var date = new Date(entry.timestamp);
      var dateStr = date.toLocaleString();
      var row = document.createElement('div');
      row.className = 'log-table-row';
      row.innerHTML = `
        <div class="log-cell log-select">
          <input type="checkbox" class="log-checkbox" data-id="${entry.id || entry.timestamp}" ${selectedLogEntries.includes(entry.id || entry.timestamp) ? 'checked' : ''}>
        </div>
        <div class="log-cell log-date">${dateStr}</div>
        <div class="log-cell log-title" title="${entry.title || ''}">${entry.title || 'No title'}</div>
        <div class="log-cell log-url" title="${entry.url || ''}">${entry.url || ''}</div>
        <div class="log-cell log-actions">
          <button class="remove-btn danger-btn" data-id="${entry.id || entry.timestamp}">${chrome.i18n.getMessage('removeButton') || 'Remove'}</button>
        </div>
      `;
      elements.privateLog.appendChild(row);
    });

    updateLogBatchActions();
  }

  function updateLogBatchActions() {
    var checkboxes = document.querySelectorAll('.log-checkbox:checked');
    selectedLogEntries = Array.from(checkboxes).map(function(cb) {
      return cb.getAttribute('data-id');
    });

    elements.logSelectedCount.textContent = selectedLogEntries.length;
    elements.logBatchActions.style.display = selectedLogEntries.length > 0 ? 'flex' : 'none';
  }

  function removeLogEntry(id) {
    var newLog = settings.privateLog.filter(function(entry) {
      var entryId = entry.id || entry.timestamp;
      return entryId != id;
    });

    chrome.storage.local.set({ privateLog: newLog }, function() {
      settings.privateLog = newLog;
      renderPrivateLog();
      showToast(chrome.i18n.getMessage('successRemoved') || 'Entry removed successfully.', 'success');
    });
  }

  function clearAllLogs() {
    showModal(
      'Clear All Logs',
      chrome.i18n.getMessage('confirmClearLogs') || 'Are you sure you want to clear all private logs?',
      'Clear All',
      'Cancel',
      function() {
        chrome.storage.local.set({ privateLog: [] }, function() {
          settings.privateLog = [];
          renderPrivateLog();
          showToast(chrome.i18n.getMessage('successLogsCleared') || 'All private logs cleared successfully.', 'success');
        });
      }
    );
  }

  function exportData(data, filename) {
    var dataStr = JSON.stringify(data, null, 2);
    var blob = new Blob([dataStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(chrome.i18n.getMessage('successExported') || 'Data exported successfully.', 'success');
  }

  function handleFileImport(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        importDataToProcess = JSON.parse(e.target.result);
        showImportPreview(importDataToProcess);
      } catch (error) {
        showToast(chrome.i18n.getMessage('errorImportFailed') || 'Failed to import data. Please check the file format.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function showImportPreview(data) {
    var ignoreCount = (data.ignoreList || data.ignoredSites || []).length;
    var logCount = (data.privateLog || data.browsingLog || []).length;
    
    elements.previewContent.innerHTML = `
      <div class="preview-item">
        <strong>Ignore List:</strong> ${ignoreCount} entries
      </div>
      <div class="preview-item">
        <strong>Private Log:</strong> ${logCount} entries
      </div>
    `;
    elements.importPreview.style.display = 'block';
  }

  function confirmDataImport() {
    if (!importDataToProcess) return;

    var newIgnoreList = settings.ignoreList.slice();
    var newPrivateLog = settings.privateLog.slice();

    var importIgnoreList = importDataToProcess.ignoreList || importDataToProcess.ignoredSites || [];
    var importPrivateLog = importDataToProcess.privateLog || importDataToProcess.browsingLog || [];

    importIgnoreList.forEach(function(site) {
      if (!newIgnoreList.includes(site)) {
        newIgnoreList.push(site);
      }
    });

    importPrivateLog.forEach(function(entry) {
      if (!entry.id) {
        entry.id = Date.now() + Math.random();
      }
      newPrivateLog.push(entry);
    });

    chrome.storage.local.set({
      ignoreList: newIgnoreList,
      privateLog: newPrivateLog
    }, function() {
      settings.ignoreList = newIgnoreList;
      settings.privateLog = newPrivateLog;
      
      renderIgnoreList();
      renderPrivateLog();
      
      elements.importPreview.style.display = 'none';
      importDataToProcess = null;
      
      showToast(chrome.i18n.getMessage('successImported') || 'Data imported successfully.', 'success');
    });
  }

  function setupEventListeners() {
    console.log('Setting up event listeners...');

    elements.darkModeToggle.addEventListener('change', function() {
      var isDark = elements.darkModeToggle.checked;
      applyTheme(isDark);
      elements.settingsDarkMode.checked = isDark;
      chrome.storage.local.set({ darkMode: isDark });
    });

    elements.settingsDarkMode.addEventListener('change', function() {
      var isDark = elements.settingsDarkMode.checked;
      applyTheme(isDark);
      elements.darkModeToggle.checked = isDark;
      chrome.storage.local.set({ darkMode: isDark });
    });

    elements.autoCleanupHistory.addEventListener('change', function() {
      settings.autoCleanupHistory = elements.autoCleanupHistory.checked;
      elements.cleanupIntervalRow.style.display = settings.autoCleanupHistory ? 'flex' : 'none';
      chrome.storage.local.set({ autoCleanupHistory: settings.autoCleanupHistory });
    });

    elements.cleanupInterval.addEventListener('change', function() {
      settings.cleanupIntervalMinutes = parseInt(elements.cleanupInterval.value);
      chrome.storage.local.set({ cleanupIntervalMinutes: settings.cleanupIntervalMinutes });
    });

    elements.autoCleanupLogs.addEventListener('change', function() {
      settings.autoCleanupLogs = elements.autoCleanupLogs.checked;
      elements.logRetentionRow.style.display = settings.autoCleanupLogs ? 'flex' : 'none';
      chrome.storage.local.set({ autoCleanupLogs: settings.autoCleanupLogs });
    });

    elements.logRetention.addEventListener('change', function() {
      settings.logRetentionDays = parseInt(elements.logRetention.value);
      chrome.storage.local.set({ logRetentionDays: settings.logRetentionDays });
    });

    elements.silentBlockEnabled.addEventListener('change', function() {
      settings.silentBlockEnabled = elements.silentBlockEnabled.checked;
      elements.blockModeRow.style.display = settings.silentBlockEnabled ? 'flex' : 'none';
      chrome.storage.local.set({ silentBlockEnabled: settings.silentBlockEnabled });
    });

    elements.blockMode.addEventListener('change', function() {
      settings.blockMode = elements.blockMode.value;
      chrome.storage.local.set({ blockMode: settings.blockMode });
    });

    elements.addSiteButton.addEventListener('click', addSiteToIgnoreList);
    elements.newSiteInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') addSiteToIgnoreList();
    });

    elements.ignoreSearch.addEventListener('input', function() {
      renderIgnoreList();
    });

    elements.logSearch.addEventListener('input', function() {
      renderPrivateLog();
    });

    elements.ignoreList.addEventListener('change', function(e) {
      if (e.target.classList.contains('ignore-checkbox')) {
        updateIgnoreBatchActions();
      }
    });

    elements.ignoreList.addEventListener('click', function(e) {
      if (e.target.classList.contains('remove-btn')) {
        var site = e.target.getAttribute('data-site');
        removeFromIgnoreList(site);
      }
    });

    elements.privateLog.addEventListener('change', function(e) {
      if (e.target.classList.contains('log-checkbox')) {
        updateLogBatchActions();
      }
    });

    elements.privateLog.addEventListener('click', function(e) {
      if (e.target.classList.contains('remove-btn')) {
        var id = e.target.getAttribute('data-id');
        removeLogEntry(id);
      }
    });

    elements.clearAllLogsButton.addEventListener('click', clearAllLogs);

    elements.ignoreSelectAll.addEventListener('click', function() {
      var checkboxes = document.querySelectorAll('.ignore-checkbox');
      checkboxes.forEach(function(cb) { cb.checked = true; });
      updateIgnoreBatchActions();
    });

    elements.ignoreDeselectAll.addEventListener('click', function() {
      var checkboxes = document.querySelectorAll('.ignore-checkbox');
      checkboxes.forEach(function(cb) { cb.checked = false; });
      updateIgnoreBatchActions();
    });

    elements.ignoreDeleteSelected.addEventListener('click', function() {
      if (selectedIgnoreEntries.length === 0) return;
      
      showModal(
        'Delete Selected',
        chrome.i18n.getMessage('confirmDeleteSelected') || 'Are you sure you want to delete the selected items?',
        'Delete',
        'Cancel',
        function() {
          var newList = settings.ignoreList.filter(function(site) {
            return !selectedIgnoreEntries.includes(site);
          });
          
          chrome.storage.local.set({ ignoreList: newList }, function() {
            settings.ignoreList = newList;
            selectedIgnoreEntries = [];
            renderIgnoreList();
            showToast(chrome.i18n.getMessage('successRemoved') || 'Items removed successfully.', 'success');
          });
        }
      );
    });

    elements.logSelectAll.addEventListener('click', function() {
      var checkboxes = document.querySelectorAll('.log-checkbox');
      checkboxes.forEach(function(cb) { cb.checked = true; });
      elements.logSelectAllHeader.checked = true;
      updateLogBatchActions();
    });

    elements.logSelectAllHeader.addEventListener('change', function() {
      var isChecked = elements.logSelectAllHeader.checked;
      var checkboxes = document.querySelectorAll('.log-checkbox');
      checkboxes.forEach(function(cb) { cb.checked = isChecked; });
      updateLogBatchActions();
    });

    elements.logDeselectAll.addEventListener('click', function() {
      var checkboxes = document.querySelectorAll('.log-checkbox');
      checkboxes.forEach(function(cb) { cb.checked = false; });
      elements.logSelectAllHeader.checked = false;
      updateLogBatchActions();
    });

    elements.logDeleteSelected.addEventListener('click', function() {
      if (selectedLogEntries.length === 0) return;
      
      showModal(
        'Delete Selected',
        chrome.i18n.getMessage('confirmDeleteSelected') || 'Are you sure you want to delete the selected items?',
        'Delete',
        'Cancel',
        function() {
          var newLog = settings.privateLog.filter(function(entry) {
            var entryId = entry.id || entry.timestamp;
            return !selectedLogEntries.includes(String(entryId));
          });
          
          chrome.storage.local.set({ privateLog: newLog }, function() {
            settings.privateLog = newLog;
            selectedLogEntries = [];
            renderPrivateLog();
            showToast(chrome.i18n.getMessage('successRemoved') || 'Items removed successfully.', 'success');
          });
        }
      );
    });

    elements.exportIgnoreList.addEventListener('click', function() {
      exportData({ ignoreList: settings.ignoreList }, 'stealth-ignore-list.json');
    });

    elements.exportPrivateLog.addEventListener('click', function() {
      exportData({ privateLog: settings.privateLog }, 'stealth-private-log.json');
    });

    elements.exportAllData.addEventListener('click', function() {
      exportData({
        ignoreList: settings.ignoreList,
        privateLog: settings.privateLog,
        settings: {
          darkMode: settings.darkMode,
          autoCleanupHistory: settings.autoCleanupHistory,
          cleanupIntervalMinutes: settings.cleanupIntervalMinutes,
          autoCleanupLogs: settings.autoCleanupLogs,
          logRetentionDays: settings.logRetentionDays,
          silentBlockEnabled: settings.silentBlockEnabled,
          blockMode: settings.blockMode
        }
      }, 'stealth-all-data.json');
    });

    elements.importFile.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        handleFileImport(e.target.files[0]);
      }
    });

    elements.confirmImport.addEventListener('click', confirmDataImport);
    elements.cancelImport.addEventListener('click', function() {
      elements.importPreview.style.display = 'none';
      importDataToProcess = null;
      elements.importFile.value = '';
    });

    elements.modalClose.addEventListener('click', hideModal);
    elements.modalCancel.addEventListener('click', hideModal);
    elements.modalConfirm.addEventListener('click', function() {
      if (modalCallback) modalCallback();
      hideModal();
    });

    document.querySelector('.modal-overlay').addEventListener('click', hideModal);

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local') {
        if (changes.ignoreList) {
          settings.ignoreList = changes.ignoreList.newValue || [];
          renderIgnoreList();
        }
        if (changes.privateLog) {
          settings.privateLog = changes.privateLog.newValue || [];
          renderPrivateLog();
        }
      }
    });

    console.log('Event listeners setup complete');
  }

  init();
}); 
