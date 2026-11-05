// The "Informations" dialog's markup: a preview and a list of the file's details.

import { LANG } from './lang.js';
import { escapeHtml, extension, formatSize, iconFor, isImage } from './utils.js';
var pending = '<span class="ml-info-pending" aria-hidden="true"></span>';

// `loading`: the details only the server knows are shown as placeholders.
export var infoTemplate = (info, loading) => {
  var _info$path;
  var row = (label, value) => value === null ? '' : "<dt>" + escapeHtml(label) + "</dt><dd>" + value + "</dd>";
  // A server detail: a placeholder while loading, hidden when unknown.
  var detail = (value, format) => loading ? pending : value === null || value === undefined ? null : format();
  var ext = info.extension || extension(info.url);
  var type = [info.mimeType, ext ? ext.toUpperCase() : null].filter(Boolean);
  var modified = info.modifiedAt ? new Date(info.modifiedAt) : null;
  return "<div class=\"ml-info" + (loading ? ' ml-info--loading' : '') + "\" aria-busy=\"" + loading + "\">\n        <div class=\"ml-info-preview ml-thumb--" + (isImage(info) ? 'picture' : iconFor(info)) + "\">\n            " + (isImage(info) ? "<img src=\"" + escapeHtml(info.url) + "\" alt=\"\">" : '') + "\n        </div>\n        <dl class=\"ml-info-list\">\n            " + row(LANG.infoName, escapeHtml(info.name)) + "\n            " + row(LANG.infoFolder, escapeHtml([LANG.root, ...((_info$path = info.path) != null ? _info$path : [])].join(' › '))) + "\n            " + row(LANG.infoType, loading && !info.mimeType ? pending : type.length ? escapeHtml(type.join(' · ')) : null) + "\n            " + row(LANG.infoSize, detail(info.size, () => escapeHtml(formatSize(info.size)))) + "\n            " + row(LANG.infoDimensions, isImage(info) || info.width ? detail(info.width, () => info.width + " \xD7 " + info.height + " px") : null) + "\n            " + row(LANG.infoModified, detail(modified, () => escapeHtml(modified.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  })))) + "\n            " + row(LANG.infoUrl, "<a href=\"" + escapeHtml(info.url) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(info.url) + "</a>") + "\n            " + row(LANG.infoId, escapeHtml(info.id)) + "\n        </dl>\n    </div>";
};