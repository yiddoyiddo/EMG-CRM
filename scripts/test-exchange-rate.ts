import { exchangeRateService } from '../src/lib/exchange-rate';

async function testExchangeRate() {
  console.log('Testing exchange rate functionality...');
  
  try {
    // Test current rate
    const currentRate = await exchangeRateService.getCurrentRate();
    console.log(`Current USD to GBP rate: ${currentRate}`);
    
    // Test conversion
    const usdAmount = 1000;
    const gbpAmount = exchangeRateService.convertUSDToGBP(usdAmount, currentRate);
    console.log(`$${usdAmount} = £${gbpAmount} (at rate ${currentRate})`);
    
    // Test historical rate
    const historicalDate = new Date('2024-01-15');
    const historicalRate = await exchangeRateService.getHistoricalRate(historicalDate);
    console.log(`Historical rate for ${historicalDate.toDateString()}: ${historicalRate}`);
    
    console.log('Exchange rate functionality test completed successfully!');
  } catch (error) {
    console.error('Error testing exchange rate:', error);
  }
}

testExchangeRate(); 