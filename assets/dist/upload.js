function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// Drag & drop upload into the file grid, with Dropzone 6 (imported only when an upload URL is set).

import { LANG } from './lang.js';
import { ROOT } from './utils.js';
export var createUploadZone = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(function* (options) {
    var {
      default: Dropzone
    } = yield import('dropzone');
    if (!options.isCurrent()) {
      return null;
    }
    var targetFolderId = options.currentFolder();
    var dropzone = new Dropzone(options.element, {
      url: options.url,
      previewsContainer: options.previews,
      clickable: false,
      // Files belong to a folder: the root has none to store them in.
      accept: (file, done) => done(targetFolderId === ROOT ? LANG.errorUploadRoot : undefined),
      resizeWidth: 1920,
      previewTemplate: "<div class=\"dz-preview dz-file-preview\">\n            <div class=\"dz-details\"><img data-dz-thumbnail alt=\"\"><span class=\"dz-filename\" data-dz-name></span></div>\n            <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n        </div>"
    });
    dropzone.on('drop', event => {
      var folder = event.target.closest('.ml-folder');
      targetFolderId = folder ? Number(folder.dataset.folderId) : options.currentFolder();
    });
    dropzone.on('sending', (file, xhr, formData) => {
      formData.append('folder', String(targetFolderId));
      options.onSending(file, targetFolderId, xhr, formData);
    });
    dropzone.on('success', (file, json) => {
      if ((json == null ? void 0 : json.result) !== 'success') {
        console.error(json);
        options.onError(LANG.errorUpload);
        return;
      }
      options.onUploaded({
        id: json.file.id,
        name: json.file.name,
        url: json.file.url
      }, json.file.parent);
    });
    dropzone.on('error', (file, message) => {
      console.error(message);
      options.onError(message === LANG.errorUploadRoot ? LANG.errorUploadRoot : LANG.errorUpload);
    });
    dropzone.on('complete', file => {
      var _file$previewElement;
      return (_file$previewElement = file.previewElement) == null ? void 0 : _file$previewElement.remove();
    });
    return dropzone;
  });
  return function createUploadZone(_x) {
    return _ref.apply(this, arguments);
  };
}();