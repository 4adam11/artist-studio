// localStorage can be unavailable (private browsing, blocked storage), so
// every read and write is wrapped and simply does nothing when it fails.
export function readStorage(key, parse) {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return parse(null);
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The value still works for this visit.
  }
}

export function parseIdList(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}
