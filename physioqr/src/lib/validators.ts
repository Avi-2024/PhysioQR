import { z } from 'zod';

export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const emailSchema = z
  .string()
  .email('Enter a valid email address');

export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

export const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code');

export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN number');

export const amountSchema = (min = 1, max?: number) => {
  let schema = z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be positive').min(min, `Minimum amount is ₹${min}`);
  if (max !== undefined) schema = schema.max(max, `Maximum amount is ₹${max}`);
  return schema;
};

export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');
