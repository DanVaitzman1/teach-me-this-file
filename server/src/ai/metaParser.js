// The tutor writes its message, then a machine-readable line:
//   <<<META {"stepComplete": true, "sourceIds": ["p2"]}>>>
// The message is streamed to the student as it arrives; the META part must not
// be. A chunk can end in the middle of the marker ("...great job! <<<ME"), so
// any tail that could still become the marker is held back until we know.
const MARKER = '<<<META';

export function createMetaParser() {
  let held = '';
  let metaText = null;

  return {
    // Returns the part of the chunk that is safe to show.
    push(chunk) {
      if (metaText !== null) {
        metaText += chunk;
        return '';
      }
      held += chunk;
      const markerAt = held.indexOf(MARKER);
      if (markerAt !== -1) {
        const visible = held.slice(0, markerAt);
        metaText = held.slice(markerAt + MARKER.length);
        held = '';
        return visible;
      }
      const keep = longestMarkerPrefixAtEnd(held);
      const visible = held.slice(0, held.length - keep);
      held = held.slice(held.length - keep);
      return visible;
    },

    // At the end of the stream: the rest of the visible text and the parsed
    // meta object, or null when the model left it out or wrote invalid JSON.
    finish() {
      if (metaText === null) return { text: held, meta: null };
      const json = metaText.trim().replace(/>{1,3}$/, '');
      try {
        return { text: '', meta: JSON.parse(json) };
      } catch {
        return { text: '', meta: null };
      }
    },
  };
}

function longestMarkerPrefixAtEnd(text) {
  for (let length = Math.min(MARKER.length - 1, text.length); length > 0; length--) {
    if (MARKER.startsWith(text.slice(-length))) return length;
  }
  return 0;
}
