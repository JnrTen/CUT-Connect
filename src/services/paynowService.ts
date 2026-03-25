import axios from 'axios';

export const initiatePayment = async (email: string, amount: number, items: any[]) => {
  try {
    const response = await axios.post('/api/paynow/initiate', {
      email,
      amount,
      items
    });
    return response.data;
  } catch (error) {
    console.error('Payment initiation failed:', error);
    throw error;
  }
};
