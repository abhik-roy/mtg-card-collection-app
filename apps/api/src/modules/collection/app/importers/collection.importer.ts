export type ParsedImportItem = {
  raw: string;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  finish?: string;
  condition?: string;
  language?: string;
  location?: string;
};

export type SupportedImportFormat = 'auto' | 'moxfield' | 'plain';

const FINISH_TOKENS = ['NONFOIL', 'FOIL', 'ETCHED'];
const CONDITION_TOKENS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

export function parseCollectionImport(
  payload: string,
  format: SupportedImportFormat = 'auto',
): ParsedImportItem[] {
  return payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => parseLine(line, format));
}

function parseLine(rawLine: string, format: SupportedImportFormat): ParsedImportItem {
  const targetFormat = format === 'auto' ? detectFormat(rawLine) : format;

  if (targetFormat === 'moxfield') {
    return parseMoxfieldLine(rawLine);
  }

  return parsePlainLine(rawLine);
}

function detectFormat(line: string): SupportedImportFormat {
  if (/\([A-Za-z0-9]{2,5}\)/.test(line) || /\[[^\]]+\]/.test(line)) {
    return 'moxfield';
  }

  return 'plain';
}

function parseMoxfieldLine(rawLine: string): ParsedImportItem {
  let line = rawLine;
  let quantity = 1;

  const quantityMatch = line.match(/^(\d+)\s+/);
  if (quantityMatch) {
    quantity = Number.parseInt(quantityMatch[1], 10);
    line = line.slice(quantityMatch[0].length).trim();
  }

  const setMatch = line.match(/\(([A-Za-z0-9]{2,5})\)/);
  let setCode: string | undefined;
  if (setMatch) {
    setCode = setMatch[1].toUpperCase();
    line = line.replace(setMatch[0], '').trim();
  }

  const finishMatch = line.match(/\[(NONFOIL|FOIL|ETCHED)\]/i);
  let finish: string | undefined;
  if (finishMatch) {
    finish = finishMatch[1].toUpperCase();
    line = line.replace(finishMatch[0], '').trim();
  }

  const conditionMatch = line.match(/\{(NM|LP|MP|HP|DMG)\}/i);
  let condition: string | undefined;
  if (conditionMatch) {
    condition = conditionMatch[1].toUpperCase();
    line = line.replace(conditionMatch[0], '').trim();
  }

  const languageMatch = line.match(/<([A-Za-z]{2,5})>/);
  let language: string | undefined;
  if (languageMatch) {
    language = languageMatch[1].toLowerCase();
    line = line.replace(languageMatch[0], '').trim();
  }

  const locationMatch = line.match(/@([^\s]+)$/);
  let location: string | undefined;
  if (locationMatch) {
    location = locationMatch[1];
    line = line.replace(locationMatch[0], '').trim();
  }

  const tokens = line.split(/\s+/);
  let collectorNumber: string | undefined;
  if (tokens.length > 1 && /^\d+[a-zA-Z]?$/.test(tokens[tokens.length - 1])) {
    collectorNumber = tokens.pop();
    line = tokens.join(' ');
  }

  const name = line.trim();

  return {
    raw: rawLine,
    quantity: normalizeQuantity(quantity),
    name,
    setCode,
    collectorNumber,
    finish,
    condition,
    language,
    location,
  };
}

function parsePlainLine(rawLine: string): ParsedImportItem {
  let line = rawLine;
  let quantity = 1;

  const quantityMatch = line.match(/^(\d+)[xX]?\s+/);
  if (quantityMatch) {
    quantity = Number.parseInt(quantityMatch[1], 10);
    line = line.slice(quantityMatch[0].length).trim();
  }

  const finishToken = FINISH_TOKENS.find((token) => line.toUpperCase().includes(`[${token}]`));
  let finish: string | undefined;
  if (finishToken) {
    finish = finishToken;
    line = line.replace(new RegExp(`\\[${finishToken}\\]`, 'i'), '').trim();
  }

  const conditionToken = CONDITION_TOKENS.find((token) => line.toUpperCase().includes(`{${token}}`));
  let condition: string | undefined;
  if (conditionToken) {
    condition = conditionToken;
    line = line.replace(new RegExp(`\\{${conditionToken}\\}`, 'i'), '').trim();
  }

  return {
    raw: rawLine,
    quantity: normalizeQuantity(quantity),
    name: line.trim(),
    finish,
    condition,
  };
}

function normalizeQuantity(quantity: number): number {
  if (Number.isNaN(quantity) || quantity <= 0) {
    return 1;
  }
  return quantity;
}
