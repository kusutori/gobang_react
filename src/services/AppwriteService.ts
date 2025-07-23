import { Client, Account, Databases, ID } from 'appwrite';

const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('6880f36b00162e3521c0');

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = 'gobang_game_db';
export const COLLECTIONS = {
  GAME_RECORDS: 'game_records',
  USER_STATS: 'user_stats',
};

export { ID };
export default client;
