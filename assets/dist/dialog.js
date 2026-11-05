function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// The popup's modal dialogs (native <dialog>, reused for every action).

import { LANG } from './lang.js';
import { escapeHtml } from './utils.js';

// Fill `dialog` and open it. A button's action may be async: it keeps the dialog open
// (and shows the error's message) when it throws, or when it returns false.
export var openDialog = function openDialog(dialog, title, body, buttons, className) {
  if (className === void 0) {
    className = '';
  }
  // No <form> here: the widget usually sits inside the page's Symfony form, where a nested
  // <form> is dropped by the HTML parser. All buttons are type="button" for the same reason.
  dialog.className = "ml-dialog " + className;
  dialog.innerHTML = "<div class=\"ml-dialog-form\">\n        <header class=\"ml-dialog-title\">" + escapeHtml(title) + "</header>\n        <div class=\"ml-dialog-body\">" + body + "</div>\n        <p class=\"ml-dialog-error\" hidden></p>\n        <footer class=\"ml-dialog-buttons\">" + buttons.map((button, index) => {
    var _button$className;
    return "<button type=\"button\" class=\"ml-btn " + ((_button$className = button.className) != null ? _button$className : '') + "\" data-index=\"" + index + "\">" + escapeHtml(button.label) + "</button>";
  }).join('') + "\n        </footer>\n    </div>";
  var error = dialog.querySelector('.ml-dialog-error');
  var run = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator(function* (button, element) {
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
    return function run(_x, _x2) {
      return _ref.apply(this, arguments);
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
};
export var labelForm = function labelForm(value) {
  if (value === void 0) {
    value = '';
  }
  return "<label class=\"ml-label\">" + LANG.label + "\n    <input type=\"text\" class=\"ml-input\" name=\"title\" value=\"" + escapeHtml(value) + "\" required autofocus>\n</label>";
};

// The trimmed value of labelForm()'s input; throws (shown in the dialog) when it's blank.
export var readTitle = dialog => {
  var title = dialog.querySelector('[name="title"]').value.trim();
  if (title === '') {
    throw new Error(LANG.emptyLabel);
  }
  return title;
};