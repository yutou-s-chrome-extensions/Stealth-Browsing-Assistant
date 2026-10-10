// Stealth Browsing Assistant - Background Script (Manifest V3)

console.log("Stealth Browsing Assistant v2.0 - Background Script Loaded");

const DEFAULT_SETTINGS = {
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

function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    const urlObject = new URL(url);
    return urlObject.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
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

function isDomainIgnored(domain, ignoreList) {
  return ignoreList.some(ignoredSite => {
    return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
  });
}

async function aggressivelyDeleteHistory(url, domain) {
  try {
    await chrome.history.deleteUrl({ url: url });
    console.log(`Deleted history for: ${url}`);
  } catch (e) {
    console.error("Error deleting single URL:", e);
  }

  try {
    const urlObj = new URL(url);
    const basePath = urlObj.origin;
    console.log(`Attempting to delete related history for: ${basePath}`);
    
    const items = await chrome.history.search({ 
      text: domain,
      maxResults: 1000
    });
    
    console.log(`Found ${items.length} related history items`);
    for (const item of items) {
      if (item.url.includes(domain)) {
        try {
          await chrome.history.deleteUrl({ url: item.url });
          console.log(`Deleted history: ${item.url}`);
        } catch (e) {
          console.error(`Error deleting: ${item.url}`, e);
        }
      }
    }
  } catch (e) {
    console.error("Error deleting domain history:", e);
  }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
      resolve(data);
    });
  });
}

async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}

async function addToPrivateLog(url, title, tabId) {
  const settings = await getSettings();
  const logEntry = {
    url: url,
    title: title || '',
    timestamp: new Date().toISOString(),
    id: Date.now().toString(36) + Math.random().toString(36).substr(2)
  };

  if (tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.title) {
        logEntry.title = tab.title;
      }
    } catch (e) {
      console.warn("Could not get tab title:", e);
    }
  }

  settings.privateLog.unshift(logEntry);
  
  if (settings.autoCleanupLogs) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.logRetentionDays);
    settings.privateLog = settings.privateLog.filter(entry => {
      return new Date(entry.timestamp) > cutoffDate;
    });
  }

  await saveSettings({ privateLog: settings.privateLog });
  console.log("Private log updated.");
}

async function updateDynamicRules(ignoreList, silentBlockEnabled, blockMode) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }

    if (silentBlockEnabled && ignoreList.length > 0) {
      const newRules = ignoreList.map((domain, index) => {
        const ruleId = index + 1;
        
        if (blockMode === 'cancel') {
          return {
            id: ruleId,
            priority: 1,
            action: { type: 'block' },
            condition: {
              urlFilter: domain,
              resourceTypes: ['main_frame', 'sub_frame']
            }
          };
        } else {
          return {
            id: ruleId,
            priority: 1,
            action: { 
              type: 'redirect',
              redirect: { url: 'about:blank' }
            },
            condition: {
              urlFilter: domain,
              resourceTypes: ['main_frame', 'sub_frame']
            }
          };
        }
      });

      if (newRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: newRules
        });
        console.log(`Updated ${newRules.length} dynamic rules for silent blocking.`);
      }
    }
  } catch (e) {
    console.error("Error updating dynamic rules:", e);
  }
}

async function setupAlarm(intervalMinutes) {
  try {
    await chrome.alarms.clear('cleanupAlarm');
    
    await chrome.alarms.create('cleanupAlarm', {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
    
    console.log(`Alarm set for every ${intervalMinutes} minutes.`);
  } catch (e) {
    console.error("Error setting up alarm:", e);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanupAlarm') {
    console.log("Running scheduled cleanup...");
    
    const settings = await getSettings();
    
    if (settings.autoCleanupHistory && settings.ignoreList.length > 0) {
      for (const domain of settings.ignoreList) {
        try {
          const items = await chrome.history.search({ 
            text: domain, 
            maxResults: 100 
          });
          
          for (const item of items) {
            if (item.url.includes(domain)) {
              await chrome.history.deleteUrl({ url: item.url });
              console.log(`Scheduled cleanup: Deleted ${item.url}`);
            }
          }
        } catch (e) {
          console.error(`Scheduled cleanup error (${domain}):`, e);
        }
      }
    }

    if (settings.autoCleanupLogs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.logRetentionDays);
      
      const filteredLog = settings.privateLog.filter(entry => {
        return new Date(entry.timestamp) > cutoffDate;
      });
      
      if (filteredLog.length !== settings.privateLog.length) {
        await saveSettings({ privateLog: filteredLog });
        console.log(`Auto-cleaned old logs. Removed ${settings.privateLog.length - filteredLog.length} entries.`);
      }
    }
  }
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId === 0) {
    const siteUrl = details.url;
    const siteDomain = getDomainFromUrl(siteUrl);

    if (!siteDomain) return;

    const settings = await getSettings();
    const isIgnored = isDomainIgnored(siteDomain, settings.ignoreList);

    if (isIgnored) {
      console.log(`Site ignored: ${siteUrl}`);
      
      await addToPrivateLog(siteUrl, '', details.tabId);
      
      await aggressivelyDeleteHistory(siteUrl, siteDomain);
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const siteDomain = getDomainFromUrl(tab.url);
    if (!siteDomain) return;

    const settings = await getSettings();
    const isIgnored = isDomainIgnored(siteDomain, settings.ignoreList);

    if (isIgnored) {
      const existingEntry = settings.privateLog.find(entry => entry.url === tab.url);
      if (existingEntry && !existingEntry.title && tab.title) {
        existingEntry.title = tab.title;
        await saveSettings({ privateLog: settings.privateLog });
        console.log(`Updated title for: ${tab.url}`);
      }
      
      await aggressivelyDeleteHistory(tab.url, siteDomain);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (request.action) {
        case "getDomain":
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0] && tabs[0].url) {
            const domain = getDomainFromUrl(tabs[0].url);
            sendResponse({ domain: domain, success: true });
          } else {
            sendResponse({ domain: null, success: true });
          }
          break;

        case "getSettings":
          const settings = await getSettings();
          sendResponse({ settings: settings, success: true });
          break;

        case "updateSettings":
          await saveSettings(request.settings);
          
          if (request.settings.ignoreList !== undefined || 
              request.settings.silentBlockEnabled !== undefined ||
              request.settings.blockMode !== undefined) {
            const currentSettings = await getSettings();
            await updateDynamicRules(
              currentSettings.ignoreList, 
              currentSettings.silentBlockEnabled,
              currentSettings.blockMode
            );
          }

          if (request.settings.cleanupIntervalMinutes !== undefined ||
              request.settings.autoCleanupHistory !== undefined) {
            const currentSettings = await getSettings();
            if (currentSettings.autoCleanupHistory) {
              await setupAlarm(currentSettings.cleanupIntervalMinutes);
            } else {
              await chrome.alarms.clear('cleanupAlarm');
            }
          }

          sendResponse({ success: true });
          break;

        case "addToIgnoreList":
          const addSettings = await getSettings();
          const domainToAdd = request.domain.toLowerCase();
          
          if (!addSettings.ignoreList.includes(domainToAdd)) {
            addSettings.ignoreList.push(domainToAdd);
            await saveSettings({ ignoreList: addSettings.ignoreList });
            
            if (addSettings.silentBlockEnabled) {
              await updateDynamicRules(
                addSettings.ignoreList, 
                addSettings.silentBlockEnabled,
                addSettings.blockMode
              );
            }
            
            sendResponse({ success: true, ignoreList: addSettings.ignoreList });
          } else {
            sendResponse({ success: false, error: 'already_exists' });
          }
          break;

        case "removeFromIgnoreList":
          const removeSettings = await getSettings();
          const domainToRemove = request.domain.toLowerCase();
          
          removeSettings.ignoreList = removeSettings.ignoreList.filter(
            site => site !== domainToRemove
          );
          
          await saveSettings({ ignoreList: removeSettings.ignoreList });
          
          await updateDynamicRules(
            removeSettings.ignoreList, 
            removeSettings.silentBlockEnabled,
            removeSettings.blockMode
          );
          
          sendResponse({ success: true, ignoreList: removeSettings.ignoreList });
          break;

        case "clearPrivateLog":
          await saveSettings({ privateLog: [] });
          sendResponse({ success: true });
          break;

        case "removeLogEntry":
          const logSettings = await getSettings();
          logSettings.privateLog = logSettings.privateLog.filter(
            entry => entry.id !== request.entryId
          );
          await saveSettings({ privateLog: logSettings.privateLog });
          sendResponse({ success: true, privateLog: logSettings.privateLog });
          break;

        case "removeSelectedLogEntries":
          const selLogSettings = await getSettings();
          selLogSettings.privateLog = selLogSettings.privateLog.filter(
            entry => !request.entryIds.includes(entry.id)
          );
          await saveSettings({ privateLog: selLogSettings.privateLog });
          sendResponse({ success: true, privateLog: selLogSettings.privateLog });
          break;

        case "getIgnoreList":
          const igSettings = await getSettings();
          sendResponse({ ignoreList: igSettings.ignoreList, success: true });
          break;

        case "getPrivateLog":
          const plSettings = await getSettings();
          sendResponse({ privateLog: plSettings.privateLog, success: true });
          break;

        case "getStatus":
          const statusSettings = await getSettings();
          sendResponse({
            success: true,
            status: 'active',
            ignoreCount: statusSettings.ignoreList.length,
            logCount: statusSettings.privateLog.length
          });
          break;

        default:
          sendResponse({ success: false, error: 'unknown_action' });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  };

  handleMessage();
  return true;
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/reloaded:", details.reason);
  
  const settings = await getSettings();
  await saveSettings(settings);
  
  if (settings.autoCleanupHistory) {
    await setupAlarm(settings.cleanupIntervalMinutes);
  }
  
  await updateDynamicRules(
    settings.ignoreList, 
    settings.silentBlockEnabled,
    settings.blockMode
  );
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser startup - initializing Stealth Browsing Assistant");
  
  const settings = await getSettings();
  
  if (settings.autoCleanupHistory) {
    await setupAlarm(settings.cleanupIntervalMinutes);
  }
  
  await updateDynamicRules(
    settings.ignoreList, 
    settings.silentBlockEnabled,
    settings.blockMode
  );
}); 
