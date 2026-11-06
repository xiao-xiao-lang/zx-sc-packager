const writeU16 = (bytes, offset, value) => {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
};

const writeU32 = (bytes, offset, value) => {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
};

export const packIco = (images) => {
  const headerSize = 6 + images.length * 16;
  let total = headerSize;
  for (const image of images) {
    total += image.data.length;
  }
  const result = new Uint8Array(total);
  writeU16(result, 0, 0);
  writeU16(result, 2, 1);
  writeU16(result, 4, images.length);
  let offset = headerSize;
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const entry = 6 + i * 16;
    const size = image.size >= 256 ? 0 : image.size;
    result[entry] = size;
    result[entry + 1] = size;
    result[entry + 2] = 0;
    result[entry + 3] = 0;
    writeU16(result, entry + 4, 1);
    writeU16(result, entry + 6, 32);
    writeU32(result, entry + 8, image.data.length);
    writeU32(result, entry + 12, offset);
    result.set(image.data, offset);
    offset += image.data.length;
  }
  return result;
};

export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
