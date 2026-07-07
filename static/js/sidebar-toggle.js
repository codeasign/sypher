(function() {
  'use strict';

  var STORAGE_KEY = 'sypher-sidebar-collapsed';
  var btn = null;

  function createToggle() {
    if (btn && btn.parentNode) return; // Already exists

    btn = document.createElement('button');
    btn.className = 'sypher-sidebar-toggle';
    btn.setAttribute('aria-label', 'Collapse sidebar');
    btn.setAttribute('title', 'Collapse sidebar');

    var collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (collapsed) {
      btn.classList.add('sypher-sidebar-collapsed-btn');
      btn.textContent = '◀';
      document.body.classList.add('sypher-sidebar-collapsed');
    } else {
      btn.textContent = '▶';
    }

    btn.addEventListener('click', function() {
      collapsed = !collapsed;
      document.body.classList.toggle('sypher-sidebar-collapsed', collapsed);
      localStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false');
      btn.classList.toggle('sypher-sidebar-collapsed-btn', collapsed);
      btn.textContent = collapsed ? '◀' : '▶';
      btn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });

    // Insert before the first child of body (before React root)
    if (document.body.firstChild) {
      document.body.insertBefore(btn, document.body.firstChild);
    } else {
      document.body.appendChild(btn);
    }
  }

  // Create the button
  function init() {
    if (!document.body) {
      setTimeout(init, 50);
      return;
    }
    createToggle();

    // Watch for mutations — re-add if React removes it
    var observer = new MutationObserver(function() {
      if (!btn || !btn.parentNode) {
        createToggle();
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();