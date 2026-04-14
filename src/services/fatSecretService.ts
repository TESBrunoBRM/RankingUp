import { Buffer } from 'buffer'; // To encode Base64 in RN if no buffer, btoa is polyfilled in expo usually. If buffer is not installed we will use a polyfill or btoa.

const CLIENT_ID = 'c6e7da33271546a598e46d0b34a9a92a';
const CLIENT_SECRET = 'b7d02d238e694c1cb446ec8a01c08b3c';

// Force reset cache for the new scope via hot reload
let _fatSecretAccessToken = '';
let _fatSecretTokenExp = 0;

export const fatSecretService = {
  async getAccessToken(): Promise<string> {
    if (_fatSecretAccessToken && Date.now() < _fatSecretTokenExp) {
      return _fatSecretAccessToken;
    }

    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    try {
      const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encodedCredentials}`,
        },
        body: 'grant_type=client_credentials&scope=basic',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to authenticate with FatSecret');
      }

      _fatSecretAccessToken = data.access_token;
      // expire 1 minute before real expiration
      _fatSecretTokenExp = Date.now() + (data.expires_in - 60) * 1000;
      return _fatSecretAccessToken;
    } catch (error) {
      console.error('Error fetching FatSecret Oauth Token:', error);
      throw error;
    }
  },

  async searchFoods(query: string): Promise<any[]> {
    const token = await this.getAccessToken();

    const searchUrl = new URL('https://platform.fatsecret.com/rest/server.api');
    searchUrl.searchParams.append('method', 'foods.search');
    searchUrl.searchParams.append('search_expression', query);
    searchUrl.searchParams.append('format', 'json');
    searchUrl.searchParams.append('max_results', '20');

    try {
      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('FatSecret JSON Parse Error:', text);
        return [];
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Error from food search');
      }

      // Handle the case where no foods or a single food object is returned
      if (!data?.foods?.food) {
        return [];
      }
      
      const foods = Array.isArray(data.foods.food)
        ? data.foods.food
        : [data.foods.food];

      return foods.map((f: any) => ({
        food_id: f.food_id,
        food_name: f.food_name,
        food_description: f.food_description,
        brand_name: f.brand_name,
      }));
    } catch (error) {
      console.error('FatSecret search foods error:', error);
      return [];
    }
  },
};
