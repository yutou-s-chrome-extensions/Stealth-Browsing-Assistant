// Stealth Browsing Assistant - Background Script

console.log("Stealth Browsing Assistant - Background Script Loaded");

// Function to get the domain from a URL
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

// 获取主域名 (example.com 而非 sub.example.com)
function getMainDomain(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  return parts.length >= 2 ? 
         parts[parts.length - 2] + '.' + parts[parts.length - 1] : 
         domain;
}

// 检查域名是否在忽略列表中
function isDomainIgnored(domain, ignoreList) {
  return ignoreList.some(ignoredSite => {
    return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
  });
}

// 新增: 更积极的历史记录删除函数，尝试通过不同方式删除
async function aggressivelyDeleteHistory(url, domain) {
  // 1. 删除确切的 URL
  await chrome.history.deleteUrl({ url: url });
  
  // 2. 尝试删除相关的子路径 URL (对联想建议可能有帮助)
  try {
    const urlObj = new URL(url);
    const basePath = urlObj.origin;
    console.log(`尝试删除域名相关历史: ${basePath}`);
    
    // 搜索并删除该域名下的所有历史记录
    const items = await chrome.history.search({ 
      text: domain,  // 搜索该域名
      maxResults: 1000  // 设置较大值以获取尽可能多的匹配项
    });
    
    console.log(`找到 ${items.length} 个相关历史项目`);
    for (const item of items) {
      if (item.url.includes(domain)) {
        await chrome.history.deleteUrl({ url: item.url });
        console.log(`删除历史记录: ${item.url}`);
      }
    }
  } catch (e) {
    console.error("删除域名历史记录时出错:", e);
  }
}

// Listener for web navigation
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId === 0) { // Ensure it's the main frame
    const siteUrl = details.url;
    const siteDomain = getDomainFromUrl(siteUrl);

    if (!siteDomain) return;

    // 1. Get ignore list from storage
    chrome.storage.local.get({ ignoreList: [], privateLog: [] }, async (data) => {
      const { ignoreList, privateLog } = data;
      
      // 使用共用函数检查域名
      const isIgnored = isDomainIgnored(siteDomain, ignoreList);

      if (isIgnored) {
        console.log(`Site ignored: ${siteUrl}`);
        
        // 2. Add to private log
        const logEntry = {
          url: siteUrl,
          title: '', // We'll try to get this later if possible, or from tab
          timestamp: new Date().toISOString()
        };

        // Attempt to get the title from the tab
        try {
            const tab = await chrome.tabs.get(details.tabId);
            if (tab && tab.title) {
                logEntry.title = tab.title;
            }
        } catch (e) {
            console.warn("Could not get tab title for private log:", e);
        }

        privateLog.unshift(logEntry); // Add to the beginning of the array

        // 3. 使用更积极的历史记录删除方法
        aggressivelyDeleteHistory(siteUrl, siteDomain)
          .then(() => {
            console.log(`已更积极地删除历史记录: ${siteUrl}`);
          })
          .catch(err => {
            console.error("删除历史记录时出错:", err);
          });

        // 4. Save updated private log
        chrome.storage.local.set({ privateLog }, () => {
          console.log("Private log updated.");
        });
      }
    });
  }
});

// Optional: Listen for tab updates to capture titles more reliably for private log
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const siteDomain = getDomainFromUrl(tab.url);
        if (!siteDomain) return;

        chrome.storage.local.get({ ignoreList: [], privateLog: [] }, (data) => {
            const { ignoreList, privateLog } = data;
            
            // 使用共用函数检查域名
            const isIgnored = isDomainIgnored(siteDomain, ignoreList);

            if (isIgnored) {
                // Check if the latest log entry for this URL needs a title update
                const latestLogEntry = privateLog.find(entry => entry.url === tab.url && entry.title === '');
                if (latestLogEntry && tab.title) {
                    latestLogEntry.title = tab.title;
                    chrome.storage.local.set({ privateLog }, () => {
                        console.log(`Private log title updated for: ${tab.url}`);
                    });
                }
                
                // 每次页面加载完成后，再次尝试删除历史记录
                // 这可能有助于处理一些延迟加载的页面
                aggressivelyDeleteHistory(tab.url, siteDomain)
                  .then(() => console.log(`页面加载后删除历史: ${tab.url}`))
                  .catch(err => console.error("页面加载后删除历史出错:", err));
            }
        });
    }
});


// Message listener for communication from popup or options page (if needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDomain") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const domain = getDomainFromUrl(tabs[0].url);
        sendResponse({ domain: domain });
      } else {
        sendResponse({ domain: null });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }
});

// 添加: 定期清理历史记录
setInterval(() => {
  chrome.storage.local.get({ ignoreList: [] }, async (data) => {
    if (data.ignoreList && data.ignoreList.length > 0) {
      for (const domain of data.ignoreList) {
        try {
          const items = await chrome.history.search({ 
            text: domain, 
            maxResults: 100 
          });
          
          for (const item of items) {
            if (item.url.includes(domain)) {
              await chrome.history.deleteUrl({ url: item.url });
              console.log(`定期清理: 删除历史记录 ${item.url}`);
            }
          }
        } catch (e) {
          console.error(`定期清理出错 (${domain}):`, e);
        }
      }
    }
  });
}, 30 * 60 * 1000); // 每30分钟执行一次 