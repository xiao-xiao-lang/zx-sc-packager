const textEncoder = new TextEncoder();

const toBytes = (value) => {
  if (typeof value === 'string') {
    return textEncoder.encode(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
};

const concatBytes = (parts) => {
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

const encodeLength = (length) => {
  if (length < 0x80) {
    return new Uint8Array([length]);
  }
  const bytes = [];
  let value = length;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const der = (tag, ...parts) => {
  const body = concatBytes(parts.map(toBytes));
  return concatBytes([new Uint8Array([tag]), encodeLength(body.length), body]);
};

const encodeOid = (value) => {
  const parts = value.split('.').map((part) => Number(part));
  const bytes = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let number = parts[i];
    const stack = [number & 0x7f];
    number >>= 7;
    while (number > 0) {
      stack.unshift(0x80 | (number & 0x7f));
      number >>= 7;
    }
    for (const byte of stack) {
      bytes.push(byte);
    }
  }
  return der(0x06, new Uint8Array(bytes));
};

const OID_DATA = '1.2.840.113549.1.7.1';
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
const OID_RSA = '1.2.840.113549.1.1.1';

const algorithmIdentifier = (oid) => der(0x30, encodeOid(oid), new Uint8Array([0x05, 0x00]));

export const bytesToBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const base64ToBytes = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const sha256 = async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', toBytes(value)));

const wrapHeader = (line) => {
  if (line.length <= 70) {
    return line + '\r\n';
  }
  let result = line.substring(0, 70) + '\r\n';
  for (let i = 70; i < line.length; i += 69) {
    result += ' ' + line.substring(i, i + 69) + '\r\n';
  }
  return result;
};

const buildManifest = async (entries) => {
  let manifest = 'Manifest-Version: 1.0\r\nCreated-By: zx\r\n\r\n';
  const sections = [];
  for (const entry of entries) {
    const section = wrapHeader(`Name: ${entry.name}`) +
      wrapHeader(`SHA-256-Digest: ${bytesToBase64(await sha256(entry.data))}`) +
      '\r\n';
    manifest += section;
    sections.push({
      name: entry.name,
      section
    });
  }
  return {
    manifest,
    sections
  };
};

const buildSignatureFile = async (manifest, sections) => {
  let file = 'Signature-Version: 1.0\r\nCreated-By: zx\r\n';
  file += wrapHeader(`SHA-256-Digest-Manifest: ${bytesToBase64(await sha256(manifest))}`);
  file += '\r\n';
  for (const section of sections) {
    file += wrapHeader(`Name: ${section.name}`) +
      wrapHeader(`SHA-256-Digest: ${bytesToBase64(await sha256(section.section))}`) +
      '\r\n';
  }
  return file;
};

const buildPkcs7 = (signature, certificateDer, issuerSerialDer) => {
  const digestAlgorithms = der(0x31, algorithmIdentifier(OID_SHA256));
  const contentInfo = der(0x30, encodeOid(OID_DATA));
  const signerInfo = der(
    0x30,
    der(0x02, new Uint8Array([0x01])),
    issuerSerialDer,
    algorithmIdentifier(OID_SHA256),
    algorithmIdentifier(OID_RSA),
    der(0x04, signature)
  );
  const signedData = der(
    0x30,
    der(0x02, new Uint8Array([0x01])),
    digestAlgorithms,
    contentInfo,
    der(0xa0, certificateDer),
    der(0x31, signerInfo)
  );
  return der(0x30, encodeOid(OID_SIGNED_DATA), der(0xa0, signedData));
};

export const signApk = async (zip, keyInfo, onProgress = () => {}) => {
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
  const certificateDer = base64ToBytes(keyInfo.certificate);
  const issuerSerialDer = base64ToBytes(keyInfo.issuerSerial);

  const entries = [];
  const names = Object.keys(zip.files).filter((name) => {
    const file = zip.files[name];
    if (file.dir) {
      return false;
    }
    if (name === 'META-INF/MANIFEST.MF' || /^META-INF\/.*\.(SF|RSA|DSA)$/i.test(name)) {
      return false;
    }
    return true;
  }).sort();
  for (let i = 0; i < names.length; i++) {
    entries.push({
      name: names[i],
      data: await zip.files[names[i]].async('uint8array')
    });
    onProgress((i + 1) / names.length);
  }

  const {manifest, sections} = await buildManifest(entries);
  const signatureFile = await buildSignatureFile(manifest, sections);
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    toBytes(signatureFile)
  ));
  const block = buildPkcs7(signature, certificateDer, issuerSerialDer);

  zip.file('META-INF/MANIFEST.MF', manifest);
  zip.file('META-INF/CERT.SF', signatureFile);
  zip.file('META-INF/CERT.RSA', block);
  return zip;
};
