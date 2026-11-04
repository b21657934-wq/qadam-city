// One icon family: 24px grid, 1.75 stroke, round caps and joins.
const P = {
  city: '<path d="M3 21h18M5 21V10l5-3v14M10 21V4l6 3v14M16 21v-9l3 1.5V21"/><path d="M13 10h.01M13 13h.01M13 16h.01"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5Z"/><path d="M12 6.5v13"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8Z"/>',
  hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  lang: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  sensor: '<path d="M12 21V11"/><circle cx="12" cy="9" r="2"/><path d="M8.2 5.2a5.5 5.5 0 0 0 0 7.6M15.8 5.2a5.5 5.5 0 0 1 0 7.6M5.4 2.6a9.5 9.5 0 0 0 0 12.8M18.6 2.6a9.5 9.5 0 0 1 0 12.8"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><path d="M16.75 14v6M13.75 17h6"/>',
  game: '<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/>',
  traffic: '<rect x="8" y="2.5" width="8" height="15" rx="4"/><circle cx="12" cy="6.5" r="1.3"/><circle cx="12" cy="10" r="1.3"/><circle cx="12" cy="13.5" r="1.3"/><path d="M12 17.5v4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
  bus: '<rect x="4.5" y="3.5" width="15" height="14" rx="3"/><path d="M4.5 11h15M7.5 20.5v-3M16.5 20.5v-3"/><path d="M8.5 14.3h.01M15.5 14.3h.01"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z"/>',
  chat: '<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12Z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  menu: '<path d="M5 8h14M5 16h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  play: '<path d="M8 5.5v13l10.5-6.5Z"/>',
  orbit: '<ellipse cx="12" cy="12" rx="9" ry="4"/><circle cx="12" cy="12" r="2.5"/>',
};
export function icon(name, cls = '') {
  if (name === 'starf') return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8Z"/></svg>`;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
