// The hand-made right-click menu. It's position: fixed, see CLAUDE.md about transforms on ancestors.

import { escapeHtml } from './utils.js';
export var openContextMenu = (menu, items, x, y) => {
  var _menu$querySelector;
  menu.innerHTML = items.map((item, index) => "<button type=\"button\" role=\"menuitem\" class=\"ml-context-item\" data-index=\"" + index + "\">" + escapeHtml(item.label) + "</button>").join('');
  menu.querySelectorAll('.ml-context-item').forEach(button => {
    button.addEventListener('click', () => {
      closeContextMenu(menu);
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
  menu.style.left = Math.min(x, innerWidth - width - 4) + "px";
  menu.style.top = Math.min(y, innerHeight - height - 4) + "px";
  (_menu$querySelector = menu.querySelector('button')) == null || _menu$querySelector.focus();
};
export var closeContextMenu = menu => {
  if (menu) {
    menu.hidden = true;
  }
};