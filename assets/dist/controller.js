'use strict';

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _possibleConstructorReturn(self, call) { if (call && (typeof call === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
import { Controller } from '@hotwired/stimulus';
var _default = /*#__PURE__*/function (_Controller) {
  _inheritsLoose(_default, _Controller);
  var _super = _createSuper(_default);
  function _default() {
    return _super.apply(this, arguments);
  }
  var _proto = _default.prototype;
  _proto.connect = function connect() {
    var _this = this;
    this.activeFolder = 0;
    this.clear();
    this.showPopupTarget.addEventListener('click', function (event) {
      return _this.onShowPopup(event);
    });
    this.closePopupTarget.addEventListener('click', function (event) {
      return _this.onClosePopup(event);
    });
    this.dispatchEvent('connect');
  };
  _proto.clear = function clear() {
    /*this.inputTarget.value = '';
    this.inputTarget.style.display = 'block';
    this.placeholderTarget.style.display = 'block';
    this.previewTarget.style.display = 'none';
    this.previewImageTarget.style.display = 'none';
    this.previewImageTarget.style.backgroundImage = 'none';
    this.previewFilenameTarget.textContent = '';*/

    this.dispatchEvent('clear');
  };
  _proto.getChildFolder = function getChildFolder(parent) {
    var child = [];
    for (var _iterator = _createForOfIteratorHelperLoose(this.folders), _step; !(_step = _iterator()).done;) {
      var folder = _step.value;
      if (folder.parent === parent) child.push(folder);
    }
    return child;
  };
  _proto.getFiles = function getFiles(parent) {
    if (parent === 0) {
      return [];
    }
    var files = [];
    var folder = this.folders.find(function (folder) {
      return folder.id === parent;
    });
    if (folder === undefined) {
      return [];
    }
    return folder.files;
  };
  _proto.onShowPopup = function onShowPopup(event) {
    var _this2 = this;
    this.popupTarget.classList.add('show');
    var url = this.popupTarget.dataset.folderUrl;
    this.initInterface();
    fetch(url).then(function (response) {
      return response.json();
    }).then(function (data) {
      _this2.loaderTarget.style.display = 'none';
      _this2.folders = data;
      _this2.show();
    });
    this.dispatchEvent('showPopup');
  };
  _proto.onClosePopup = function onClosePopup(event) {
    this.popupTarget.classList.remove('show');
    this.dispatchEvent('closePopup');
  };
  _proto.initInterface = function initInterface() {
    for (var _iterator2 = _createForOfIteratorHelperLoose(this.constructor.elements), _step2; !(_step2 = _iterator2()).done;) {
      var element = _step2.value;
      var div = document.createElement('div');
      div.classList.add('content-div');
      for (var _iterator3 = _createForOfIteratorHelperLoose(element), _step3; !(_step3 = _iterator3()).done;) {
        var target = _step3.value;
        div.innerHTML += this.constructor.templates[target];
      }
      var contentBodies = this.popupTarget.getElementsByClassName('media-library-content');
      contentBodies.item(0).appendChild(div);
    }
  };
  _proto.show = function show() {
    this.drawTree();
    this.drawContent();
    this.dispatchEvent('show');
  };
  _proto.drawTree = function drawTree() {
    var tree = document.getElementById('tree');
    var ul = document.createElement('ul');
    for (var _iterator4 = _createForOfIteratorHelperLoose(this.folders), _step4; !(_step4 = _iterator4()).done;) {
      var folder = _step4.value;
      var li = document.createElement('li');
      li.innerHTML = "<li class=\"folder\" data-folder-id=\"" + folder.id + "\"><span class=\"icon-folder\"></span>" + folder.name + "</li>";
      ul.appendChild(li);
    }
    tree.appendChild(ul);
  };
  _proto.drawContent = function drawContent() {
    var content = document.getElementById('content');
    var folders = this.getChildFolder(this.activeFolder);
    var contentDiv = document.createElement('div');
    for (var _iterator5 = _createForOfIteratorHelperLoose(folders), _step5; !(_step5 = _iterator5()).done;) {
      var folder = _step5.value;
      var div = document.createElement('div');
      div.innerHTML = "<div class=\"folder\"><span class=\"icon-folder\"></span>" + folder.name + "</div>";
      div.setAttribute('title', folder.name);
      div.setAttribute('id', folder.id);
      contentDiv.appendChild(div);
    }
    var files = this.getFiles(this.activeFolder);
    for (var _iterator6 = _createForOfIteratorHelperLoose(files), _step6; !(_step6 = _iterator6()).done;) {
      var file = _step6.value;
      var _div = document.createElement('div');
      _div.innerHTML = "<div class=\"file\"><div data-bbl-img></div><span class=\"title\">" + file.name + "</span></div>";
      _div.setAttribute('title', file.name);
      _div.setAttribute('id', file.id);
      contentDiv.appendChild(_div);
    }
    content.appendChild(contentDiv);
  };
  _proto.dispatchEvent = function dispatchEvent(name, payload) {
    if (payload === void 0) {
      payload = {};
    }
    this.dispatch(name, {
      detail: payload,
      prefix: 'golpilolz_media-library'
    });
  };
  return _default;
}(Controller);
// static elements: Array<any> =  [['nav', 'search'], ['options'], ['tree', 'content', 'modalimg'], ['infos']]
_default.elements = [['browse', 'search'], ['options'], ['tree', 'content'], ['infos']];
_default.targets = ['select', 'showPopup', 'popup', 'closePopup', 'loader'];
_default.templates = {
  'nav': '',
  'browse': '<div id="browse" class="browse"><div class="btn-group" role="group"><button type="button" class="btn btn-default btn-sort asc active"><span class="icon-sort-alpha-asc"></span></button><button type="button" class="btn btn-default btn-sort desc"><span class="icon-sort-alpha-desc"></span></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default open-folder"><span class="icon-folder-open"></span></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default zoom-file"><span class="icon-zoom-in"></span></button></div></div>',
  'search': '<div id="search"><input type="text" class="form-control" id="search-input" placeholder="Rechercher un fichier"> </div>',
  'options': '<div id="options"></div>',
  'tree': '<div id="tree"></div>',
  'content': '<div id="content"></div>',
  'infos': '<div id="infos"></div>',
  'modalimg': '<div id="modal-zoom-img" class="modal"><img class="modal-content" id="modal-zoom-img-content"></div>',
  alert: '<div id="${Id}" class="alert alert-dismissable bbl-alert ${State}"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><p>${Content}</p></div>'
};
_default.templateFiles = {
  'default': {
    'folders': '<div class="folder"><span class="fa fa-folder"></span><span class="title" data-bbl-title></span></div>',
    'files': '<div class="file"><div data-bbl-img></div><span class="title" data-bbl-title></span></div>',
    'previewFile': '<div class="dz-preview dz-file-preview"><div class="dz-details"><img data-dz-thumbnail /><div class="dz-filename"><span data-dz-name></span></div></div><div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div></div>'
  }
};
export { _default as default };