'use strict';

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
  _proto.onShowPopup = function onShowPopup(event) {
    var _this2 = this;
    this.popupTarget.classList.add('show');
    var url = this.popupTarget.dataset.folderUrl;
    console.log(url);
    fetch(url).then(function (response) {
      return response.json();
    }).then(function (data) {
      _this2.loaderTarget.style.display = 'none';
      _this2.folders = data;
      console.log(_this2.folders);
    });
    this.dispatchEvent('showPopup');
  };
  _proto.onClosePopup = function onClosePopup(event) {
    this.popupTarget.classList.remove('show');
    this.dispatchEvent('closePopup');
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
/*declare readonly previewImageTarget: HTMLDivElement*/
_default.targets = ['select', 'showPopup', 'popup', 'closePopup', 'loader'];
export { _default as default };