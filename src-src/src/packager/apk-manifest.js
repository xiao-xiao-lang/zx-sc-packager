const readU16 = (view, offset) => view.getUint16(offset, true);
const readU32 = (view, offset) => view.getUint32(offset, true);

const writeU16 = (bytes, offset, value) => {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(offset, value, true);
};

const writeU32 = (bytes, offset, value) => {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true);
};

const decodeStringPool = (bytes, chunkOffset, chunkSize) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stringCount = readU32(view, chunkOffset + 8);
  const flags = readU32(view, chunkOffset + 16);
  const stringsStart = readU32(view, chunkOffset + 20);
  const isUtf8 = (flags & 0x100) !== 0;
  const strings = [];
  const offsetsOffset = chunkOffset + 28;
  for (let i = 0; i < stringCount; i++) {
    const relative = readU32(view, offsetsOffset + i * 4);
    let position = chunkOffset + stringsStart + relative;
    if (isUtf8) {
      let length = bytes[position++];
      if (length & 0x80) {
        length = ((length & 0x7f) << 8) | bytes[position++];
      }
      let byteLength = bytes[position++];
      if (byteLength & 0x80) {
        byteLength = ((byteLength & 0x7f) << 8) | bytes[position++];
      }
      strings.push(new TextDecoder().decode(bytes.subarray(position, position + byteLength)));
    } else {
      const length = readU16(view, position);
      position += 2;
      let text = '';
      for (let j = 0; j < length; j++) {
        text += String.fromCharCode(readU16(view, position + j * 2));
      }
      strings.push(text);
    }
  }
  return {
    strings,
    isUtf8
  };
};

const encodeStringPool = (strings, isUtf8) => {
  const headerSize = 28;
  const stringCount = strings.length;
  const offsets = new Uint8Array(stringCount * 4);
  const dataParts = [];
  let dataLength = 0;
  for (let i = 0; i < stringCount; i++) {
    writeU32(offsets, i * 4, dataLength);
    const value = strings[i];
    if (isUtf8) {
      const encoded = new TextEncoder().encode(value);
      const head = new Uint8Array(2);
      writeU16(head, 0, value.length);
      const body = new Uint8Array(encoded.length + 1);
      body.set(encoded);
      const bytes = new Uint8Array(head.length + body.length);
      bytes.set(head);
      bytes.set(body, head.length);
      dataParts.push(bytes);
      dataLength += bytes.length;
    } else {
      const bytes = new Uint8Array(2 + value.length * 2 + 2);
      writeU16(bytes, 0, value.length);
      for (let j = 0; j < value.length; j++) {
        writeU16(bytes, 2 + j * 2, value.charCodeAt(j));
      }
      dataParts.push(bytes);
      dataLength += bytes.length;
    }
  }
  let paddedLength = dataLength;
  while (paddedLength % 4 !== 0) {
    paddedLength++;
  }
  const size = headerSize + stringCount * 4 + paddedLength;
  const result = new Uint8Array(size);
  writeU16(result, 0, 0x0001);
  writeU16(result, 2, headerSize);
  writeU32(result, 4, size);
  writeU32(result, 8, stringCount);
  writeU32(result, 12, 0);
  writeU32(result, 16, isUtf8 ? 0x100 : 0);
  writeU32(result, 20, headerSize + stringCount * 4);
  writeU32(result, 24, 0);
  result.set(offsets, headerSize);
  let position = headerSize + stringCount * 4;
  for (const part of dataParts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
};

const findAttribute = (bytes, view, elementOffset, headerSize, attributeStart, attributeCount, strings, name) => {
  for (let i = 0; i < attributeCount; i++) {
    const offset = elementOffset + headerSize + attributeStart + i * 20;
    const nameIndex = readU32(view, offset + 4);
    if (nameIndex < strings.length && strings[nameIndex] === name) {
      return offset;
    }
  }
  return -1;
};

export const patchManifest = (input, config) => {
  const bytes = new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalSize = readU32(view, 4);
  const poolOffset = 8;
  const poolSize = readU32(view, poolOffset + 4);
  const pool = decodeStringPool(bytes, poolOffset, poolSize);
  const strings = pool.strings;

  let packageIndex = -1;
  let versionNameIndex = -1;
  let versionCodeAttribute = -1;
  let labelAttribute = -1;

  let position = poolOffset + poolSize;
  while (position + 8 <= totalSize) {
    const type = readU16(view, position);
    const headerSize = readU16(view, position + 2);
    const chunkSize = readU32(view, position + 4);
    if (chunkSize <= 0) {
      break;
    }
    if (type === 0x0102) {
      const nameIndex = readU32(view, position + 20);
      const elementName = strings[nameIndex];
      const attributeStart = readU16(view, position + 24);
      const attributeCount = readU16(view, position + 28);
      if (elementName === 'manifest') {
        const packageAttribute = findAttribute(bytes, view, position, headerSize, attributeStart, attributeCount, strings, 'package');
        if (packageAttribute !== -1) {
          packageIndex = readU32(view, packageAttribute + 16);
        }
        const versionNameAttribute = findAttribute(bytes, view, position, headerSize, attributeStart, attributeCount, strings, 'versionName');
        if (versionNameAttribute !== -1) {
          versionNameIndex = readU32(view, versionNameAttribute + 16);
        }
        versionCodeAttribute = findAttribute(bytes, view, position, headerSize, attributeStart, attributeCount, strings, 'versionCode');
      } else if (elementName === 'application') {
        const found = findAttribute(bytes, view, position, headerSize, attributeStart, attributeCount, strings, 'label');
        if (found !== -1) {
          labelAttribute = found;
        }
      }
    }
    position += chunkSize;
  }

  if (packageIndex === -1 || packageIndex >= strings.length) {
    throw new Error('Package name attribute not found');
  }
  strings[packageIndex] = config.packageName;

  if (versionNameIndex === -1 || versionNameIndex >= strings.length) {
    throw new Error('Version name attribute not found');
  }
  strings[versionNameIndex] = config.versionName;

  const appNameIndex = strings.length;
  strings.push(config.appName);

  if (versionCodeAttribute !== -1) {
    writeU32(bytes, versionCodeAttribute + 16, config.versionCode);
  }
  if (labelAttribute !== -1) {
    writeU32(bytes, labelAttribute + 8, appNameIndex);
    bytes[labelAttribute + 15] = 0x03;
    writeU32(bytes, labelAttribute + 16, appNameIndex);
  }

  const poolBytes = encodeStringPool(strings, pool.isUtf8);
  const tail = bytes.subarray(poolOffset + poolSize);
  const header = new Uint8Array(8);
  writeU16(header, 0, 0x0003);
  writeU16(header, 2, 8);
  const result = new Uint8Array(8 + poolBytes.length + tail.length);
  writeU32(header, 4, result.length);
  result.set(header);
  result.set(poolBytes, 8);
  result.set(tail, 8 + poolBytes.length);
  return result;
};

export const getIconPaths = () => [
  'res/mipmap-mdpi-v4/ic_launcher.png',
  'res/mipmap-hdpi-v4/ic_launcher.png',
  'res/mipmap-xhdpi-v4/ic_launcher.png',
  'res/mipmap-xxhdpi-v4/ic_launcher.png',
  'res/mipmap-xxxhdpi-v4/ic_launcher.png'
];

export const ICON_SIZES = [48, 72, 96, 144, 192];
