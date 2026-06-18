import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Today's date as YYYY-MM-DD — use as minDate for deadline pickers. */
export function todayDateString(): string {
  return dayjs().format('YYYY-MM-DD');
}
