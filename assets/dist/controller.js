'use strict';

function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
import { Controller } from '@hotwired/stimulus';
var ROOT = 0;
var EVENT_PREFIX = 'golpilolz_media-library';
var IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp'];
var ICONS = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'odt', 'rtf'],
  xls: ['xls', 'xlsx', 'ods', 'csv'],
  zip: ['zip', 'rar', '7z', 'gz', 'tar']
};
var LANG = {
  title: 'Médiathèque',
  root: 'Accueil',
  select: 'Sélectionner',
  emptyFolder: 'Ce dossier est vide',
  emptyFolderUpload: 'Glissez des fichiers ici pour les ajouter.',
  noSelection: 'Aucun fichier sélectionné',
  oneSelected: '1 fichier sélectionné',
  manySelected: count => count + " fichiers s\xE9lectionn\xE9s",
  search: 'Rechercher un fichier',
  sortAsc: 'Trier de A à Z',
  sortDesc: 'Trier de Z à A',
  openFolder: 'Ouvrir le dossier',
  zoom: 'Agrandir',
  validate: 'Valider la sélection',
  label: 'Libellé',
  cancel: 'Annuler',
  rename: 'Renommer',
  move: 'Déplacer',
  delete: 'Supprimer',
  remove: 'Retirer',
  add: 'Ajouter',
  newFolder: 'Nouveau dossier',
  titleRenameFile: 'Renommer le fichier',
  titleRenameFolder: 'Renommer le dossier',
  titleAddFolder: 'Ajouter un dossier',
  titleMoveFile: 'Déplacer le fichier',
  titleDeleteFile: 'Supprimer le fichier ?',
  confirmDeleteFile: 'Êtes-vous sûr de vouloir supprimer le fichier :',
  emptyLabel: 'Veuillez entrer un libellé',
  emptyTarget: 'Veuillez choisir un dossier',
  errorAddFolder: 'Erreur lors de la création du dossier',
  errorAction: 'Une erreur est survenue',
  errorUpload: "Erreur lors de l'envoi du fichier",
  errorUploadRoot: 'Ouvrez un dossier pour y déposer des fichiers',
  successRenameFile: 'Le fichier a bien été renommé',
  successRenameFolder: 'Le dossier a bien été renommé',
  successUploadFile: 'Le fichier a bien été envoyé',
  successMoveFile: 'Le fichier a bien été déplacé',
  successDeleteFile: 'Le fichier a bien été supprimé'
};
var escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
var extension = url => {
  var path = url.split(/[?#]/)[0];
  var dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
};
var isImage = file => IMAGE_EXTENSIONS.includes(extension(file.url));
var iconFor = file => {
  var ext = extension(file.url);
  for (var [icon, extensions] of Object.entries(ICONS)) {
    if (extensions.includes(ext)) {
      return icon;
    }
  }
  return 'txt';
};
var byName = asc => (a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name, undefined, {
  sensitivity: 'base',
  numeric: true
});
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
        _this.contentTarget.innerHTML = _this.layoutTemplate();
        _this.bindEvents();
        _this.rendered = true;
      }
      var folders = null;
      try {
        folders = yield _this.fetchFolders();
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

  fetchFolders() {
    var _this2 = this;
    return _asyncToGenerator(function* () {
      var response = yield fetch(_this2.foldersUrlValue, {
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
      }
      return response.json();
    })();
  }
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

  layoutTemplate() {
    var searchIcon = '<svg class="ml-search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    return "\n            <header class=\"ml-header\">\n                <h2 class=\"ml-heading\">" + LANG.title + "</h2>\n            </header>\n            <div class=\"ml-toolbar\">\n                <nav class=\"ml-breadcrumb\" aria-label=\"Chemin\"></nav>\n                <div class=\"ml-toolbar-actions\">\n                    <div class=\"ml-segmented\" role=\"group\" aria-label=\"Tri\">\n                        <button type=\"button\" class=\"ml-segment active\" data-ml-action=\"sort-asc\" title=\"" + LANG.sortAsc + "\" aria-label=\"" + LANG.sortAsc + "\"><span class=\"icon-sort-alpha-asc\"></span></button>\n                        <button type=\"button\" class=\"ml-segment\" data-ml-action=\"sort-desc\" title=\"" + LANG.sortDesc + "\" aria-label=\"" + LANG.sortDesc + "\"><span class=\"icon-sort-alpha-desc\"></span></button>\n                    </div>\n                    <button type=\"button\" class=\"ml-icon-btn\" data-ml-action=\"open-folder\" title=\"" + LANG.openFolder + "\" aria-label=\"" + LANG.openFolder + "\"><span class=\"icon-folder-open\"></span></button>\n                    <button type=\"button\" class=\"ml-icon-btn\" data-ml-action=\"zoom\" title=\"" + LANG.zoom + "\" aria-label=\"" + LANG.zoom + "\"><span class=\"icon-zoom-in\"></span></button>\n                    <label class=\"ml-search-field\">" + searchIcon + "\n                        <input type=\"search\" class=\"ml-search\" placeholder=\"" + LANG.search + "\" aria-label=\"" + LANG.search + "\">\n                    </label>\n                </div>\n            </div>\n            <div class=\"ml-body\">\n                <nav class=\"ml-tree\" aria-label=\"Dossiers\"></nav>\n                <div class=\"ml-content\" tabindex=\"-1\"></div>\n            </div>\n            <div class=\"ml-infos\"></div>\n            <footer class=\"ml-footer\">\n                <span class=\"ml-status\" aria-live=\"polite\"></span>\n                <div class=\"ml-footer-actions\">\n                    <button type=\"button\" class=\"ml-btn\" data-ml-action=\"cancel\">" + LANG.cancel + "</button>\n                    <button type=\"button\" class=\"ml-btn ml-btn-primary\" data-ml-action=\"validate\" disabled>" + LANG.select + "</button>\n                </div>\n            </footer>\n            <div class=\"ml-alerts\" aria-live=\"polite\"></div>\n            <div class=\"ml-context-menu\" role=\"menu\" hidden></div>\n            <dialog class=\"ml-zoom\"><img alt=\"\"></dialog>\n            <dialog class=\"ml-dialog\"></dialog>";
  }
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
    content.innerHTML = folders.map(folder => "\n            <div class=\"ml-item ml-folder\" data-folder-id=\"" + folder.id + "\" title=\"" + escapeHtml(folder.name) + "\">\n                <div class=\"ml-thumb ml-thumb--folder\"><span class=\"icon-folder\" aria-hidden=\"true\"></span></div>\n                <span class=\"ml-title\">" + escapeHtml(folder.name) + "</span>\n            </div>").join('') + files.map(file => "\n            <div class=\"ml-item ml-file " + (this.selectedFileIds.has(file.id) ? 'active' : '') + "\" data-file-id=\"" + file.id + "\" title=\"" + escapeHtml(file.name) + "\">\n                <div class=\"ml-thumb ml-thumb--" + (isImage(file) ? 'picture' : iconFor(file)) + "\">\n                    " + (isImage(file) ? "<img src=\"" + escapeHtml(file.url) + "\" alt=\"\" loading=\"lazy\">" : '') + "\n                </div>\n                <span class=\"ml-title\">" + escapeHtml(file.name) + "</span>\n            </div>").join('');
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
      this.previewTarget.innerHTML = files.map(file => this.previewTemplate(file)).join('');
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

  // Keep in sync with the widget template.
  previewTemplate(file) {
    var name = escapeHtml(file.name);
    return "<div class=\"ml-preview-item\" title=\"" + name + "\">\n            <span class=\"ml-preview-thumb ml-thumb--" + (isImage(file) ? 'picture' : iconFor(file)) + "\">" + (isImage(file) ? "<img src=\"" + escapeHtml(file.url) + "\" alt=\"\" loading=\"lazy\">" : '') + "</span>\n            <span class=\"ml-preview-name\">" + name + "</span>\n            " + (this.multipleValue ? "<button type=\"button\" class=\"ml-preview-remove\" data-action=\"" + this.identifier + "#remove\" data-" + this.identifier + "-id-param=\"" + file.id + "\" aria-label=\"" + LANG.remove + " " + name + "\" title=\"" + LANG.remove + "\">\n                <svg viewBox=\"0 0 12 12\" width=\"10\" height=\"10\" aria-hidden=\"true\"><path d=\"M2 2l8 8M10 2l-8 8\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\"/></svg>\n            </button>" : '') + "\n        </div>";
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
    var _menu$querySelector;
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
        label: LANG.rename,
        action: () => this.renameFile(file)
      }, {
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
    var menu = this.find('.ml-context-menu');
    menu.innerHTML = items.map((item, index) => "<button type=\"button\" role=\"menuitem\" class=\"ml-context-item\" data-index=\"" + index + "\">" + escapeHtml(item.label) + "</button>").join('');
    menu.querySelectorAll('.ml-context-item').forEach(button => {
      button.addEventListener('click', () => {
        this.closeContextMenu();
        items[Number(button.dataset.index)].action();
      });
    });
    menu.hidden = false;

    // Keep the menu inside the viewport.
    var {
      innerWidth,
      innerHeight
    } = window;
    var {
      width,
      height
    } = menu.getBoundingClientRect();
    menu.style.left = Math.min(event.clientX, innerWidth - width - 4) + "px";
    menu.style.top = Math.min(event.clientY, innerHeight - height - 4) + "px";
    (_menu$querySelector = menu.querySelector('button')) == null || _menu$querySelector.focus();
  }
  closeContextMenu() {
    var menu = this.contentTarget.querySelector('.ml-context-menu');
    if (menu) {
      menu.hidden = true;
    }
  }

  // ---- Actions with dialogs -------------------------------------------
  //
  // Each action dispatches an event (e.g. "golpilolz_media-library:rename-file").
  // A listener can persist the change by calling event.detail.respondWith(promise):
  // the dialog waits for it and keeps the change local only once it resolves.

  labelForm(value) {
    if (value === void 0) {
      value = '';
    }
    return "<label class=\"ml-label\">" + LANG.label + "\n            <input type=\"text\" class=\"ml-input\" name=\"title\" value=\"" + escapeHtml(value) + "\" required autofocus>\n        </label>";
  }
  readTitle(dialog) {
    var title = dialog.querySelector('[name="title"]').value.trim();
    if (title === '') {
      throw new Error(LANG.emptyLabel);
    }
    return title;
  }
  renameFile(file) {
    var _this3 = this;
    this.dialog(LANG.titleRenameFile, this.labelForm(file.name), [{
      label: LANG.cancel
    }, {
      label: LANG.rename,
      className: 'ml-btn-primary',
      action: function () {
        var _action = _asyncToGenerator(function* (dialog) {
          var name = _this3.readTitle(dialog);
          yield _this3.emit('rename-file', {
            file,
            name
          });
          file.name = name;
          _this3.renderContent();
          _this3.alert(LANG.successRenameFile);
        });
        function action(_x) {
          return _action.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }
  renameFolder(folder) {
    var _this4 = this;
    this.dialog(LANG.titleRenameFolder, this.labelForm(folder.name), [{
      label: LANG.cancel
    }, {
      label: LANG.rename,
      className: 'ml-btn-primary',
      action: function () {
        var _action2 = _asyncToGenerator(function* (dialog) {
          var name = _this4.readTitle(dialog);
          yield _this4.emit('rename-folder', {
            folder,
            name
          });
          folder.name = name;
          _this4.render();
          _this4.alert(LANG.successRenameFolder);
        });
        function action(_x2) {
          return _action2.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }
  addFolder() {
    var _this5 = this;
    var parent = this.activeFolderId;
    this.dialog(LANG.titleAddFolder, this.labelForm(), [{
      label: LANG.cancel
    }, {
      label: LANG.add,
      className: 'ml-btn-primary',
      action: function () {
        var _action3 = _asyncToGenerator(function* (dialog) {
          var _response$id, _response;
          var name = _this5.readTitle(dialog);
          var response;
          try {
            var _this5$getFolder;
            response = yield _this5.emit('add-folder', {
              parent: (_this5$getFolder = _this5.getFolder(parent)) != null ? _this5$getFolder : null,
              name
            });
          } catch (error) {
            console.error(error);
            throw new Error(LANG.errorAddFolder);
          }
          // Without a backend id, use a temporary negative one.
          var id = (_response$id = (_response = response) == null ? void 0 : _response.id) != null ? _response$id : Math.min(0, ..._this5.folders.map(folder => folder.id)) - 1;
          _this5.folders.push({
            id,
            name,
            type: 'folder',
            parent,
            active: false,
            open: false,
            files: []
          });
          _this5.render();
        });
        function action(_x3) {
          return _action3.apply(this, arguments);
        }
        return action;
      }()
    }]);
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
          yield _this6.emit('move-file', {
            file,
            folder: target
          });
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
  deleteFile(file) {
    var _this7 = this;
    this.dialog(LANG.titleDeleteFile, "<p>" + LANG.confirmDeleteFile + " <strong>" + escapeHtml(file.name) + "</strong></p>", [{
      label: LANG.cancel
    }, {
      label: LANG.delete,
      className: 'ml-btn-danger',
      action: function () {
        var _action5 = _asyncToGenerator(function* () {
          yield _this7.emit('delete-file', {
            file
          });
          var folder = _this7.getFileFolder(file.id);
          if (folder) {
            folder.files = folder.files.filter(other => other.id !== file.id);
          }
          _this7.selectedFileIds.delete(file.id);
          _this7.renderContent();
          _this7.alert(LANG.successDeleteFile);
        });
        function action() {
          return _action5.apply(this, arguments);
        }
        return action;
      }()
    }]);
  }
  dialog(title, body, buttons) {
    // No <form> here: the widget usually sits inside the page's Symfony form, where a nested
    // <form> is dropped by the HTML parser. All buttons are type="button" for the same reason.
    var dialog = this.find('.ml-dialog');
    dialog.innerHTML = "<div class=\"ml-dialog-form\">\n            <header class=\"ml-dialog-title\">" + escapeHtml(title) + "</header>\n            <div class=\"ml-dialog-body\">" + body + "</div>\n            <p class=\"ml-dialog-error\" hidden></p>\n            <footer class=\"ml-dialog-buttons\">" + buttons.map((button, index) => {
      var _button$className;
      return "<button type=\"button\" class=\"ml-btn " + ((_button$className = button.className) != null ? _button$className : '') + "\" data-index=\"" + index + "\">" + escapeHtml(button.label) + "</button>";
    }).join('') + "\n            </footer>\n        </div>";
    var error = dialog.querySelector('.ml-dialog-error');
    var run = /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(function* (button, element) {
        error.hidden = true;
        element.disabled = true;
        try {
          if (button.action && (yield button.action(dialog)) === false) {
            return;
          }
          dialog.close();
        } catch (e) {
          error.textContent = e instanceof Error ? e.message : LANG.errorAction;
          error.hidden = false;
        } finally {
          element.disabled = false;
        }
      });
      return function run(_x5, _x6) {
        return _ref2.apply(this, arguments);
      };
    }();
    var elements = [...dialog.querySelectorAll('.ml-dialog-buttons button')];
    elements.forEach(element => {
      element.addEventListener('click', () => run(buttons[Number(element.dataset.index)], element));
    });
    // Enter in an input triggers the last (primary) button.
    dialog.querySelector('.ml-dialog-body').addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input')) {
        event.preventDefault();
        var primary = elements[elements.length - 1];
        if (!primary.disabled) {
          run(buttons[buttons.length - 1], primary);
        }
      }
    });
    dialog.showModal();
  }

  // ---- Upload (Dropzone) ----------------------------------------------

  initDropzone(session) {
    var _this8 = this;
    return _asyncToGenerator(function* () {
      if (_this8.uploadUrlValue === '' || _this8.dropzone) {
        return;
      }
      var {
        default: Dropzone
      } = yield import('dropzone');
      if (session !== _this8.session || _this8.dropzone) {
        return;
      }
      var targetFolderId = _this8.activeFolderId;
      var dropzone = new Dropzone(_this8.find('.ml-content'), {
        url: _this8.uploadUrlValue,
        previewsContainer: _this8.find('.ml-infos'),
        clickable: false,
        // Files belong to a folder: the root has none to store them in.
        accept: (file, done) => done(targetFolderId === ROOT ? LANG.errorUploadRoot : undefined),
        resizeWidth: 1920,
        previewTemplate: "<div class=\"dz-preview dz-file-preview\">\n                <div class=\"dz-details\"><img data-dz-thumbnail alt=\"\"><span class=\"dz-filename\" data-dz-name></span></div>\n                <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n            </div>"
      });
      dropzone.on('drop', event => {
        var folder = event.target.closest('.ml-folder');
        targetFolderId = folder ? Number(folder.dataset.folderId) : _this8.activeFolderId;
      });
      dropzone.on('sending', (file, xhr, formData) => {
        var _this8$getFolder;
        formData.append('folder', String(targetFolderId));
        _this8.dispatchEvent('upload-sending', {
          file,
          folder: (_this8$getFolder = _this8.getFolder(targetFolderId)) != null ? _this8$getFolder : null,
          xhr,
          formData
        });
      });
      dropzone.on('success', (file, json) => {
        if ((json == null ? void 0 : json.result) !== 'success') {
          console.error(json);
          _this8.alert(LANG.errorUpload, 'danger');
          return;
        }
        var folder = _this8.getFolder(json.file.parent);
        if (folder) {
          var _folder$files4;
          folder.files = [...((_folder$files4 = folder.files) != null ? _folder$files4 : []), {
            id: json.file.id,
            name: json.file.name,
            url: json.file.url
          }];
          _this8.renderContent();
        }
        _this8.alert(LANG.successUploadFile);
      });
      dropzone.on('error', (file, message) => {
        console.error(message);
        _this8.alert(message === LANG.errorUploadRoot ? LANG.errorUploadRoot : LANG.errorUpload, 'danger');
      });
      dropzone.on('complete', file => {
        var _file$previewElement;
        return (_file$previewElement = file.previewElement) == null ? void 0 : _file$previewElement.remove();
      });
      _this8.dropzone = dropzone;
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
  emit(name, detail) {
    var _this9 = this;
    return _asyncToGenerator(function* () {
      var pending;
      _this9.dispatchEvent(name, _extends({}, detail, {
        respondWith: promise => {
          pending = promise;
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
  multiple: {
    type: Boolean,
    default: false
  }
};