import { neon } from '@neondatabase/serverless';

let sqlClient = null;

export function sql(strings, ...values) {
  if (!sqlClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    sqlClient = neon(connectionString);
  }
  return sqlClient(strings, ...values);
}
