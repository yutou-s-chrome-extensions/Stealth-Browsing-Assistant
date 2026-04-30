// Stealth Browsing Assistant - Popup Script
// 简化版，确保稳定性和兼容性

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded');

  var elements = {
    currentDomain: document.getElementById('current-domain'),
    currentSiteStatus: document.getElementById('current-site-status'),
    toggleIgnoreButton: document.getElementById('toggle-ignore-button'),
    openSettingsButton: document.getElementById('open-settings-button'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    ignoreCount: document.getElementById('ignore-count'),
    logCount: document.getElementById('log-count'),
    siteInfo: document.getElementById('site-info')
  };

  var currentDomain = null;
  var mainDomain = null;
  var isCurrentSiteIgnored = false;
  var settings = {
    ignoreList: [],
    privateLog: [],
    darkMode: false
  };

  function init() {
    console.log('Initializing popup...');
    
    applyLocalization();
    
    loadSavedTheme(function() {
      loadSettings(function() {
        loadCurrentTabInfo();
        setupEventListeners();
        console.log('Popup initialization complete');
      });
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

    console.log('Localization applied');
  }

  function loadSavedTheme(callback) {
    chrome.storage.local.get({ darkMode: false }, function(result) {
      var isDark = result.darkMode;
      settings.darkMode = isDark;
      applyTheme(isDark);
      elements.darkModeToggle.checked = isDark;
      console.log('Theme loaded:', isDark ? 'dark' : 'light');
      if (callback) callback();
    });
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

  function loadSettings(callback) {
    chrome.storage.local.get({ 
      ignoreList: [], 
      privateLog: [],
      darkMode: false
    }, function(result) {
      settings.ignoreList = result.ignoreList || [];
      settings.privateLog = result.privateLog || [];
      settings.darkMode = result.darkMode;
      
      elements.ignoreCount.textContent = settings.ignoreList.length;
      elements.logCount.textContent = settings.privateLog.length;
      
      console.log('Settings loaded - ignoreList:', settings.ignoreList.length, 'items');
      console.log('Settings loaded - privateLog:', settings.privateLog.length, 'items');
      
      if (callback) callback();
    });
  }

  function getDomainFromUrl(url) {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('Invalid URL for domain extraction:', url, e);
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

  function checkIfDomainIgnored(domain, ignoreList) {
    if (!domain || !ignoreList) return false;
    return ignoreList.some(function(ignoredSite) {
      return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
    });
  }

  function findMatchingIgnoreEntry(domain, ignoreList) {
    var exactMatch = ignoreList.find(function(site) {
      return site === domain;
    });
    if (exactMatch) return exactMatch;

    for (var i = 0; i < ignoreList.length; i++) {
      var site = ignoreList[i];
      if (domain.endsWith('.' + site)) {
        return site;
      }
    }
    return null;
  }

  function loadCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      console.log('Tabs query result:', tabs.length, 'tabs found');
      
      if (tabs[0] && tabs[0].url) {
        currentDomain = getDomainFromUrl(tabs[0].url);
        mainDomain = currentDomain ? getMainDomain(currentDomain) : null;
        console.log('Current domain:', currentDomain);
        console.log('Main domain:', mainDomain);
      }

      if (currentDomain) {
        elements.currentDomain.textContent = currentDomain;
        isCurrentSiteIgnored = checkIfDomainIgnored(currentDomain, settings.ignoreList);
        console.log('Is current site ignored:', isCurrentSiteIgnored);
        updateToggleButtonText();
        updateStatusDisplay();
      } else {
        console.log('No domain detected');
        elements.currentDomain.textContent = chrome.i18n.getMessage('noDomainDetected') || 'Cannot manage this page.';
        elements.currentSiteStatus.textContent = '';
        elements.toggleIgnoreButton.disabled = true;
        elements.siteInfo.classList.add('no-domain');
      }
    });
  }

  function updateToggleButtonText() {
    if (isCurrentSiteIgnored) {
      elements.toggleIgnoreButton.textContent = chrome.i18n.getMessage('popupRemoveFromIgnoreList') || 'Remove current site from ignore list';
      elements.toggleIgnoreButton.classList.add('danger-btn');
      elements.toggleIgnoreButton.classList.remove('primary-btn');
    } else {
      elements.toggleIgnoreButton.textContent = chrome.i18n.getMessage('popupAddToIgnoreList') || 'Add current site to ignore list';
      elements.toggleIgnoreButton.classList.remove('danger-btn');
      elements.toggleIgnoreButton.classList.add('primary-btn');
    }
    elements.toggleIgnoreButton.disabled = !currentDomain;
  }

  function updateStatusDisplay() {
    if (isCurrentSiteIgnored) {
      elements.currentSiteStatus.textContent = chrome.i18n.getMessage('popupSiteIgnored') || 'This site is currently being ignored.';
      elements.currentSiteStatus.classList.add('status-ignored');
      elements.currentSiteStatus.classList.remove('status-not-ignored');
    } else {
      elements.currentSiteStatus.textContent = chrome.i18n.getMessage('popupSiteNotIgnored') || 'This site is not on the ignore list.';
      elements.currentSiteStatus.classList.remove('status-ignored');
      elements.currentSiteStatus.classList.add('status-not-ignored');
    }
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

  function toggleIgnoreStatus() {
    console.log('Toggle ignore status clicked');
    
    if (!currentDomain || !mainDomain) {
      console.log('No domain to toggle');
      return;
    }

    if (isCurrentSiteIgnored) {
      var entryToRemove = findMatchingIgnoreEntry(currentDomain, settings.ignoreList);
      console.log('Entry to remove:', entryToRemove);
      
      if (entryToRemove) {
        var newList = settings.ignoreList.filter(function(site) {
          return site !== entryToRemove;
        });
        
        chrome.storage.local.set({ ignoreList: newList }, function() {
          console.log('Ignore list updated after removal');
          settings.ignoreList = newList;
          isCurrentSiteIgnored = false;
          updateToggleButtonText();
          updateStatusDisplay();
          elements.ignoreCount.textContent = settings.ignoreList.length;
          
          showToast(
            chrome.i18n.getMessage('successRemoved') || 'Site removed from ignore list successfully.',
            'success'
          );
        });
      }
    } else {
      console.log('Adding to ignore list:', mainDomain);
      
      if (settings.ignoreList.includes(mainDomain)) {
        console.log('Domain already in ignore list');
        showToast(
          chrome.i18n.getMessage('errorAlreadyExists') || 'This site is already in the ignore list.',
          'warning'
        );
        return;
      }

      var newList = settings.ignoreList.concat([mainDomain]);
      
      chrome.storage.local.set({ ignoreList: newList }, function() {
        console.log('Ignore list updated after addition');
        settings.ignoreList = newList;
        isCurrentSiteIgnored = true;
        updateToggleButtonText();
        updateStatusDisplay();
        elements.ignoreCount.textContent = settings.ignoreList.length;
        
        showToast(
          chrome.i18n.getMessage('successAdded') || 'Site added to ignore list successfully.',
          'success'
        );
      });
    }
  }

  function setupEventListeners() {
    console.log('Setting up event listeners...');

    elements.toggleIgnoreButton.addEventListener('click', function() {
      console.log('Toggle button clicked');
      toggleIgnoreStatus();
    });

    elements.openSettingsButton.addEventListener('click', function() {
      console.log('Open settings button clicked');
      chrome.runtime.openOptionsPage();
    });

    elements.darkModeToggle.addEventListener('change', function() {
      var isDark = elements.darkModeToggle.checked;
      console.log('Dark mode toggle changed to:', isDark);
      applyTheme(isDark);
      chrome.storage.local.set({ darkMode: isDark });
    });

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      console.log('Storage changed, namespace:', namespace);
      
      if (namespace === 'local') {
        if (changes.ignoreList) {
          settings.ignoreList = changes.ignoreList.newValue || [];
          elements.ignoreCount.textContent = settings.ignoreList.length;
          
          if (currentDomain) {
            isCurrentSiteIgnored = checkIfDomainIgnored(currentDomain, settings.ignoreList);
            updateToggleButtonText();
            updateStatusDisplay();
          }
        }
        if (changes.privateLog) {
          settings.privateLog = changes.privateLog.newValue || [];
          elements.logCount.textContent = settings.privateLog.length;
        }
      }
    });

    console.log('Event listeners setup complete');
  }

  init();
}); 
