interface ExchangeRateResponse {
  success: boolean;
  rates: {
    GBP: number;
  };
  date: string;
}

interface HistoricalRateResponse {
  success: boolean;
  rates: {
    GBP: number;
  };
  date: string;
}

class ExchangeRateService {
  private apiKey: string;
  private baseUrl = 'https://api.exchangerate-api.com/v4';

  constructor() {
    // You can get a free API key from https://www.exchangerate-api.com/
    // For now, we'll use a fallback rate if no API key is provided
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
  }

  async getCurrentRate(): Promise<number> {
    try {
      if (this.apiKey) {
        const response = await fetch(`${this.baseUrl}/latest/USD`);
        if (response.ok) {
          const data: ExchangeRateResponse = await response.json();
          return data.rates.GBP;
        }
      }
      
      // Fallback to a reasonable rate if API is unavailable
      console.warn('Exchange rate API unavailable, using fallback rate');
      return 0.79; // Approximate USD to GBP rate
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return 0.79; // Fallback rate
    }
  }

  async getHistoricalRate(date: Date): Promise<number> {
    try {
      if (this.apiKey) {
        const dateStr = date.toISOString().split('T')[0];
        const response = await fetch(`${this.baseUrl}/${dateStr}?base=USD`);
        if (response.ok) {
          const data: HistoricalRateResponse = await response.json();
          return data.rates.GBP;
        }
      }
      
      // Fallback to current rate for historical dates
      return await this.getCurrentRate();
    } catch (error) {
      console.error('Error fetching historical exchange rate:', error);
      return 0.79; // Fallback rate
    }
  }

  convertUSDToGBP(usdAmount: number, rate: number): number {
    return Math.round(usdAmount * rate * 100) / 100; // Round to 2 decimal places
  }
}

export const exchangeRateService = new ExchangeRateService(); 