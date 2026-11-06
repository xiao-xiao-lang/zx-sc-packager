import {base64ToBytes} from './apk-sign.js';

const CHUNK_SIZE = 1024 * 1024;
const V2_BLOCK_ID = 0x7109871a;
const SIG_ALGORITHM = 0x0103;
const MAGIC = new TextEncoder().encode('APK Sig Block 42');

const u8 = (value) => new Uint8Array([value]);

const u32 = (value) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
};

const u64 = (value) => {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
};

const concat = (parts) => {
  let length = 0;
  for (const part of parts) {
    length += part.length;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

const lp = (bytes) => concat([u32(bytes.length), bytes]);

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

const findEocd = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      if (i + 22 + view.getUint16(i + 20, true) === bytes.length) {
        return i;
      }
    }
  }
  throw new Error('EOCD not found');
};

const collectChunkDigests = async (bytes, output) => {
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    output.push(await sha256(concat([u8(0xa5), u32(chunk.length), chunk])));
  }
};

const computeContentDigest = async (contents, centralDirectory, eocd) => {
  const chunkDigests = [];
  await collectChunkDigests(contents, chunkDigests);
  await collectChunkDigests(centralDirectory, chunkDigests);
  await collectChunkDigests(eocd, chunkDigests);
  return sha256(concat([u8(0x5a), u32(chunkDigests.length), ...chunkDigests]));
};

const buildSignedData = (digest, certificate) => {
  const digestRecord = lp(concat([u32(SIG_ALGORITHM), lp(digest)]));
  const digests = lp(digestRecord);
  const certificates = lp(lp(certificate));
  const attributes = lp(new Uint8Array(0));
  return concat([digests, certificates, attributes]);
};

const buildSignerValue = (digest, signature, certificate, publicKey) => {
  const signedData = buildSignedData(digest, certificate);
  const signatureRecord = lp(concat([u32(SIG_ALGORITHM), lp(signature)]));
  const signatures = lp(signatureRecord);
  const signer = concat([lp(signedData), signatures, lp(publicKey)]);
  return lp(lp(signer));
};

const buildSigningBlock = (value) => {
  const pair = concat([u64(4 + value.length), u32(V2_BLOCK_ID), value]);
  const size = pair.length + 8 + 16;
  return concat([u64(size), pair, u64(size), MAGIC]);
};

export const addV2Signature = async (input, keyInfo) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const eocdOffset = findEocd(bytes);
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBytes(keyInfo.privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  const certificate = base64ToBytes(keyInfo.certificate);
  const publicKey = base64ToBytes(keyInfo.publicKey);

  const placeholderValue = buildSignerValue(new Uint8Array(32), new Uint8Array(256), certificate, publicKey);
  const placeholderBlock = buildSigningBlock(placeholderValue);

  const signingBlockStart = centralDirectoryOffset;
  const finalCentralDirectoryOffset = signingBlockStart + placeholderBlock.length;

  const digestEocd = new Uint8Array(bytes.slice(eocdOffset));
  new DataView(digestEocd.buffer).setUint32(16, signingBlockStart, true);

  const finalEocd = new Uint8Array(digestEocd);
  new DataView(finalEocd.buffer).setUint32(16, finalCentralDirectoryOffset, true);

  const contentDigest = await computeContentDigest(
    bytes.subarray(0, signingBlockStart),
    bytes.subarray(centralDirectoryOffset, centralDirectoryOffset + centralDirectorySize),
    digestEocd
  );

  const signedData = buildSignedData(contentDigest, certificate);
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    signedData
  ));
  const value = buildSignerValue(contentDigest, signature, certificate, publicKey);
  const block = buildSigningBlock(value);

  if (block.length !== placeholderBlock.length) {
    throw new Error('APK signing block size changed');
  }

  return concat([
    bytes.subarray(0, signingBlockStart),
    block,
    bytes.subarray(centralDirectoryOffset, centralDirectoryOffset + centralDirectorySize),
    finalEocd
  ]);
};
