function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
// The crop dialog: geometry helpers, markup, pointer/keyboard interaction and canvas export.

import { LANG } from './lang.js';
import { clamp, escapeHtml, extension } from './utils.js';

// Images a canvas can re-encode, and the MIME type it writes them in.
export var CROP_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};
var CROP_RATIOS = [['Libre', null], ['1:1', 1], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9]];
var CROP_HANDLES = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
export var isCroppable = file => extension(file.url) in CROP_TYPES;

// Resize `start` (image pixels) by dragging `handle` (n, se, w…) by dx/dy, within a W×H image.
// With a ratio, the side opposite the handle stays put (or the center, for an edge handle).
export var resizeCrop = (start, handle, dx, dy, ratio, W, H, min) => {
  var h = handle.includes('w') ? 'w' : handle.includes('e') ? 'e' : null;
  var v = handle.includes('n') ? 'n' : handle.includes('s') ? 's' : null;
  // Anchor: the opposite edge, or the center on the axis the handle doesn't drag.
  var ax = h === 'w' ? start.x + start.width : h === 'e' ? start.x : start.x + start.width / 2;
  var ay = v === 'n' ? start.y + start.height : v === 's' ? start.y : start.y + start.height / 2;
  var maxWidth = h === 'w' ? ax : h === 'e' ? W - ax : 2 * Math.min(ax, W - ax);
  var maxHeight = v === 'n' ? ay : v === 's' ? H - ay : 2 * Math.min(ay, H - ay);
  var width = h === 'w' ? start.width - dx : h === 'e' ? start.width + dx : start.width;
  var height = v === 'n' ? start.height - dy : v === 's' ? start.height + dy : start.height;
  if (ratio) {
    if (h === null) {
      width = height * ratio;
    }
    width = clamp(width, Math.max(min, min * ratio), Math.min(maxWidth, maxHeight * ratio));
    height = width / ratio;
  } else {
    width = h === null ? start.width : clamp(width, min, maxWidth);
    height = v === null ? start.height : clamp(height, min, maxHeight);
  }
  return {
    x: h === 'w' ? ax - width : h === 'e' ? ax : ax - width / 2,
    y: v === 'n' ? ay - height : v === 's' ? ay : ay - height / 2,
    width,
    height
  };
};

// Largest crop of `ratio` (whole image when null) centered in a W×H image.
export var fitCrop = (ratio, W, H) => {
  var width = W;
  var height = H;
  if (ratio) {
    W / H > ratio ? width = H * ratio : height = W / ratio;
  }
  return {
    x: (W - width) / 2,
    y: (H - height) / 2,
    width,
    height
  };
};
export var cropTemplate = url => "<div class=\"ml-crop-toolbar\">\n        <div class=\"ml-segmented\" role=\"group\" aria-label=\"" + LANG.cropRatio + "\">" + CROP_RATIOS.map((_ref, index) => {
  var [label] = _ref;
  return "<button type=\"button\" class=\"ml-segment " + (index === 0 ? 'active' : '') + "\" data-ratio=\"" + index + "\">" + label + "</button>";
}).join('') + "</div>\n        <span class=\"ml-crop-size\" aria-live=\"polite\"></span>\n    </div>\n    <div class=\"ml-crop-area\">\n        <div class=\"ml-crop-stage\">\n            <img src=\"" + escapeHtml(url) + "\" alt=\"\" draggable=\"false\">\n            <div class=\"ml-crop-box\" tabindex=\"0\" aria-label=\"" + LANG.cropArea + "\" hidden>" + CROP_HANDLES.map(handle => "<span class=\"ml-crop-handle ml-crop-handle--" + handle + "\" data-handle=\"" + handle + "\"></span>").join('') + "</div>\n        </div>\n    </div>";
// Wire the cropTemplate() markup of an open dialog. Listeners live on the dialog's content,
// which the next dialog replaces; the ResizeObserver is disconnected when the dialog closes.
export var mountCropper = dialog => {
  var crop = null;
  var ratio = null;
  var stage = dialog.querySelector('.ml-crop-stage');
  var img = stage.querySelector('img');
  var box = stage.querySelector('.ml-crop-box');
  var size = dialog.querySelector('.ml-crop-size');
  var W = () => img.naturalWidth;
  var H = () => img.naturalHeight;
  // Image pixels per CSS pixel on screen.
  var pixelRatio = () => W() / img.getBoundingClientRect().width;
  var draw = () => {
    if (!crop) {
      return;
    }
    var scale = img.clientWidth / W();
    box.style.left = crop.x * scale + "px";
    box.style.top = crop.y * scale + "px";
    box.style.width = crop.width * scale + "px";
    box.style.height = crop.height * scale + "px";
    size.textContent = Math.round(crop.width) + " \xD7 " + Math.round(crop.height) + " px";
  };
  var init = () => {
    crop = fitCrop(ratio, W(), H());
    box.hidden = false;
    draw();
  };
  if (img.complete && img.naturalWidth > 0) {
    init();
  } else {
    img.addEventListener('load', init, {
      once: true
    });
    img.addEventListener('error', () => {
      var error = dialog.querySelector('.ml-dialog-error');
      error.textContent = LANG.errorCropLoad;
      error.hidden = false;
    }, {
      once: true
    });
  }
  var observer = new ResizeObserver(draw);
  observer.observe(img);
  dialog.addEventListener('close', () => observer.disconnect(), {
    once: true
  });
  dialog.querySelectorAll('[data-ratio]').forEach(button => button.addEventListener('click', () => {
    dialog.querySelectorAll('[data-ratio]').forEach(other => other.classList.toggle('active', other === button));
    ratio = CROP_RATIOS[Number(button.dataset.ratio)][1];
    if (crop) {
      crop = fitCrop(ratio, W(), H());
      draw();
    }
  }));

  // Drag a handle to resize, inside the box to move it, elsewhere on the image to draw a new one.
  stage.addEventListener('pointerdown', event => {
    var _target$dataset$handl;
    if (!crop || event.button !== 0) {
      return;
    }
    event.preventDefault();
    var target = event.target;
    var handle = (_target$dataset$handl = target.dataset.handle) != null ? _target$dataset$handl : target.closest('.ml-crop-box') ? 'move' : 'new';
    var bounds = img.getBoundingClientRect();
    var k = pixelRatio();
    var point = e => ({
      x: clamp((e.clientX - bounds.left) * k, 0, W()),
      y: clamp((e.clientY - bounds.top) * k, 0, H())
    });
    var origin = point(event);
    var start = _extends({}, crop);
    var min = Math.min(16 * k, W(), H());
    box.focus({
      preventScroll: true
    });
    var move = e => {
      var current = point(e);
      var dx = current.x - origin.x;
      var dy = current.y - origin.y;
      if (handle === 'move') {
        crop = _extends({}, start, {
          x: clamp(start.x + dx, 0, W() - start.width),
          y: clamp(start.y + dy, 0, H() - start.height)
        });
      } else if (handle === 'new') {
        var width = Math.abs(dx);
        var height = Math.abs(dy);
        if (ratio) {
          width / height > ratio ? width = height * ratio : height = width / ratio;
        }
        crop = {
          x: dx < 0 ? origin.x - width : origin.x,
          y: dy < 0 ? origin.y - height : origin.y,
          width,
          height
        };
      } else {
        crop = resizeCrop(start, handle, dx, dy, ratio, W(), H(), min);
      }
      draw();
    };
    var end = () => {
      // A click (or a tiny drag) on the image keeps the previous box.
      if (handle === 'new' && (crop.width < min || crop.height < min)) {
        crop = start;
        draw();
      }
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', end);
      stage.removeEventListener('pointercancel', end);
    };
    stage.setPointerCapture(event.pointerId);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
  });

  // Arrow keys move the box (Shift: 10 times faster).
  box.addEventListener('keydown', event => {
    var step = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    }[event.key];
    if (!crop || !step) {
      return;
    }
    event.preventDefault();
    var distance = (event.shiftKey ? 10 : 1) * pixelRatio();
    crop = _extends({}, crop, {
      x: clamp(crop.x + step[0] * distance, 0, W() - crop.width),
      y: clamp(crop.y + step[1] * distance, 0, H() - crop.height)
    });
    draw();
  });
  return {
    image: img,
    crop: function (_crop) {
      function crop() {
        return _crop.apply(this, arguments);
      }
      crop.toString = function () {
        return _crop.toString();
      };
      return crop;
    }(() => crop && {
      x: Math.round(crop.x),
      y: Math.round(crop.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height)
    })
  };
};

// Throws a SecurityError for a cross-origin image served without CORS headers.
export var cropToBlob = (img, rect, type) => new Promise((resolve, reject) => {
  var canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.getContext('2d').drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  canvas.toBlob(result => result ? resolve(result) : reject(new Error('Empty canvas')), type, .92);
});