import { 
  formatDateUK, 
  formatDateUKShort, 
  formatDateUKWithMonth, 
  formatDateForInput,
  formatDateTimeUK,
  getMonthName,
  parseUKDate 
} from '../src/lib/date-utils';

console.log('🇬🇧 Testing UK Date Formatting Utilities');
console.log('==========================================');

const testDate = new Date(2025, 0, 15, 14, 30, 0); // January 15, 2025, 2:30 PM
const dateString = '2025-01-15T14:30:00.000Z';
const nullDate = null;
const undefinedDate = undefined;

console.log('\n📅 Test Date:', testDate.toISOString());
console.log('\n🎯 UK Format Tests:');
console.log('-------------------');
console.log('formatDateUK(testDate):', formatDateUK(testDate));
console.log('formatDateUK(dateString):', formatDateUK(dateString));
console.log('formatDateUK(null):', formatDateUK(nullDate));
console.log('formatDateUK(undefined):', formatDateUK(undefinedDate));

console.log('\n🎯 UK Short Format Tests:');
console.log('--------------------------');
console.log('formatDateUKShort(testDate):', formatDateUKShort(testDate));
console.log('formatDateUKShort(dateString):', formatDateUKShort(dateString));

console.log('\n🎯 UK With Month Name Tests:');
console.log('-----------------------------');
console.log('formatDateUKWithMonth(testDate):', formatDateUKWithMonth(testDate));
console.log('formatDateUKWithMonth(dateString):', formatDateUKWithMonth(dateString));

console.log('\n🎯 HTML Input Format Tests:');
console.log('----------------------------');
console.log('formatDateForInput(testDate):', formatDateForInput(testDate));
console.log('formatDateForInput(dateString):', formatDateForInput(dateString));
console.log('formatDateForInput(null):', formatDateForInput(nullDate));

console.log('\n🎯 Date Time Format Tests:');
console.log('---------------------------');
console.log('formatDateTimeUK(testDate):', formatDateTimeUK(testDate));
console.log('formatDateTimeUK(dateString):', formatDateTimeUK(dateString));

console.log('\n🎯 Month Name Tests:');
console.log('--------------------');
console.log('getMonthName("2025-01"):', getMonthName("2025-01"));
console.log('getMonthName("2025-08"):', getMonthName("2025-08"));
console.log('getMonthName("2025-12"):', getMonthName("2025-12"));

console.log('\n🎯 UK Date Parsing Tests:');
console.log('--------------------------');
console.log('parseUKDate("15/01/2025"):', parseUKDate("15/01/2025"));
console.log('parseUKDate("31/12/2024"):', parseUKDate("31/12/2024"));
console.log('parseUKDate("invalid"):', parseUKDate("invalid"));
console.log('parseUKDate(""):', parseUKDate(""));

console.log('\n✅ All date formatting utilities tested!');
console.log('Expected formats:');
console.log('- UK Date: dd/mm/yyyy (e.g., 15/01/2025)');
console.log('- UK Short: dd/mm/yy (e.g., 15/01/25)');
console.log('- UK With Month: dd MMM yyyy (e.g., 15 Jan 2025)');
console.log('- Input Format: yyyy-mm-dd (e.g., 2025-01-15)');
console.log('- UK DateTime: dd/mm/yyyy HH:mm (e.g., 15/01/2025 14:30)');