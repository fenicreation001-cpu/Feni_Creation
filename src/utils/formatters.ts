export const formatRupees = (amount: number | string | undefined | null): string => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const numberToWords = (num: number, lang?: string): string => {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };

  return inWords(Math.floor(num)) + ' Rupees Only';
};

export const formatSalaryMonth = (monthKey: string | undefined | null, lang: string = 'en'): string => {
  if (!monthKey) return '-';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthsEng = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsGuj = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return monthKey;
  if (lang === 'gu') {
    return `${monthsGuj[monthIdx]} ${year}`;
  }
  return `${monthsEng[monthIdx]} ${year}`;
};

export const translateRole = (role: string | undefined | null, lang: string = 'en'): string => {
  if (!role) return '';
  if (lang !== 'gu') return role;
  const roleMap: Record<string, string> = {
    'Embroidery Operator': 'એમ્બ્રોઈડરી ઓપરેટર',
    'Master': 'માસ્ટર',
    'Helper': 'હેલ્પર',
    'Checker': 'ચેકર',
    'Folder': 'ફોલ્ડર',
    'Designer': 'ડિઝાઇનર',
    'Manager': 'મેનેજર',
    'Admin': 'એડમિન',
  };
  return roleMap[role] || role;
};

export const translateStatus = (status: string | undefined | null, lang: string = 'en'): string => {
  if (!status) return '';
  if (lang !== 'gu') return status;
  const statusMap: Record<string, string> = {
    'Paid': 'ચૂકવેલ (Paid)',
    'Received': 'મળેલ (Received)',
    'Pending': 'બાકી (Pending)',
    'Partial': 'અંશતઃ (Partial)',
    'Working': 'ચાલુ (Working)',
  };
  return statusMap[status] || status;
};
