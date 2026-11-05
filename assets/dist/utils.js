// Constants and pure helpers (no DOM state).

export var ROOT = 0;
export var EVENT_PREFIX = 'golpilolz_media-library';
export var IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp'];
var ICONS = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'odt', 'rtf'],
  xls: ['xls', 'xlsx', 'ods', 'csv'],
  zip: ['zip', 'rar', '7z', 'gz', 'tar']
};
export var escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export var extension = url => {
  var path = url.split(/[?#]/)[0];
  var dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
};
export var isImage = file => IMAGE_EXTENSIONS.includes(extension(file.url));
export var iconFor = file => {
  var ext = extension(file.url);
  for (var [icon, extensions] of Object.entries(ICONS)) {
    if (extensions.includes(ext)) {
      return icon;
    }
  }
  return 'txt';
};
export var byName = asc => (a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name, undefined, {
  sensitivity: 'base',
  numeric: true
});
export var clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// 1536 -> "1,5 Ko" (French units, base 1024).
export var formatSize = bytes => {
  var units = ['octets', 'Ko', 'Mo', 'Go', 'To'];
  var value = bytes;
  var unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  var digits = unit === 0 || value >= 100 ? 0 : 1;
  return value.toLocaleString('fr-FR', {
    maximumFractionDigits: digits
  }) + " " + units[unit];
};