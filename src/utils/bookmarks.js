/* ── Bookmark helpers (localStorage-based) ── */

const KEY = (type) => `uhc_bookmarks_${type}`;

export function getBookmarks(type) {
  try {
    return JSON.parse(localStorage.getItem(KEY(type)) || '[]');
  } catch {
    return [];
  }
}

export function isBookmarked(type, id) {
  return getBookmarks(type).some((b) => String(b._id) === String(id));
}

export function addBookmark(type, item) {
  const existing = getBookmarks(type);
  if (existing.some((b) => String(b._id) === String(item._id))) return; // already saved
  const updated = [{ ...item, bookmarkedAt: new Date().toISOString() }, ...existing];
  localStorage.setItem(KEY(type), JSON.stringify(updated.slice(0, 100)));
}

export function removeBookmark(type, id) {
  const updated = getBookmarks(type).filter((b) => String(b._id) !== String(id));
  localStorage.setItem(KEY(type), JSON.stringify(updated));
}

export function toggleBookmark(type, item) {
  if (isBookmarked(type, item._id)) {
    removeBookmark(type, item._id);
    return false; // removed
  } else {
    addBookmark(type, item);
    return true; // added
  }
}
