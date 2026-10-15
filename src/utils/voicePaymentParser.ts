import { Party, Bill, Purchase } from '../types';

export interface ParsedVoicePayment {
  type?: 'Received' | 'Paid'; // Received = Credit, Paid = Debit
  partyId?: string;
  partyName?: string;
  details?: string;
  category?: string;
  amount?: number;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  refInvoiceNo?: string;
  date?: string;
  notes?: string;
  rawTranscript: string;
  confidence: {
    type?: boolean;
    party?: boolean;
    amount?: boolean;
    method?: boolean;
    refInvoice?: boolean;
    date?: boolean;
    category?: boolean;
  };
}

// Map Gujarati / Hindi numerals to standard ASCII digits
const DIGIT_MAP: { [key: string]: string } = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

export const normalizeDigits = (str: string): string => {
  return str.replace(/[૦-૯०-९]/g, (char) => DIGIT_MAP[char] || char);
};

// Words for numbers in Gujarati / Hindi / English
const WORD_NUMBERS: { [key: string]: number } = {
  'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5,
  'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
  'અગિયાર': 11, 'બાર': 12, 'તેર': 13, 'ચૌદ': 14, 'પંદર': 15,
  'સોળ': 16, 'સત્તર': 17, 'અઢાર': 18, 'ઓગણીસ': 19, 'વીસ': 20,
  'પચ્ચીસ': 25, 'ત્રીસ': 30, 'પાંત્રીસ': 35, 'ચાલીસ': 40, 'પીસ્તાલીસ': 45,
  'પચાસ': 50, 'સાઠ': 60, 'સિત્તેર': 70, 'એંસી': 80, 'નેવું': 90,
  'સો': 100, 'બસો': 200, 'ત્રણસો': 300, 'ચારસો': 400, 'પાંચસો': 500,
  'છસો': 600, 'સાતસો': 700, 'આઠસો': 800, 'નવસો': 900,
  'હજાર': 1000, 'લાખ': 100000, 'કરોડ': 10000000,
  'દોઢ': 1.5, 'અઢી': 2.5,

  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'पचास': 50, 'सौ': 100,
  'हजार': 1000, 'लाख': 100000,

  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'twenty': 20, 'fifty': 50, 'hundred': 100, 'thousand': 1000, 'lakh': 100000,
};

/**
 * Parses spoken Date from speech text
 * e.g., "તારીખ 10 10 2017", "તારીખ 10-10-2026", "10/10/2024", "આજે", "ગઈકાલે"
 */
export const extractDate = (text: string): { dateStr: string; rawDateText?: string } | null => {
  const norm = normalizeDigits(text);
  const today = new Date();

  if (norm.includes('ગઈકાલે') || norm.includes('yesterday') || norm.includes('कल')) {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return { dateStr: yest.toISOString().split('T')[0], rawDateText: 'ગઈકાલે' };
  }

  if (norm.includes('આજે') || norm.includes('today') || norm.includes('आज')) {
    return { dateStr: today.toISOString().split('T')[0], rawDateText: 'આજે' };
  }

  // Look for: "તારીખ 10 10 2017" or "તારીખ 10-10-2017" or "10/10/2017"
  const dateMatch = norm.match(/(?:તારીખ|तारीख|date)?\s*(\d{1,2})[\s\-\/\.](\d{1,2})[\s\-\/\.](\d{2,4})/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    let year = parseInt(dateMatch[3], 10);
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2099) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { dateStr: formatted, rawDateText: dateMatch[0] };
    }
  }

  return null;
};

/**
 * Extracts numeric amount from voice text, prioritizing numbers near currency or payment words
 */
export const extractAmount = (text: string, dateSubstring?: string): number | null => {
  // If a date substring was found, remove it from consideration so date numbers like 10, 10, 2017 are not chosen
  let cleanText = text;
  if (dateSubstring) {
    cleanText = cleanText.replace(dateSubstring, ' ');
  }
  const norm = normalizeDigits(cleanText.toLowerCase());

  // 1. HIGHEST PRIORITY: Number immediately preceding or following payment action/currency words:
  // e.g. "500 જમા", "ના 500 જમા", "500 ઉધાર", "500 રૂપિયા", "₹500", "5000 rs", "જમા 5000", "ચૂકવ્યા 12000"
  const directContextMatch = norm.match(/(?:₹|rs\.?|inr|રૂપિયા|રૂ|જમા|ઉધાર|ચૂકવ્યા|આપ્યા|મળ્યા|ક્રેડિટ|ડેબિટ)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:₹|rs\.?|inr|રૂપિયા|રૂ|જમા|ઉધાર|ચૂકવ્યા|આપ્યા|મળ્યા|ક્રેડિટ|ડેબિટ|\/-)?/i);
  
  // Specific regex looking for number right next to payment/currency tokens
  const targetRegexes = [
    /(\d+)\s*(?:જમા|ક્રેડિટ|credit|ઉધાર|ડેબિટ|debit|રૂપિયા|રૂ|rs|ચૂકવ્યા|આપ્યા|મળ્યા)/i,
    /(?:જમા|ક્રેડિટ|credit|ઉધાર|ડેબિટ|debit|રૂપિયા|રૂ|rs|ચૂકવ્યા|આપ્યા|મળ્યા)\s*(\d+)/i,
    /(?:₹|rs\.?|રૂપિયા|રૂ)\s*(\d+)/i,
  ];

  for (const rx of targetRegexes) {
    const m = norm.match(rx);
    if (m && m[1]) {
      const val = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Multipliers like "10k", "5 હજાર", "2 લાખ"
  const kMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:k|હજાર|हजार|thousand)/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const lakhMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:lakh|લાખ|लाख|lac)/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  // Spoken words: "પાંચસો" -> 500, "પાંચ હજાર" -> 5000, "દસ હજાર" -> 10000
  const tokens = norm.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'દોઢ' && (tokens[i + 1] === 'હજાર' || tokens[i + 1] === 'thousand')) return 1500;
    if (t === 'દોઢ' && (tokens[i + 1] === 'લાખ' || tokens[i + 1] === 'lakh')) return 150000;
    if (t === 'અઢી' && (tokens[i + 1] === 'હજાર' || tokens[i + 1] === 'thousand')) return 2500;
    if (t === 'અઢી' && (tokens[i + 1] === 'લાખ' || tokens[i + 1] === 'lakh')) return 250000;

    if (WORD_NUMBERS[t]) {
      const val = WORD_NUMBERS[t];
      const next = tokens[i + 1] ? WORD_NUMBERS[tokens[i + 1]] : null;
      if (next === 1000) return val * 1000;
      if (next === 100000) return val * 100000;
      if (next === 100) return val * 100;
      if (val >= 100) return val;
    }
  }

  // Any remaining number candidates
  const numberCandidates = norm.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g);
  if (numberCandidates && numberCandidates.length > 0) {
    for (const cand of numberCandidates) {
      const cleanNum = parseFloat(cand.replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        // Exclude common year numbers unless solitary
        if ((cleanNum >= 2015 && cleanNum <= 2030) && numberCandidates.length > 1) {
          continue;
        }
        return cleanNum;
      }
    }
  }

  return null;
};

/**
 * Extracts Transaction Type: Credit (Received / જમા) vs Debit (Paid / ઉધાર)
 */
export const extractTransactionType = (
  text: string,
  partyType?: 'Textile Party' | 'Material Party'
): 'Received' | 'Paid' | null => {
  const norm = text.toLowerCase();

  const creditKeywords = [
    'જમા', 'આવક', 'મળ્યા', 'મળેલ', 'આવ્યા', 'ક્રેડિટ', 'credit', 'cr',
    'received', 'collection', 'ઉઘરાણી', 'મેળવ્યા', 'વસૂલ', 'inflow',
    'deposit', 'લીધા', 'લીધાં', 'જમા કર્યા'
  ];

  const debitKeywords = [
    'ઉધાર', 'જાવક', 'ચૂકવ્યા', 'ચૂકવેલ', 'ચુકવણી', 'આપ્યા', 'ડેબિટ', 'debit', 'dr',
    'paid', 'payment paid', 'payment given', 'outflow', 'ખરીદી પેમેન્ટ',
    'આપેલ', 'પે કર્યા', 'ચુકવ્યા'
  ];

  for (const kw of creditKeywords) {
    if (norm.includes(kw)) return 'Received';
  }

  for (const kw of debitKeywords) {
    if (norm.includes(kw)) return 'Paid';
  }

  if (partyType === 'Material Party') return 'Paid';
  if (partyType === 'Textile Party') return 'Received';

  return null;
};

/**
 * Extracts Payment Method
 */
export const extractPaymentMethod = (
  text: string
): 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | null => {
  const norm = text.toLowerCase();

  if (
    norm.includes('upi') ||
    norm.includes('યુપીઆઈ') ||
    norm.includes('gpay') ||
    norm.includes('google pay') ||
    norm.includes('ગૂગલ પે') ||
    norm.includes('phonepe') ||
    norm.includes('ફોનપે') ||
    norm.includes('paytm') ||
    norm.includes('પેટીએમ') ||
    norm.includes('ઓનલાઇન') ||
    norm.includes('online')
  ) {
    return 'UPI';
  }

  if (
    norm.includes('cash') ||
    norm.includes('રોકડ') ||
    norm.includes('રોકડા') ||
    norm.includes('કેશ') ||
    norm.includes('नकद')
  ) {
    return 'Cash';
  }

  if (
    norm.includes('cheque') ||
    norm.includes('check') ||
    norm.includes('ચેક') ||
    norm.includes('चेक')
  ) {
    return 'Cheque';
  }

  if (
    norm.includes('bank') ||
    norm.includes('transfer') ||
    norm.includes('neft') ||
    norm.includes('rtgs') ||
    norm.includes('બેંક') ||
    norm.includes('ખાતામાં') ||
    norm.includes('ટ્રાન્સફર')
  ) {
    return 'Bank Transfer';
  }

  return null;
};

/**
 * Cleans tokens for party matching and removes Gujarati possessive words
 */
const cleanPartyText = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(ના|ને|નો|ની|નું|થી|પાસેથી|તરફથી|ભાઈ|શેઠ|જી|સર|શ્રી)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Match spoken text with registered parties
 */
export const matchParty = (
  text: string,
  parties: Party[]
): { party: Party; score: number } | null => {
  if (!parties || parties.length === 0) return null;

  const normText = cleanPartyText(normalizeDigits(text));
  let bestMatch: { party: Party; score: number } | null = null;

  for (const party of parties) {
    const cleanName = cleanPartyText(party.name);
    const cleanContact = party.contactPerson ? cleanPartyText(party.contactPerson) : '';

    // Direct whole name match
    if (cleanName.length > 2 && normText.includes(cleanName)) {
      return { party, score: 100 };
    }

    // Direct contact person match
    if (cleanContact.length > 2 && normText.includes(cleanContact)) {
      return { party, score: 95 };
    }

    // Token match: check key tokens of the party name
    const nameTokens = cleanName.split(' ').filter((w) => w.length > 1);
    const filteredTokens = nameTokens.filter(
      (w) => !['creation', 'fashion', 'fabrics', 'textile', 'textiles', 'traders', 'company', 'mill', 'pvt', 'ltd', 'પ્રિન્ટ્સ', 'ફેબ્રિક્સ', 'સિલ્ક'].includes(w)
    );

    const tokensToTest = filteredTokens.length > 0 ? filteredTokens : nameTokens;
    let matchedTokenCount = 0;

    for (const token of tokensToTest) {
      if (normText.includes(token)) {
        matchedTokenCount++;
      }
    }

    if (tokensToTest.length > 0 && matchedTokenCount > 0) {
      const score = (matchedTokenCount / tokensToTest.length) * 90;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { party, score };
      }
    }
  }

  return bestMatch && bestMatch.score >= 40 ? bestMatch : null;
};

/**
 * Extracts Category from party or spoken words
 */
export const extractCategory = (
  text: string,
  matchedParty?: Party
): 'Textile Customer' | 'Material Supplier' | 'Expense / Kharch' | 'Worker' | 'Other' => {
  const norm = text.toLowerCase();

  if (norm.includes('ખર્ચ') || norm.includes('લાઈટબિલ') || norm.includes('ચા') || norm.includes('નાસ્તો') || norm.includes('ભાડું') || norm.includes('expense')) {
    return 'Expense / Kharch';
  }
  if (norm.includes('કારીગર') || norm.includes('પગાર') || norm.includes('ઉપાડ') || norm.includes('worker') || norm.includes('salary')) {
    return 'Worker';
  }

  if (matchedParty) {
    const rawType = matchedParty.type as string;
    if (rawType === 'Material Party' || rawType === 'Supplier' || (matchedParty as any).category === 'Material') {
      return 'Material Supplier';
    }
    return 'Textile Customer';
  }

  if (norm.includes('કાપડ') || norm.includes('ગ્રાહક') || norm.includes('ટેક્સટાઇલ') || norm.includes('કસ્ટમર') || norm.includes('textile')) {
    return 'Textile Customer';
  }
  if (norm.includes('યાર્ન') || norm.includes('દોરો') || norm.includes('સપ્લાયર') || norm.includes('મટિરિયલ') || norm.includes('material')) {
    return 'Material Supplier';
  }

  return 'Textile Customer';
};

/**
 * Main Voice Parser for Credit / Debit Payment Entries
 */
export const parseVoicePaymentEntry = (
  transcript: string,
  parties: Party[],
  bills: Bill[] = [],
  purchases: Purchase[] = []
): ParsedVoicePayment => {
  const normText = transcript.trim();
  
  // 1. Extract Date first (so date digits don't interfere with amount)
  const dateObj = extractDate(normText);
  const date = dateObj ? dateObj.dateStr : undefined;

  // 2. Extract Party
  const matchedPartyObj = matchParty(normText, parties);
  const party = matchedPartyObj ? matchedPartyObj.party : undefined;

  // 3. Extract Amount (excluding date substring)
  const amount = extractAmount(normText, dateObj?.rawDateText);

  // 4. Extract Type (Credit / Debit)
  const type = extractTransactionType(normText, party?.type) || 'Received';

  // 5. Extract Category
  const category = extractCategory(normText, party);

  // 6. Extract Payment Method
  const paymentMethod = extractPaymentMethod(normText) || 'UPI';

  // 7. Details / Description
  const details = party?.name || (matchedPartyObj ? matchedPartyObj.party.name : normText.slice(0, 30));

  return {
    type,
    partyId: party?.id,
    partyName: party?.name,
    details,
    category,
    amount: amount || undefined,
    paymentMethod,
    date,
    notes: normText ? `Voice: "${normText}"` : undefined,
    rawTranscript: normText,
    confidence: {
      type: Boolean(extractTransactionType(normText)),
      party: Boolean(party),
      amount: Boolean(amount),
      method: Boolean(extractPaymentMethod(normText)),
      date: Boolean(date),
      category: Boolean(category),
    },
  };
};
