// Stealth Browsing Assistant - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const currentSiteStatus = document.getElementById('current-site-status');
  const toggleIgnoreButton = document.getElementById('toggle-ignore-button');
  const openSettingsButton = document.getElementById('open-settings-button');

  let currentDomain = null;
  let isCurrentSiteIgnored = false;

  // Function to set i18n text content
  function applyLocalization() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = chrome.i18n.getMessage(key);
    });
     // For buttons that might change text based on state, call this after setting their initial text
    updateToggleButtonText();
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

  // Update button text based on whether the site is ignored
  function updateToggleButtonText() {
    if (isCurrentSiteIgnored) {
      toggleIgnoreButton.textContent = chrome.i18n.getMessage('popupRemoveFromIgnoreList');
      currentSiteStatus.textContent = chrome.i18n.getMessage('popupSiteIgnored');
    } else {
      toggleIgnoreButton.textContent = chrome.i18n.getMessage('popupAddToIgnoreList');
      currentSiteStatus.textContent = chrome.i18n.getMessage('popupSiteNotIgnored');
    }
    toggleIgnoreButton.disabled = !currentDomain; // Disable if no domain (e.g. new tab page)
  }

  // 检查当前域名是否在忽略列表中，使用与background.js相同的匹配方式
  function checkIfDomainIgnored(domain, ignoreList) {
    return ignoreList.some(ignoredSite => {
      // 保持与background.js一致的匹配逻辑
      return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
    });
  }

  // 寻找适合从忽略列表中移除的条目
  function findMatchingIgnoreEntry(domain, ignoreList) {
    // 首先尝试找直接匹配的
    let exactMatch = ignoreList.find(site => site === domain);
    if (exactMatch) return exactMatch;

    // 然后寻找以.开头的匹配项
    for (const site of ignoreList) {
      if (domain.endsWith('.' + site)) {
        return site;
      }
    }
    return null;
  }

  // Get current tab's domain and check its status
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      currentDomain = getDomainFromUrl(tabs[0].url);
    }
    if (currentDomain) {
      chrome.storage.local.get({ ignoreList: [] }, (data) => {
        // 使用统一的匹配逻辑检查域名
        isCurrentSiteIgnored = checkIfDomainIgnored(currentDomain, data.ignoreList);
        applyLocalization(); // Apply after fetching state
        
        // 调试信息
        console.log(`当前域名: ${currentDomain}`);
        console.log(`忽略列表: ${JSON.stringify(data.ignoreList)}`);
        console.log(`是否被忽略: ${isCurrentSiteIgnored}`);
      });
    } else {
      // Handle cases like new tab page or chrome:// pages
      currentSiteStatus.textContent = "Cannot manage this page."; // Consider i18n for this
      toggleIgnoreButton.disabled = true;
      toggleIgnoreButton.textContent = chrome.i18n.getMessage('popupAddToIgnoreList'); // Default text
    }
  });

  // Toggle ignore status for the current site
  toggleIgnoreButton.addEventListener('click', () => {
    if (!currentDomain) return;

    chrome.storage.local.get({ ignoreList: [] }, (data) => {
      let newList = data.ignoreList;
      if (isCurrentSiteIgnored) {
        // 移除匹配的条目
        const entryToRemove = findMatchingIgnoreEntry(currentDomain, newList);
        if (entryToRemove) {
          newList = newList.filter(site => site !== entryToRemove);
          console.log(`移除忽略条目: ${entryToRemove}`);
        }
      } else {
        // 添加新条目 - 只添加主域名而非子域名
        const parts = currentDomain.split('.');
        const mainDomain = parts.length >= 2 ? 
                          parts[parts.length - 2] + '.' + parts[parts.length - 1] : 
                          currentDomain;
        
        if (!newList.includes(mainDomain)) {
          newList.push(mainDomain);
          console.log(`添加忽略域名: ${mainDomain}`);
        }
      }
      chrome.storage.local.set({ ignoreList: newList }, () => {
        isCurrentSiteIgnored = !isCurrentSiteIgnored;
        updateToggleButtonText();
        console.log(`忽略状态已切换，新状态: ${isCurrentSiteIgnored}`);
      });
    });
  });

  // Open settings page
  openSettingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Initial localization call, some parts might be updated after async calls
  applyLocalization();
}); 