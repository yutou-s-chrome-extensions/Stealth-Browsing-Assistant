// Stealth Browsing Assistant - Shared Utilities

const Utils = {
  toasts: [],
  toastContainer: null,

  initToastContainer: function() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  },

  showToast: function(message, type = 'info', duration = 3000) {
    this.initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

    this.toastContainer.appendChild(toast);
    toast.offsetHeight;
    toast.classList.add('toast-show');

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.hideToast(toast));

    const timeoutId = setTimeout(() => {
      this.hideToast(toast);
    }, duration);

    this.toasts.push({ element: toast, timeoutId });
  },

  hideToast: function(toastElement) {
    toastElement.classList.remove('toast-show');
    toastElement.classList.add('toast-hide');

    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      this.toasts = this.toasts.filter(t => t.element !== toastElement);
    }, 300);
  },

  showSuccess: function(message) {
    this.showToast(message, 'success');
  },

  showError: function(message) {
    this.showToast(message, 'error');
  },

  showInfo: function(message) {
    this.showToast(message, 'info');
  },

  showWarning: function(message) {
    this.showToast(message, 'warning');
  },

  applyTheme: function(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-theme');
    }
  },

  getSavedTheme: async function() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ darkMode: false }, (data) => {
        resolve(data.darkMode);
      });
    });
  },

  toggleTheme: async function() {
    const currentTheme = await this.getSavedTheme();
    const newTheme = !currentTheme;
    await chrome.storage.local.set({ darkMode: newTheme });
    this.applyTheme(newTheme);
    return newTheme;
  },

  getDomainFromUrl: function(url) {
    if (!url) return null;
    try {
      const urlObject = new URL(url);
      return urlObject.hostname;
    } catch (e) {
      console.error("Invalid URL:", url, e);
      return null;
    }
  },

  getMainDomain: function(domain) {
    if (!domain) return null;
    const parts = domain.split('.');
    return parts.length >= 2 ? 
           parts[parts.length - 2] + '.' + parts[parts.length - 1] : 
           domain;
  },

  isDomainIgnored: function(domain, ignoreList) {
    return ignoreList.some(ignoredSite => {
      return domain === ignoredSite || domain.endsWith('.' + ignoredSite);
    });
  },

  isValidDomain: function(domain) {
    if (!domain || domain.trim() === '') return false;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  },

  exportData: function(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importData: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (err) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  },

  createExportFileName: function(type) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `stealth-browsing-${type}-${dateStr}.json`;
  },

  formatDate: function(timestamp) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  },

  truncateText: function(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  applyLocalization: function() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        el.textContent = message;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        el.placeholder = message;
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        el.title = message;
      }
    });

    document.querySelectorAll('[data-i18n-value]').forEach(el => {
      const key = el.getAttribute('data-i18n-value');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        el.value = message;
      }
    });
  },

  getI18nMessage: function(key, placeholders = []) {
    return chrome.i18n.getMessage(key, placeholders);
  },

  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

if (typeof window !== 'undefined') {
  window.Utils = Utils;
} 
