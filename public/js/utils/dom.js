export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, val);
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  }
  return el;
}

export function show(el) {
  if (typeof el === 'string') el = $(el);
  if (el) {
    el.classList.add('is-visible');
    el.classList.remove('is-hidden');
  }
}

export function hide(el) {
  if (typeof el === 'string') el = $(el);
  if (el) {
    el.classList.add('is-hidden');
    el.classList.remove('is-visible');
  }
}
