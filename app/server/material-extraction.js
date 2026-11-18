import zlib from 'node:zlib';
import { PDFParse } from 'pdf-parse';

const MAX_EXTRACTED_CHARS = 40000;
const MAX_OFFICE_ENTRY_BYTES = 8 * 1024 * 1024;

function u16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function u32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function extractionError(message) {
  return Object.assign(new Error(message), { status: 422 });
}

function readOfficeEntries(buffer, match) {
  let eocd = -1;
  const searchStart = Math.max(0, buffer.length - 66000);
  for (let i = buffer.length - 22; i >= searchStart; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw extractionError('This Word/PowerPoint file is not a valid supported Office document.');

  const count = u16(buffer, eocd + 10);
  let position = u32(buffer, eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (position + 46 > buffer.length || u32(buffer, position) !== 0x02014b50) {
      throw extractionError('The Word/PowerPoint archive structure is damaged.');
    }
    const method = u16(buffer, position + 10);
    const compressedSize = u32(buffer, position + 20);
    const uncompressedSize = u32(buffer, position + 24);
    const nameLength = u16(buffer, position + 28);
    const extraLength = u16(buffer, position + 30);
    const commentLength = u16(buffer, position + 32);
    const localOffset = u32(buffer, position + 42);
    const name = buffer.subarray(position + 46, position + 46 + nameLength).toString('utf8');

    if (match(name)) {
      if (uncompressedSize > MAX_OFFICE_ENTRY_BYTES) {
        throw extractionError('A document section exceeds the safe extraction limit.');
      }
      if (localOffset + 30 > buffer.length || u32(buffer, localOffset) !== 0x04034b50) {
        throw extractionError('A Word/PowerPoint document section is damaged.');
      }
      const localNameLength = u16(buffer, localOffset + 26);
      const localExtraLength = u16(buffer, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      try {
        const content = method === 0
          ? compressed
          : method === 8
            ? zlib.inflateRawSync(compressed, { maxOutputLength: MAX_OFFICE_ENTRY_BYTES })
            : null;
        if (!content) throw new Error('Unsupported compression method.');
        entries.push({ name, content: content.toString('utf8') });
      } catch {
        throw extractionError('A Word/PowerPoint section could not be decompressed.');
      }
    }
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlToText(xml) {
  return String(xml || '')
    .replace(/<a:br[^>]*\/>/g, ' ')
    .replace(/<\/a:p>|<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function validateExtractedText(text, kind) {
  const cleaned = String(text || '').trim();
  if (!cleaned || cleaned.length < 20) {
    throw extractionError(`No readable text was found in this ${kind}. Scanned/image-only pages are not OCR'd; upload a text-based source.`);
  }
  if (cleaned.length > MAX_EXTRACTED_CHARS) {
    throw extractionError(`This ${kind} contains more than ${MAX_EXTRACTED_CHARS.toLocaleString()} extracted characters. Split or shorten it before generating so no material is silently omitted.`);
  }
  return cleaned;
}

export async function extractMaterialText(buffer, filename) {
  const ext = String(filename || '').toLowerCase().split('.').pop();
  if (['txt', 'md', 'csv'].includes(ext)) {
    return validateExtractedText(buffer.toString('utf8'), 'text file');
  }
  if (ext === 'docx') {
    const entries = readOfficeEntries(buffer, (name) => name === 'word/document.xml');
    return validateExtractedText(entries.map((entry) => xmlToText(entry.content)).join('\n\n'), 'Word document');
  }
  if (ext === 'pptx') {
    const entries = readOfficeEntries(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    entries.sort((a, b) => {
      const aNumber = Number(a.name.match(/slide(\d+)\.xml$/)?.[1] || 0);
      const bNumber = Number(b.name.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return aNumber - bNumber;
    });
    const text = entries.map((entry, index) => `Slide ${index + 1}: ${xmlToText(entry.content)}`).join('\n\n');
    return validateExtractedText(text, 'PowerPoint presentation');
  }
  if (ext === 'pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return validateExtractedText(result.text, 'PDF');
    } catch (error) {
      if (error.status === 422) throw error;
      throw extractionError('This PDF could not be read. It may be damaged, encrypted, or image-only.');
    } finally {
      await parser.destroy();
    }
  }
  throw Object.assign(new Error('Unsupported file type. Supported formats are PDF, DOCX, PPTX, TXT, MD, and CSV.'), { status: 415 });
}
