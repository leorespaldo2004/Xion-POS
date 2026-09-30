import axios from 'axios';
import { configRepository } from '../database/repositories/configRepository';

export const getApiClient = async () => {
  const config = await configRepository.getAllConfig();
  const baseURL = config.api_url || 'http://192.168.1.100:8000';

  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'mobile'
    }
  });

  return client;
};
