'use strict';

function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
import { Controller } from '@hotwired/stimulus';
import { LANG } from './lang.js';
import { byName, escapeHtml, EVENT_PREFIX, extension, fileMeta, iconFor, isImage, ROOT } from './utils.js';
import { fetchFileInfo, fetchJson, postJson, uploadFile } from './api.js';
import { labelForm, openDialog, readTitle } from './dialog.js';
import { closeContextMenu, openContextMenu } from './context-menu.js';
import { layoutTemplate, previewTemplate } from './templates.js';
import { infoTemplate } from './info.js';
import { createUploadZone } from './upload.js';
import { CROP_TYPES, cropTemplate, cropToBlob, isCroppable, mountCropper } from './crop.js';

// The popup's Stimulus controller: state, rendering and actions. Markup and the
// self-contained pieces (dialogs, context menu, cropper, upload, HTTP calls) live in the sibling modules.
export default class _class extends Controller {
  constructor() {
    super(...arguments);
    this.folders = [];
    this.activeFolderId = ROOT;
    this.openFolderIds = new Set();
    this.selectedFileIds = new Set();
    this.highlightedFolderId = null;
    this.sortAsc = true;
    this.rendered = false;
    this.abort = null;
    this.dropzone = null;
    // Bumped by every open()/close(): an open() whose await resumes after a newer
    // open() or a close() must stop, or it would re-render or attach a second Dropzone.
    this.session = 0;
  }
  connect() {
    this.toggleButtons();
    this.dispatchEvent('connect');
  }
  disconnect() {
    this.teardown();
  }

  // ---- Stimulus actions ------------------------------------------------

  open() {
    var _this = this;
    return _asyncToGenerator(function* () {
      var session = ++_this.session;
      _this.popupTarget.classList.add('show');
      _this.loaderTarget.hidden = false;
      _this.selectedFileIds = new Set(_this.inputValues());
      if (!_this.rendered) {
        _this.contentTarget.innerHTML = layoutTemplate();
        _this.bindEvents();
        _this.rendered = true;
      }
      var folders = null;
      try {
        folders = yield fetchJson(_this.foldersUrlValue);
      } catch (error) {
        console.error(error);
      }
      if (session !== _this.session) {
        return;
      }
      _this.loaderTarget.hidden = true;
      if (folders === null) {
        _this.alert(LANG.errorAction, 'danger');
      } else {
        _this.setFolders(folders);
      }
      _this.render();
      yield _this.initDropzone(session);
      _this.dispatchEvent('showPopup');
    })();
  }
  close() {
    this.session++;
    this.popupTarget.classList.remove('show');
    this.closeContextMenu();
    this.destroyDropzone();
    this.dispatchEvent('closePopup');
  }
  clear() {
    this.writeValue([]);
    this.dispatchEvent('clear');
  }

  // Multiple: remove one file from the selection (preview tile's × button).
  remove(_ref) {
    var _this$previewTarget$q;
    var {
      params: {
        id
      }
    } = _ref;
    this.writeInputs(this.inputValues().filter(value => value !== id));
    (_this$previewTarget$q = this.previewTarget.querySelector("[data-" + this.identifier + "-id-param=\"" + id + "\"]")) == null || (_this$previewTarget$q = _this$previewTarget$q.closest('.ml-preview-item')) == null || _this$previewTarget$q.remove();
    this.toggleButtons();
    this.dispatchEvent('remove', {
      id
    });
  }

  // ---- Data ------------------------------------------------------------

  setFolders(folders) {
    this.folders = folders.map(folder => {
      var _folder$parent, _folder$files;
      return _extends({}, folder, {
        parent: (_folder$parent = folder.parent) != null ? _folder$parent : ROOT,
        files: (_folder$files = folder.files) != null ? _folder$files : []
      });
    });
    var active = this.folders.find(folder => folder.active);
    if (active) {
      this.activeFolderId = active.id;
    } else if (!this.getFolder(this.activeFolderId)) {
      this.activeFolderId = ROOT;
    }
    for (var folder of this.folders) {
      if (folder.open) {
        this.openFolderIds.add(folder.id);
      }
    }
    this.openAncestors(this.activeFolderId);
  }
  getFolder(id) {
    return this.folders.find(folder => folder.id === id);
  }
  getChildFolders(parent) {
    return this.folders.filter(folder => folder.parent === parent);
  }
  getFile(id) {
    for (var folder of this.folders) {
      var _folder$files2;
      var file = (_folder$files2 = folder.files) == null ? void 0 : _folder$files2.find(file => file.id === id);
      if (file) {
        return file;
      }
    }
    return undefined;
  }
  getFileFolder(id) {
    return this.folders.find(folder => {
      var _folder$files3;
      return (_folder$files3 = folder.files) == null ? void 0 : _folder$files3.some(file => file.id === id);
    });
  }
  openAncestors(id) {
    var folder = this.getFolder(id);
    while (folder && folder.parent !== ROOT) {
      this.openFolderIds.add(folder.parent);
      folder = this.getFolder(folder.parent);
    }
  }

  // ---- Rendering -------------------------------------------------------

  render() {
    this.renderTree();
    this.renderBreadcrumb();
    this.renderContent();
  }
  renderBreadcrumb() {
    var path = [];
    var folder = this.getFolder(this.activeFolderId);
    while (folder) {
      path.unshift(folder);
      folder = this.getFolder(folder.parent);
    }
    var crumbs = [{
      id: ROOT,
      name: LANG.root
    }, ...path];
    this.find('.ml-breadcrumb').innerHTML = crumbs.map((crumb, index) => index === crumbs.length - 1 ? "<span class=\"ml-crumb ml-crumb--current\" aria-current=\"page\">" + escapeHtml(crumb.name) + "</span>" : "<button type=\"button\" class=\"ml-crumb\" data-ml-action=\"navigate\" data-folder-id=\"" + crumb.id + "\">" + escapeHtml(crumb.name) + "</button><span class=\"ml-crumb-separator\" aria-hidden=\"true\">\u203A</span>").join('');
  }
  updateFooter() {
    var count = this.selectedFileIds.size;
    this.find('.ml-status').textContent = count === 0 ? LANG.noSelection : count === 1 ? LANG.oneSelected : LANG.manySelected(count);
    this.find('[data-ml-action="validate"]').disabled = count === 0;
  }
  renderTree() {
    var tree = this.find('.ml-tree');
    var branch = parent => {
      var children = this.getChildFolders(parent).sort(byName(true));
      if (children.length === 0) {
        return '';
      }
      return "<ul>" + children.map(folder => {
        var hasChildren = this.getChildFolders(folder.id).length > 0;
        var open = this.openFolderIds.has(folder.id);
        var classes = ['ml-tree-item', open ? 'open' : '', folder.id === this.activeFolderId ? 'active' : ''].join(' ');
        return "<li class=\"" + classes + "\" data-folder-id=\"" + folder.id + "\">\n                    " + (hasChildren ? "<button type=\"button\" class=\"ml-expand\" data-ml-action=\"toggle\" aria-label=\"" + (open ? 'Replier' : 'Déplier') + "\" aria-expanded=\"" + open + "\">\u203A</button>" : '<span class="ml-expand"></span>') + "\n                    <span class=\"ml-tree-label\" data-ml-action=\"navigate\"><span class=\"" + (open ? 'icon-folder-open' : 'icon-folder') + "\"></span> " + escapeHtml(folder.name) + "</span>\n                    " + (hasChildren ? branch(folder.id) : '') + "\n                </li>";
      }).join('') + "</ul>";
    };
    tree.innerHTML = "<ul><li class=\"ml-tree-item open " + (this.activeFolderId === ROOT ? 'active' : '') + "\" data-folder-id=\"" + ROOT + "\">\n            <span class=\"ml-expand\"></span>\n            <span class=\"ml-tree-label\" data-ml-action=\"navigate\"><span class=\"icon-folder-open\"></span> " + LANG.root + "</span>\n            " + branch(ROOT) + "\n        </li></ul>";
  }
  renderContent() {
    var _this$getFolder$files, _this$getFolder;
    var content = this.find('.ml-content');
    var folders = this.getChildFolders(this.activeFolderId).sort(byName(this.sortAsc));
    var files = [...((_this$getFolder$files = (_this$getFolder = this.getFolder(this.activeFolderId)) == null ? void 0 : _this$getFolder.files) != null ? _this$getFolder$files : [])].sort(byName(this.sortAsc));
    this.highlightedFolderId = null;
    this.find('.ml-search').value = '';
    if (folders.length === 0 && files.length === 0) {
      content.innerHTML = "<div class=\"ml-empty\">\n                <span class=\"ml-empty-icon icon-folder-open\" aria-hidden=\"true\"></span>\n                <p class=\"ml-empty-title\">" + LANG.emptyFolder + "</p>\n                " + (this.uploadUrlValue !== '' && this.activeFolderId !== ROOT ? "<p class=\"ml-empty-hint\">" + LANG.emptyFolderUpload + "</p>" : '') + "\n            </div>";
      this.updateFooter();
      return;
    }
    content.innerHTML = folders.map(folder => "\n            <div class=\"ml-item ml-folder\" data-folder-id=\"" + folder.id + "\" title=\"" + escapeHtml(folder.name) + "\">\n                <div class=\"ml-thumb ml-thumb--folder\"><span class=\"icon-folder\" aria-hidden=\"true\"></span></div>\n                <span class=\"ml-title\">" + escapeHtml(folder.name) + "</span>\n            </div>").join('') + files.map(file => "\n            <div class=\"ml-item ml-file " + (this.selectedFileIds.has(file.id) ? 'active' : '') + "\" data-file-id=\"" + file.id + "\" title=\"" + escapeHtml(file.name) + "\">\n                <div class=\"ml-thumb ml-thumb--" + (isImage(file) ? 'picture' : iconFor(file)) + "\">\n                    " + (isImage(file) ? "<img src=\"" + escapeHtml(file.url) + "\" alt=\"\" loading=\"lazy\">" : '') + "\n                </div>\n                <span class=\"ml-title\">" + escapeHtml(file.name) + "</span>\n                " + (fileMeta(file) ? "<span class=\"ml-meta\">" + escapeHtml(fileMeta(file)) + "</span>" : '') + "\n            </div>").join('');
    this.updateFooter();
  }

  // ---- Events ----------------------------------------------------------

  bindEvents() {
    this.abort = new AbortController();
    var signal = this.abort.signal;
    var root = this.contentTarget;
    root.addEventListener('click', event => this.onClick(event), {
      signal
    });
    root.addEventListener('dblclick', event => this.onDblClick(event), {
      signal
    });
    root.addEventListener('contextmenu', event => this.onContextMenu(event), {
      signal
    });
    // Enter in the search box must not submit the surrounding Symfony form.
    root.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('.ml-search')) {
        event.preventDefault();
      }
    }, {
      signal
    });
    root.addEventListener('input', event => {
      if (event.target.matches('.ml-search')) {
        this.filter(event.target.value);
      }
    }, {
      signal
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.ml-context-menu')) {
        this.closeContextMenu();
      }
    }, {
      signal
    });
    document.addEventListener('keydown', event => this.onKeydown(event), {
      signal
    });
    this.find('.ml-content').addEventListener('scroll', () => this.closeContextMenu(), {
      signal
    });
    this.find('.ml-zoom').addEventListener('click', event => event.currentTarget.close(), {
      signal
    });
  }
  teardown() {
    var _this$abort;
    this.session++;
    (_this$abort = this.abort) == null || _this$abort.abort();
    this.abort = null;
    this.destroyDropzone();
    this.rendered = false;
  }
  onClick(event) {
    var _target$closest, _target$closest2;
    var target = event.target;
    var action = (_target$closest = target.closest('[data-ml-action]')) == null ? void 0 : _target$closest.dataset.mlAction;
    var folderId = Number((_target$closest2 = target.closest('[data-folder-id]')) == null ? void 0 : _target$closest2.dataset.folderId);
    switch (action) {
      case 'sort-asc':
      case 'sort-desc':
        this.sortAsc = action === 'sort-asc';
        this.findAll('[data-ml-action^="sort-"]').forEach(button => button.classList.toggle('active', button.dataset.mlAction === action));
        this.renderContent();
        return;
      case 'open-folder':
        if (this.highlightedFolderId !== null) {
          this.navigate(this.highlightedFolderId);
        }
        return;
      case 'zoom':
        this.zoom();
        return;
      case 'cancel':
        this.close();
        return;
      case 'validate':
        this.select([...this.selectedFileIds]);
        return;
      case 'toggle':
        this.toggleFolder(folderId);
        return;
      case 'navigate':
        this.navigate(folderId);
        return;
    }
    if (!target.closest('.ml-content')) {
      return;
    }
    var folder = target.closest('.ml-folder');
    var file = target.closest('.ml-file');
    if (folder) {
      this.highlight(folder);
      this.highlightedFolderId = Number(folder.dataset.folderId);
    } else if (file) {
      this.toggleFile(file);
    } else {
      this.findAll('.ml-content .ml-item.active').forEach(item => item.classList.remove('active'));
      this.highlightedFolderId = null;
      this.selectedFileIds.clear();
    }
    this.updateFooter();
  }
  onDblClick(event) {
    var target = event.target;
    var folder = target.closest('.ml-content .ml-folder');
    var file = target.closest('.ml-content .ml-file');
    if (folder) {
      this.navigate(Number(folder.dataset.folderId));
    } else if (file && !this.multipleValue) {
      this.select([Number(file.dataset.fileId)]);
    }
  }
  onKeydown(event) {
    if (event.key !== 'Escape' || !this.popupTarget.classList.contains('show')) {
      return;
    }
    // Open <dialog>s handle Escape themselves.
    if (this.contentTarget.querySelector('dialog[open]')) {
      return;
    }
    if (!this.find('.ml-context-menu').hidden) {
      this.closeContextMenu();
      return;
    }
    this.close();
  }
  highlight(item) {
    this.findAll('.ml-content .ml-folder.active').forEach(other => other.classList.remove('active'));
    if (!this.multipleValue) {
      this.findAll('.ml-content .ml-item.active').forEach(other => other.classList.remove('active'));
      this.selectedFileIds.clear();
    }
    item.classList.add('active');
  }
  toggleFile(item) {
    var id = Number(item.dataset.fileId);
    if (this.multipleValue) {
      item.classList.toggle('active');
      item.classList.contains('active') ? this.selectedFileIds.add(id) : this.selectedFileIds.delete(id);
      return;
    }
    this.highlight(item);
    this.highlightedFolderId = null;
    this.selectedFileIds = new Set([id]);
  }
  navigate(id) {
    this.activeFolderId = id;
    this.openAncestors(id);
    if (id !== ROOT) {
      this.openFolderIds.add(id);
    }
    this.render();
  }
  toggleFolder(id) {
    this.openFolderIds.has(id) ? this.openFolderIds.delete(id) : this.openFolderIds.add(id);
    this.renderTree();
  }
  filter(search) {
    var needle = search.trim().toLocaleUpperCase();
    this.findAll('.ml-content .ml-item').forEach(item => {
      var _item$querySelector$t, _item$querySelector;
      var title = (_item$querySelector$t = (_item$querySelector = item.querySelector('.ml-title')) == null ? void 0 : _item$querySelector.textContent) != null ? _item$querySelector$t : '';
      item.hidden = needle !== '' && !title.toLocaleUpperCase().includes(needle);
    });
  }
  zoom() {
    var id = [...this.selectedFileIds][0];
    var file = id === undefined ? undefined : this.getFile(id);
    if (!file || !isImage(file)) {
      return;
    }
    var dialog = this.find('.ml-zoom');
    dialog.querySelector('img').src = file.url;
    dialog.showModal();
  }

  // ---- Selection / form value -----------------------------------------

  select(ids) {
    var files = ids.map(id => this.getFile(id)).filter(file => file !== undefined);
    if (files.length === 0) {
      return;
    }
    this.writeValue(files.map(file => file.id), files);
    this.dispatchEvent('select', {
      files
    });
    this.close();
  }
  inputValues() {
    return this.inputTargets.map(input => input.value).filter(value => value !== '').map(Number);
  }
  writeValue(ids, files) {
    if (files === void 0) {
      files = [];
    }
    this.writeInputs(ids);
    if (this.hasPreviewTarget) {
      this.previewTarget.innerHTML = files.map(file => previewTemplate(file, this.multipleValue, this.identifier)).join('');
    }
    this.toggleButtons();
  }

  // Single: one hidden input. Multiple: one hidden input per id (name ends with []); an empty
  // multiple field disables its input so it submits nothing ('' would be an invalid choice).
  writeInputs(ids) {
    var [first, ...extra] = this.inputTargets;
    extra.forEach(input => input.remove());
    first.value = ids.length > 0 ? String(ids[0]) : '';
    first.disabled = this.multipleValue && ids.length === 0;
    var previous = first;
    for (var id of ids.slice(1)) {
      var input = first.cloneNode();
      input.removeAttribute('id');
      input.value = String(id);
      previous.after(input);
      previous = input;
    }
    first.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  }
  toggleButtons() {
    var filled = this.inputValues().length > 0;
    this.emptyTargets.forEach(element => element.hidden = filled);
    this.filledTargets.forEach(element => element.hidden = !filled);
    if (this.hasCountTarget) {
      var count = this.inputValues().length;
      this.countTarget.textContent = count > 1 ? count + " fichiers" : '1 fichier';
    }
  }

  // ---- Context menu ----------------------------------------------------

  onContextMenu(event) {
    var target = event.target;
    if (!target.closest('.ml-content')) {
      return;
    }
    event.preventDefault();
    var folderElement = target.closest('.ml-folder');
    var fileElement = target.closest('.ml-file');
    var items;
    if (folderElement) {
      var folder = this.getFolder(Number(folderElement.dataset.folderId));
      items = [{
        label: LANG.rename,
        action: () => this.renameFolder(folder)
      }];
    } else if (fileElement) {
      var file = this.getFile(Number(fileElement.dataset.fileId));
      items = [{
        label: LANG.info,
        action: () => this.fileInfo(file)
      }, {
        label: LANG.rename,
        action: () => this.renameFile(file)
      }, ...(isCroppable(file) ? [{
        label: LANG.crop,
        action: () => this.cropFile(file)
      }] : []), {
        label: LANG.move,
        action: () => this.moveFile(file)
      }, {
        label: LANG.delete,
        action: () => this.deleteFile(file)
      }];
    } else {
      items = [{
        label: LANG.newFolder,
        action: () => this.addFolder()
      }];
    }
    openContextMenu(this.find('.ml-context-menu'), items, event.clientX, event.clientY);
  }
  closeContextMenu() {
    closeContextMenu(this.contentTarget.querySelector('.ml-context-menu'));
  }

  // ---- Actions with dialogs -------------------------------------------
  //
  // Each action dispatches an event (e.g. "golpilolz_media-library:rename-file").
  // A listener can persist the change by calling event.detail.respondWith(promise):
  // the dialog waits for it and keeps the change local only once it resolves.

  renameFile(file) {
    var _this2 = this;
    this.dialog(LANG.titleRenameFile, labelForm(file.name), [{
      label: LANG.cancel
    }, {
      label: LANG.rename,
      className: 'ml-btn-primary',
      action: function () {
        var _action = _asyncToGenerator(function* (dialog) {
          var name = readTitle(dialog);
          yield _this2.persist('rename-file', {
            file,
            name
          }, _this2.renameFileUrlValue, {
            file: file.id,
            name
          }, LANG.errorRenameFile);
          file.name = name;
          _this2.renderContent();
          _this2.alert(LANG.successRenameFile);
        });
        function action(_x) {
          return _action.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }
  renameFolder(folder) {
    var _this3 = this;
    this.dialog(LANG.titleRenameFolder, labelForm(folder.name), [{
      label: LANG.cancel
    }, {
      label: LANG.rename,
      className: 'ml-btn-primary',
      action: function () {
        var _action2 = _asyncToGenerator(function* (dialog) {
          var name = readTitle(dialog);
          yield _this3.persist('rename-folder', {
            folder,
            name
          }, _this3.renameFolderUrlValue, {
            folder: folder.id,
            name
          }, LANG.errorRenameFolder);
          folder.name = name;
          _this3.render();
          _this3.alert(LANG.successRenameFolder);
        });
        function action(_x2) {
          return _action2.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }
  addFolder() {
    var _this4 = this;
    var parent = this.activeFolderId;
    this.dialog(LANG.titleAddFolder, labelForm(), [{
      label: LANG.cancel
    }, {
      label: LANG.add,
      className: 'ml-btn-primary',
      action: function () {
        var _action3 = _asyncToGenerator(function* (dialog) {
          var _response$id, _response;
          var name = readTitle(dialog);
          var response;
          try {
            var _yield$_this4$emit, _this4$getFolder;
            response = (_yield$_this4$emit = yield _this4.emit('add-folder', {
              parent: (_this4$getFolder = _this4.getFolder(parent)) != null ? _this4$getFolder : null,
              name
            })) != null ? _yield$_this4$emit : yield _this4.createFolder(name, parent);
          } catch (error) {
            console.error(error);
            throw new Error(LANG.errorAddFolder);
          }
          // Without a backend id, use a temporary negative one.
          var id = (_response$id = (_response = response) == null ? void 0 : _response.id) != null ? _response$id : Math.min(0, ..._this4.folders.map(folder => folder.id)) - 1;
          _this4.folders.push({
            id,
            name,
            type: 'folder',
            parent,
            active: false,
            open: false,
            files: []
          });
          _this4.render();
        });
        function action(_x3) {
          return _action3.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }

  // Persist a folder with the folder_url endpoint, when no add-folder listener answered.
  createFolder(name, parent) {
    var _this5 = this;
    return _asyncToGenerator(function* () {
      if (_this5.folderUrlValue === '') {
        return undefined;
      }
      var json = yield postJson(_this5.folderUrlValue, {
        name,
        parent
      });
      if (typeof json.id !== 'number') {
        throw new Error('The folder endpoint answered without an id');
      }
      return {
        id: json.id
      };
    })();
  }
  moveFile(file) {
    var _this6 = this;
    var source = this.getFileFolder(file.id);
    var branch = parent => {
      var children = this.getChildFolders(parent).sort(byName(true));
      return children.length === 0 ? '' : "<ul>" + children.map(folder => "<li>\n                <label class=\"ml-move-folder\">\n                    <input type=\"radio\" name=\"target\" value=\"" + folder.id + "\" " + (folder.id === (source == null ? void 0 : source.id) ? 'disabled' : '') + ">\n                    <span class=\"icon-folder\"></span> " + escapeHtml(folder.name) + "\n                </label>\n                " + branch(folder.id) + "\n            </li>").join('') + "</ul>";
    };
    this.dialog(LANG.titleMoveFile, "<div class=\"ml-move-list\">" + branch(ROOT) + "</div>", [{
      label: LANG.cancel
    }, {
      label: LANG.move,
      className: 'ml-btn-primary',
      action: function () {
        var _action4 = _asyncToGenerator(function* (dialog) {
          var _target$files;
          var checked = dialog.querySelector('[name="target"]:checked');
          if (!checked) {
            throw new Error(LANG.emptyTarget);
          }
          var target = _this6.getFolder(Number(checked.value));
          yield _this6.persist('move-file', {
            file,
            folder: target
          }, _this6.moveFileUrlValue, {
            file: file.id,
            folder: target.id
          }, LANG.errorMoveFile);
          if (source) {
            source.files = source.files.filter(other => other.id !== file.id);
          }
          target.files = [...((_target$files = target.files) != null ? _target$files : []), file];
          _this6.renderContent();
          _this6.alert(LANG.successMoveFile);
        });
        function action(_x4) {
          return _action4.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }

  // Dispatch the event, then persist the change with the bundle endpoint `url` (POST JSON `body`)
  // when no listener answered. An empty url means the change only lives in the popup.
  // A listener's rejection is shown as is; an endpoint failure is logged and shown as `errorMessage`.
  persist(event, detail, url, body, errorMessage) {
    var _this7 = this;
    return _asyncToGenerator(function* () {
      var answered = false;
      yield _this7.emit(event, detail, () => answered = true);
      if (answered || url === '') {
        return;
      }
      try {
        yield postJson(url, body);
      } catch (error) {
        console.error(error);
        throw new Error(errorMessage);
      }
    })();
  }
  deleteFile(file) {
    var _this8 = this;
    this.dialog(LANG.titleDeleteFile, "<p>" + LANG.confirmDeleteFile + " <strong>" + escapeHtml(file.name) + "</strong></p>", [{
      label: LANG.cancel
    }, {
      label: LANG.delete,
      className: 'ml-btn-danger',
      action: function () {
        var _action5 = _asyncToGenerator(function* () {
          yield _this8.persist('delete-file', {
            file
          }, _this8.deleteFileUrlValue, {
            file: file.id
          }, LANG.errorDeleteFile);
          var folder = _this8.getFileFolder(file.id);
          if (folder) {
            folder.files = folder.files.filter(other => other.id !== file.id);
          }
          _this8.selectedFileIds.delete(file.id);
          _this8.renderContent();
          _this8.alert(LANG.successDeleteFile);
        });
        function action() {
          return _action5.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }

  // Show the file's details: what the popup knows right away, then what a file-info listener
  // (respondWith a promise of a partial MediaFileInfo) or the file_info endpoint answers.
  fileInfo(file) {
    var _this9 = this;
    return _asyncToGenerator(function* () {
      var path = [];
      for (var folder = _this9.getFileFolder(file.id); folder; folder = _this9.getFolder(folder.parent)) {
        path.unshift(folder.name);
      }
      var local = _extends({}, file, {
        path
      });
      _this9.dialog(LANG.titleFileInfo, infoTemplate(local, true), [{
        label: LANG.close,
        className: 'ml-btn-primary'
      }], 'ml-dialog--info');
      var dialog = _this9.find('.ml-dialog');
      // Replaced when another dialog opens in the meantime: then the answer is dropped.
      var body = dialog.querySelector('.ml-dialog-body');
      var info;
      var failed = false;
      try {
        var answered = false;
        info = yield _this9.emit('file-info', {
          file
        }, () => answered = true);
        if (!answered && _this9.fileInfoUrlValue !== '') {
          info = yield fetchFileInfo(_this9.fileInfoUrlValue, file.id);
        }
      } catch (error) {
        console.error(error);
        failed = true;
      }
      if (!body.isConnected || !dialog.open) {
        return;
      }
      // The popup's name, folder and URL stay authoritative: they include unsaved local changes.
      body.innerHTML = infoTemplate(_extends({}, local, info, {
        name: local.name,
        url: local.url,
        path: local.path
      }), false);
      if (failed) {
        var error = dialog.querySelector('.ml-dialog-error');
        error.textContent = LANG.errorFileInfo;
        error.hidden = false;
      }
    })();
  }

  // Crop an image into a new file of the same folder: the original is kept. The canvas does
  // the cropping, then the result goes to the upload endpoint, unless a crop-file listener answers.
  cropFile(file) {
    var _this10 = this;
    var cropper;
    this.dialog(LANG.titleCropFile, cropTemplate(file.url), [{
      label: LANG.cancel
    }, {
      label: LANG.crop,
      className: 'ml-btn-primary',
      action: function () {
        var _action6 = _asyncToGenerator(function* () {
          var _folder$files4;
          var rect = cropper.crop();
          if (!rect) {
            throw new Error(LANG.errorCropLoad);
          }
          var folder = _this10.getFileFolder(file.id);
          var ext = extension(file.url);
          var name = LANG.croppedName(file.name.replace(/\.[^.]+$/, ''), ext);
          var blob;
          try {
            blob = yield cropToBlob(cropper.image, rect, CROP_TYPES[ext]);
          } catch (error) {
            console.error(error);
            throw new Error(LANG.errorCropFile);
          }
          var cropped = yield _this10.saveCrop({
            file,
            folder,
            crop: rect,
            blob,
            name
          });
          folder.files = [...((_folder$files4 = folder.files) != null ? _folder$files4 : []), cropped];
          if (!_this10.multipleValue) {
            _this10.selectedFileIds.clear();
          }
          _this10.selectedFileIds.add(cropped.id);
          _this10.renderContent();
          _this10.alert(LANG.successCropFile);
        });
        function action() {
          return _action6.apply(this, arguments);
        }
        return action;
      }()
    }], 'ml-dialog--crop');
    cropper = mountCropper(this.find('.ml-dialog'));
  }

  // Store a cropped image as a new file of `detail.folder`: a crop-file listener can answer
  // with a promise of {id, name?, url}, otherwise it's POSTed to upload_url.
  saveCrop(detail) {
    var _this11 = this;
    return _asyncToGenerator(function* () {
      var answered = false;
      var response = yield _this11.emit('crop-file', detail, () => answered = true);
      if (answered) {
        var _response$name;
        if (typeof (response == null ? void 0 : response.id) !== 'number' || typeof response.url !== 'string') {
          console.error('crop-file: respondWith() must resolve with {id, url}', response);
          throw new Error(LANG.errorCropFile);
        }
        return _extends({
          size: null,
          width: null,
          height: null
        }, response, {
          id: response.id,
          name: (_response$name = response.name) != null ? _response$name : detail.name,
          url: response.url
        });
      }
      try {
        if (_this11.uploadUrlValue === '') {
          throw new Error('No upload_url and no crop-file listener');
        }
        return yield uploadFile(_this11.uploadUrlValue, detail.blob, detail.name, detail.folder.id);
      } catch (error) {
        console.error(error);
        throw new Error(LANG.errorCropFile);
      }
    })();
  }
  dialog(title, body, buttons, className) {
    if (className === void 0) {
      className = '';
    }
    openDialog(this.find('.ml-dialog'), title, body, buttons, className);
  }

  // ---- Upload (Dropzone) ----------------------------------------------

  initDropzone(session) {
    var _this12 = this;
    return _asyncToGenerator(function* () {
      var _yield$createUploadZo;
      if (_this12.uploadUrlValue === '' || _this12.dropzone) {
        return;
      }
      _this12.dropzone = (_yield$createUploadZo = yield createUploadZone({
        url: _this12.uploadUrlValue,
        element: _this12.find('.ml-content'),
        previews: _this12.find('.ml-infos'),
        currentFolder: () => _this12.activeFolderId,
        isCurrent: () => session === _this12.session && !_this12.dropzone,
        onSending: (file, folder, xhr, formData) => {
          var _this12$getFolder;
          return _this12.dispatchEvent('upload-sending', {
            file,
            folder: (_this12$getFolder = _this12.getFolder(folder)) != null ? _this12$getFolder : null,
            xhr,
            formData
          });
        },
        onUploaded: (file, parent) => {
          var folder = _this12.getFolder(parent);
          if (folder) {
            var _folder$files5;
            folder.files = [...((_folder$files5 = folder.files) != null ? _folder$files5 : []), file];
            _this12.renderContent();
          }
          _this12.alert(LANG.successUploadFile);
        },
        onError: message => _this12.alert(message, 'danger')
      })) != null ? _yield$createUploadZo : _this12.dropzone;
    })();
  }
  destroyDropzone() {
    var _this$dropzone;
    (_this$dropzone = this.dropzone) == null || _this$dropzone.destroy();
    this.dropzone = null;
  }

  // ---- Helpers ---------------------------------------------------------

  alert(message, type) {
    if (type === void 0) {
      type = 'success';
    }
    var alert = document.createElement('div');
    alert.className = "ml-alert ml-alert--" + type;
    alert.setAttribute('role', 'status');
    alert.textContent = message;
    this.find('.ml-alerts').append(alert);
    setTimeout(() => {
      alert.classList.add('out');
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  }

  // Dispatch an event a listener can answer asynchronously with event.detail.respondWith(promise).
  // onRespond is called when a listener answers, to tell it apart from a promise resolving to undefined.
  emit(name, detail, onRespond) {
    var _this13 = this;
    return _asyncToGenerator(function* () {
      var pending;
      _this13.dispatchEvent(name, _extends({}, detail, {
        respondWith: promise => {
          pending = promise;
          onRespond == null || onRespond();
        }
      }));
      return pending;
    })();
  }
  dispatchEvent(name, payload) {
    if (payload === void 0) {
      payload = {};
    }
    this.dispatch(name, {
      detail: payload,
      prefix: EVENT_PREFIX
    });
  }
  find(selector) {
    return this.contentTarget.querySelector(selector);
  }
  findAll(selector) {
    return [...this.contentTarget.querySelectorAll(selector)];
  }
}
_class.targets = ['input', 'popup', 'content', 'loader', 'preview', 'empty', 'filled', 'count'];
_class.values = {
  foldersUrl: String,
  uploadUrl: {
    type: String,
    default: ''
  },
  folderUrl: {
    type: String,
    default: ''
  },
  renameFileUrl: {
    type: String,
    default: ''
  },
  renameFolderUrl: {
    type: String,
    default: ''
  },
  moveFileUrl: {
    type: String,
    default: ''
  },
  deleteFileUrl: {
    type: String,
    default: ''
  },
  fileInfoUrl: {
    type: String,
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  }
};