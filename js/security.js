(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }
  function imageUrl(value) {
    try {
      var url = new URL(value, location.href);
      if (url.origin === location.origin || (url.protocol === 'https:' && url.hostname === 'cdn.sanity.io')) return escapeHtml(url.href);
      if (String(value).startsWith('data:image/svg+xml,')) return escapeHtml(value);
    } catch (_) {}
    return 'images/favicon.png';
  }
  window.storeSecurity = { escapeHtml: escapeHtml, imageUrl: imageUrl };
})();
