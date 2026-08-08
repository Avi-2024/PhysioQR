/**
 * Generates a sequential readable ID.
 * Example: generateId('DR', 5) => 'DR00005'
 */
const generateId = (prefix, number) => {
  return `${prefix}${String(number).padStart(5, '0')}`;
};

/**
 * Generates an invoice number.
 * Example: generateInvoiceNumber(1) => 'RC/2026/000001'
 */
const generateInvoiceNumber = (sequence) => {
  const year = new Date().getFullYear();
  return `RC/${year}/${String(sequence).padStart(6, '0')}`;
};

module.exports = { generateId, generateInvoiceNumber };
