// Stealth Browsing Assistant - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('current-domain');
  const currentSiteStatus = document.getElementById('current-site-status');
  const toggleIgnoreButton = document.getElementById('toggle-ignore-button');
  const openSettingsButton = document.getElementById('open-settings-button');
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const ignoreCountEl = document.getElementById('ignore-count');
  const logCountEl = document.getElementById('log-count');
  const siteInfo = document.getElementById('site-info');

  let currentDomain = null;
  let mainDomain = null;
  let isCurrentSiteIgnored = false;
  let settings = null;

  async function init() {
    Utils.applyLocalization();
    await applySavedTheme();
    await loadSettings();
    await loadCurrentTabInfo();
    setupEventListeners();
  }

  async function applySavedTheme() {
    const isDark = await Utils.getSavedTheme();
    Utils.applyTheme(isDark);
    darkModeToggle.checked = isDark;
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response && response.success) {
          settings = response.settings;
          ignoreCountEl.textContent = settings.ignoreList.length;
          logCountEl.textContent = settings.privateLog.length;
        }
        resolve();
      });
    });
  }

  function getDomainFromUrl(url) {
    if (!url) return null;
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error("Invalid URL for domain extraction:", url, e);
      return null;
    }
  }

  function getMainDomain(domain) {
    if (!domain) return null;
    const parts = domain.split('.');
    return parts.length >= 2 ? 
           parts[parts.length - 2] + '.' + parts[parts.length - 1] : 
           domain;
  }

  function checkIfDomainIgnored(domain, ignoreList) {
    return ignoreList.some(ignoredSite => {
      return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
    });
  }

  function findMatchingIgnoreEntry(domain, ignoreList) {
    let exactMatch = ignoreList.find(site => site === domain);
    if (exactMatch) return exactMatch;

    for (const site of ignoreList) {
      if (domain.endsWith('.' + site)) {
        return site;
      }
    }
    return null;
  }

  async function loadCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0] && tabs[0].url) {
        currentDomain = getDomainFromUrl(tabs[0].url);
        mainDomain = currentDomain ? getMainDomain(currentDomain) : null;
      }

      if (currentDomain && settings) {
        currentDomainEl.textContent = currentDomain;
        isCurrentSiteIgnored = checkIfDomainIgnored(currentDomain, settings.ignoreList);
        updateToggleButtonText();
        updateStatusDisplay();
      } else {
        currentDomainEl.textContent = Utils.getI18nMessage('noDomainDetected');
        currentSiteStatus.textContent = '';
        toggleIgnoreButton.disabled = true;
        siteInfo.classList.add('no-domain');
      }
    });
  }

  function updateToggleButtonText() {
    if (isCurrentSiteIgnored) {
      toggleIgnoreButton.textContent = Utils.getI18nMessage('popupRemoveFromIgnoreList');
      toggleIgnoreButton.classList.add('danger-btn');
      toggleIgnoreButton.classList.remove('primary-btn');
    } else {
      toggleIgnoreButton.textContent = Utils.getI18nMessage('popupAddToIgnoreList');
      toggleIgnoreButton.classList.remove('danger-btn');
      toggleIgnoreButton.classList.add('primary-btn');
    }
    toggleIgnoreButton.disabled = !currentDomain;
  }

  function updateStatusDisplay() {
    if (isCurrentSiteIgnored) {
      currentSiteStatus.textContent = Utils.getI18nMessage('popupSiteIgnored');
      currentSiteStatus.classList.add('status-ignored');
      currentSiteStatus.classList.remove('status-not-ignored');
    } else {
      currentSiteStatus.textContent = Utils.getI18nMessage('popupSiteNotIgnored');
      currentSiteStatus.classList.remove('status-ignored');
      currentSiteStatus.classList.add('status-not-ignored');
    }
  }

  async function toggleIgnoreStatus() {
    if (!currentDomain || !mainDomain) return;

    try {
      if (isCurrentSiteIgnored) {
        const entryToRemove = findMatchingIgnoreEntry(currentDomain, settings.ignoreList);
        if (entryToRemove) {
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'removeFromIgnoreList',
              domain: entryToRemove
            }, resolve);
          });

          if (response && response.success) {
            settings.ignoreList = response.ignoreList;
            isCurrentSiteIgnored = false;
            updateToggleButtonText();
            updateStatusDisplay();
            ignoreCountEl.textContent = settings.ignoreList.length;
            Utils.showSuccess(Utils.getI18nMessage('successRemoved'));
          }
        }
      } else {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'addToIgnoreList',
            domain: mainDomain
          }, resolve);
        });

        if (response && response.success) {
          settings.ignoreList = response.ignoreList;
          isCurrentSiteIgnored = true;
          updateToggleButtonText();
          updateStatusDisplay();
          ignoreCountEl.textContent = settings.ignoreList.length;
          Utils.showSuccess(Utils.getI18nMessage('successAdded'));
        } else if (response && response.error === 'already_exists') {
          Utils.showWarning(Utils.getI18nMessage('errorAlreadyExists'));
        }
      }
    } catch (error) {
      console.error('Error toggling ignore status:', error);
      Utils.showError(error.message || 'An error occurred');
    }
  }

  function setupEventListeners() {
    toggleIgnoreButton.addEventListener('click', toggleIgnoreStatus);

    openSettingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    darkModeToggle.addEventListener('change', async () => {
      const isDark = darkModeToggle.checked;
      Utils.applyTheme(isDark);
      await chrome.storage.local.set({ darkMode: isDark });
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.ignoreList) {
        settings.ignoreList = changes.ignoreList.newValue || [];
        ignoreCountEl.textContent = settings.ignoreList.length;
        if (currentDomain) {
          isCurrentSiteIgnored = checkIfDomainIgnored(currentDomain, settings.ignoreList);
          updateToggleButtonText();
          updateStatusDisplay();
        }
      }
      if (changes.privateLog) {
        settings.privateLog = changes.privateLog.newValue || [];
        logCountEl.textContent = settings.privateLog.length;
      }
    }
  });

  await init();
}); 
