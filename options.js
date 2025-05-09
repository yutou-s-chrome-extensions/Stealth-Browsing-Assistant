// Stealth Browsing Assistant - Options Script

document.addEventListener('DOMContentLoaded', () => {
  const newSiteInput = document.getElementById('new-site-input');
  const addSiteButton = document.getElementById('add-site-button');
  const ignoreListUl = document.getElementById('ignore-list');
  const privateLogUl = document.getElementById('private-log');
  const clearAllLogsButton = document.getElementById('clear-all-logs-button');

  // Function to set i18n text content and attributes
  function applyLocalization() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = chrome.i18n.getMessage(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = chrome.i18n.getMessage(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = chrome.i18n.getMessage(key);
    });
    // Specifically for the main page title
    const pageTitle = document.querySelector('title[data-i18n]');
    if (pageTitle) {
        pageTitle.textContent = chrome.i18n.getMessage(pageTitle.getAttribute('data-i18n'));
    }
  }

  // Load ignore list and private log from storage
  function loadLists() {
    chrome.storage.local.get({ ignoreList: [], privateLog: [] }, (data) => {
      renderIgnoreList(data.ignoreList);
      renderPrivateLog(data.privateLog);
    });
  }

  // Render the ignore list in the UI
  function renderIgnoreList(list) {
    ignoreListUl.innerHTML = ''; // Clear existing list
    list.forEach((site, index) => {
      const li = document.createElement('li');
      li.textContent = site;
      const removeButton = document.createElement('button');
      removeButton.textContent = chrome.i18n.getMessage('removeButton');
      removeButton.classList.add('remove-item-button');
      removeButton.addEventListener('click', () => removeIgnoredSite(index));
      li.appendChild(removeButton);
      ignoreListUl.appendChild(li);
    });
  }

  // 获取域名的简化函数
  function getDisplayDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  }

  // 获取路径的简化显示
  function getDisplayPath(url) {
    try {
      const urlObj = new URL(url);
      // 返回路径和查询参数，但限制长度
      let path = urlObj.pathname;
      if (path.length > 20) {
        path = path.substring(0, 17) + '...';
      }
      return path;
    } catch (e) {
      return '';
    }
  }

  // Render the private log in the UI with improved formatting
  function renderPrivateLog(log) {
    privateLogUl.innerHTML = ''; // Clear existing log
    
    // 创建表格标题
    const tableHeader = document.createElement('div');
    tableHeader.className = 'log-table-header';
    tableHeader.innerHTML = `
      <div class="log-date-cell">日期/时间</div>
      <div class="log-title-cell">标题</div>
      <div class="log-url-cell">网站</div>
      <div class="log-actions-cell">操作</div>
    `;
    privateLogUl.appendChild(tableHeader);

    log.forEach((entry, index) => {
      const tableRow = document.createElement('div');
      tableRow.className = 'log-table-row';
      
      // 格式化日期
      const date = new Date(entry.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      // 截断标题
      const title = entry.title || '无标题';
      const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
      
      // 获取域名和路径简化显示
      const domain = getDisplayDomain(entry.url);
      const path = getDisplayPath(entry.url);
      
      // 添加表格单元格
      tableRow.innerHTML = `
        <div class="log-date-cell">${formattedDate}</div>
        <div class="log-title-cell" title="${title}">${displayTitle}</div>
        <div class="log-url-cell">
          <a href="${entry.url}" target="_blank" class="log-url-link" title="${entry.url}">
            <span class="log-domain">${domain}</span>
            <span class="log-path">${path}</span>
          </a>
        </div>
        <div class="log-actions-cell"></div>
      `;
      
      // 添加删除按钮
      const actionsCell = tableRow.querySelector('.log-actions-cell');
      const removeButton = document.createElement('button');
      removeButton.textContent = chrome.i18n.getMessage('removeButton');
      removeButton.classList.add('remove-item-button');
      removeButton.addEventListener('click', () => removePrivateLogEntry(index));
      actionsCell.appendChild(removeButton);

      privateLogUl.appendChild(tableRow);
    });

    // 如果没有记录，显示一条提示信息
    if (log.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-log-message';
      emptyMessage.textContent = '暂无隐私浏览记录';
      privateLogUl.appendChild(emptyMessage);
    }
  }

  // Add a new site to the ignore list
  addSiteButton.addEventListener('click', () => {
    const newSite = newSiteInput.value.trim().toLowerCase();
    if (newSite) {
      chrome.storage.local.get({ ignoreList: [] }, (data) => {
        const newList = data.ignoreList;
        if (!newList.includes(newSite)) {
          newList.push(newSite);
          chrome.storage.local.set({ ignoreList: newList }, () => {
            newSiteInput.value = '';
            renderIgnoreList(newList);
            console.log(`Site added to ignore list: ${newSite}`);
          });
        } else {
          // Optionally, provide feedback that site is already in list
          console.log(`Site already in ignore list: ${newSite}`);
          newSiteInput.value = '';
        }
      });
    }
  });

  // Remove a site from the ignore list
  function removeIgnoredSite(index) {
    chrome.storage.local.get({ ignoreList: [] }, (data) => {
      const newList = data.ignoreList;
      newList.splice(index, 1);
      chrome.storage.local.set({ ignoreList: newList }, () => {
        renderIgnoreList(newList);
        console.log("Site removed from ignore list.");
      });
    });
  }

  // Remove a single entry from the private log
  function removePrivateLogEntry(index) {
    chrome.storage.local.get({ privateLog: [] }, (data) => {
      const newLog = data.privateLog;
      newLog.splice(index, 1);
      chrome.storage.local.set({ privateLog: newLog }, () => {
        renderPrivateLog(newLog);
        console.log("Private log entry removed.");
      });
    });
  }

  // Clear all private logs
  clearAllLogsButton.addEventListener('click', () => {
    if (confirm(chrome.i18n.getMessage('clearAllPrivateLogsButton') + "?")) { // Basic confirmation
        chrome.storage.local.set({ privateLog: [] }, () => {
            renderPrivateLog([]);
            console.log("All private logs cleared.");
        });
    }
  });

  // Initial setup
  applyLocalization();
  loadLists();

  // Listen for storage changes to keep UI in sync (e.g., if changed by popup)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.ignoreList) {
        renderIgnoreList(changes.ignoreList.newValue || []);
      }
      if (changes.privateLog) {
        renderPrivateLog(changes.privateLog.newValue || []);
      }
    }
  });
}); 