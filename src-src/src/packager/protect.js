const nextState = (state) => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
};

const hashString = (value) => {
  const key = new Uint32Array(4);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
    const index = i & 3;
    key[index] = (key[index] ^ h) >>> 0;
  }
  for (let i = 0; i < 8; i++) {
    h = nextState(h || 0x6d2b79f5);
    key[i & 3] = (key[i & 3] ^ h) >>> 0;
  }
  return key;
};

export const makeKey = (customKey) => {
  if (customKey && customKey.length) {
    return hashString(customKey);
  }
  const key = new Uint32Array(4);
  const source = new Uint32Array(4);
  crypto.getRandomValues(source);
  for (let i = 0; i < 4; i++) {
    key[i] = source[i] >>> 0;
  }
  if (!key[0] && !key[1] && !key[2] && !key[3]) {
    key[0] = 0x6d2b79f5;
  }
  return key;
};

export const cryptBytes = (bytes, key, chunkIndex) => {
  let state = (key[0] ^ Math.imul(chunkIndex + 1, 0x9e3779b1)) >>> 0;
  if (!state) {
    state = 0x6d2b79f5;
  }
  const words = bytes.length >>> 2;
  const view = new DataView(bytes.buffer, bytes.byteOffset, words * 4);
  for (let i = 0; i < words; i++) {
    state = nextState(state);
    view.setUint32(i * 4, view.getUint32(i * 4, true) ^ state, true);
  }
  if (bytes.length > words * 4) {
    state = nextState(state);
    for (let i = words * 4; i < bytes.length; i++) {
      bytes[i] ^= state & 0xff;
      state >>>= 8;
    }
  }
  return bytes;
};

export const encryptProject = (projectData, key) => {
  const bytes = new Uint8Array(projectData);
  return cryptBytes(bytes, key, 0);
};
