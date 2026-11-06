const readU16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
const readU32 = (bytes, offset) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

const writeU32 = (bytes, offset, value) => {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
};

const readLength8 = (bytes, state) => {
  let value = bytes[state.offset++];
  if (value & 0x80) {
    value = ((value & 0x7f) << 8) | bytes[state.offset++];
  }
  return value;
};

const readLength16 = (bytes, state) => {
  let value = readU16(bytes, state.offset);
  state.offset += 2;
  if (value & 0x8000) {
    value = ((value & 0x7fff) << 16) | readU16(bytes, state.offset);
    state.offset += 2;
  }
  return value;
};

const writeLength8 = (target, value) => {
  if (value > 0x7f) {
    target.push(((value >> 8) & 0x7f) | 0x80);
    target.push(value & 0xff);
  } else {
    target.push(value & 0xff);
  }
};

const writeLength16 = (target, value) => {
  if (value > 0x7fff) {
    target.push((((value >> 16) & 0x7fff) | 0x8000) & 0xff);
    target.push((((value >> 16) & 0x7fff) | 0x8000) >>> 8);
    target.push(value & 0xff);
    target.push((value >>> 8) & 0xff);
  } else {
    target.push(value & 0xff);
    target.push((value >>> 8) & 0xff);
  }
};

const decodeStrings = (bytes, pool) => {
  const strings = [];
  const utf8 = (pool.flags & 0x100) !== 0;
  const decoder = new TextDecoder();
  for (let i = 0; i < pool.stringCount; i++) {
    const position = {offset: pool.offset + pool.stringsStart + readU32(bytes, pool.offset + 28 + i * 4)};
    if (utf8) {
      readLength8(bytes, position);
      const byteLength = readLength8(bytes, position);
      strings.push(decoder.decode(bytes.subarray(position.offset, position.offset + byteLength)));
    } else {
      const charLength = readLength16(bytes, position);
      let text = '';
      for (let j = 0; j < charLength; j++) {
        text += String.fromCharCode(readU16(bytes, position.offset + j * 2));
      }
      strings.push(text);
    }
  }
  return strings;
};

const parsePool = (bytes, offset) => {
  const type = readU16(bytes, offset);
  if (type !== 0x0001) {
    throw new Error('Expected string pool');
  }
  const headerSize = readU16(bytes, offset + 2);
  const size = readU32(bytes, offset + 4);
  const stringCount = readU32(bytes, offset + 8);
  const styleCount = readU32(bytes, offset + 12);
  const flags = readU32(bytes, offset + 16);
  const stringsStart = readU32(bytes, offset + 20);
  const stylesStart = readU32(bytes, offset + 24);
  const pool = {
    offset,
    headerSize,
    size,
    stringCount,
    styleCount,
    flags,
    stringsStart,
    stylesStart,
    strings: []
  };
  pool.strings = decodeStrings(bytes, pool);
  return pool;
};

const encodePool = (strings, flags, styleCount) => {
  if (styleCount) {
    throw new Error('Styled string pools are not supported');
  }
  const utf8 = (flags & 0x100) !== 0;
  const encoder = new TextEncoder();
  const data = [];
  const offsets = [];
  for (const text of strings) {
    offsets.push(data.length);
    if (utf8) {
      const encoded = encoder.encode(text);
      writeLength8(data, text.length);
      writeLength8(data, encoded.length);
      for (const byte of encoded) {
        data.push(byte);
      }
      data.push(0);
    } else {
      writeLength16(data, text.length);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        data.push(code & 0xff);
        data.push((code >>> 8) & 0xff);
      }
      data.push(0);
      data.push(0);
    }
  }
  while (data.length % 4 !== 0) {
    data.push(0);
  }
  const stringsStart = 28 + strings.length * 4;
  const total = stringsStart + data.length;
  const out = new Uint8Array(total);
  out[0] = 0x01;
  out[1] = 0x00;
  out[2] = 28;
  out[3] = 0x00;
  writeU32(out, 4, total);
  writeU32(out, 8, strings.length);
  writeU32(out, 12, 0);
  writeU32(out, 16, flags);
  writeU32(out, 20, stringsStart);
  writeU32(out, 24, 0);
  for (let i = 0; i < offsets.length; i++) {
    writeU32(out, 28 + i * 4, offsets[i]);
  }
  out.set(data, stringsStart);
  return out;
};

const replacePool = (bytes, pool, replacements) => {
  const strings = pool.strings.slice();
  for (const [index, value] of replacements) {
    strings[index] = value;
  }
  return encodePool(strings, pool.flags, pool.styleCount);
};

const splicePool = (bytes, pool, replacements, headerOffset) => {
  const newPool = replacePool(bytes, pool, replacements);
  const restStart = pool.offset + pool.size;
  const result = new Uint8Array(pool.offset + newPool.length + (bytes.length - restStart));
  result.set(bytes.subarray(0, pool.offset), 0);
  result.set(newPool, pool.offset);
  result.set(bytes.subarray(restStart), pool.offset + newPool.length);
  writeU32(result, headerOffset, result.length);
  return result;
};

const readChunks = (bytes, start, resourceMap) => {
  const chunks = [];
  let offset = start;
  while (offset + 8 <= bytes.length) {
    const type = readU16(bytes, offset);
    const headerSize = readU16(bytes, offset + 2);
    const size = readU32(bytes, offset + 4);
    if (size < 8 || offset + size > bytes.length) {
      break;
    }
    if (type === 0x0180) {
      const count = Math.floor((size - 8) / 4);
      for (let i = 0; i < count; i++) {
        resourceMap[i] = readU32(bytes, offset + 8 + i * 4);
      }
    }
    chunks.push({type, offset, headerSize, size});
    offset += size;
  }
  return chunks;
};

const applyIntAttribute = (bytes, chunk, resourceMap, resourceId, value) => {
  for (const item of chunk) {
    if (item.type !== 0x0102) {
      continue;
    }
    const elementStart = item.offset + item.headerSize;
    const attributeStart = readU16(bytes, elementStart + 8);
    const attributeSize = readU16(bytes, elementStart + 10);
    const attributeCount = readU16(bytes, elementStart + 12);
    for (let i = 0; i < attributeCount; i++) {
      const attribute = elementStart + attributeStart + i * attributeSize;
      const nameIndex = readU32(bytes, attribute + 4);
      if (resourceMap[nameIndex] === resourceId) {
        bytes[attribute + 15] = 0x10;
        writeU32(bytes, attribute + 16, value);
        return true;
      }
    }
  }
  return false;
};

const findStringAttribute = (bytes, chunks, resourceMap, resourceId) => {
  for (const item of chunks) {
    if (item.type !== 0x0102) {
      continue;
    }
    const elementStart = item.offset + item.headerSize;
    const attributeStart = readU16(bytes, elementStart + 8);
    const attributeSize = readU16(bytes, elementStart + 10);
    const attributeCount = readU16(bytes, elementStart + 12);
    for (let i = 0; i < attributeCount; i++) {
      const attribute = elementStart + attributeStart + i * attributeSize;
      const nameIndex = readU32(bytes, attribute + 4);
      if (resourceMap[nameIndex] === resourceId) {
        return readU32(bytes, attribute + 16);
      }
    }
  }
  return -1;
};

const findPackageIndex = (bytes, chunks, pool) => {
  for (const item of chunks) {
    if (item.type !== 0x0102) {
      continue;
    }
    const elementStart = item.offset + item.headerSize;
    const attributeStart = readU16(bytes, elementStart + 8);
    const attributeSize = readU16(bytes, elementStart + 10);
    const attributeCount = readU16(bytes, elementStart + 12);
    for (let i = 0; i < attributeCount; i++) {
      const attribute = elementStart + attributeStart + i * attributeSize;
      const nameIndex = readU32(bytes, attribute + 4);
      if (pool.strings[nameIndex] === 'package') {
        return readU32(bytes, attribute + 16);
      }
    }
  }
  return -1;
};

export const patchManifest = (input, options) => {
  const bytes = new Uint8Array(input);
  const pool = parsePool(bytes, 8);
  const resourceMap = {};
  const chunks = readChunks(bytes, 8 + pool.size, resourceMap);

  applyIntAttribute(bytes, chunks, resourceMap, 0x0101021b, options.versionCode);
  applyIntAttribute(bytes, chunks, resourceMap, 0x0101020c, options.minSdk);
  applyIntAttribute(bytes, chunks, resourceMap, 0x0101001e, options.orientation);

  const replacements = new Map();
  const packageIndex = findPackageIndex(bytes, chunks, pool);
  if (packageIndex >= 0) {
    replacements.set(packageIndex, options.packageName);
  }
  const versionIndex = findStringAttribute(bytes, chunks, resourceMap, 0x0101021c);
  if (versionIndex >= 0) {
    replacements.set(versionIndex, options.versionName);
  }
  return splicePool(bytes, pool, replacements, 4);
};

export const patchResources = (input, oldLabel, newLabel) => {
  const bytes = new Uint8Array(input);
  if (readU16(bytes, 0) !== 0x0002) {
    return bytes;
  }
  const pool = parsePool(bytes, 12);
  const index = pool.strings.indexOf(oldLabel);
  if (index < 0 || oldLabel === newLabel) {
    return bytes;
  }
  return splicePool(bytes, pool, new Map([[index, newLabel]]), 4);
};
