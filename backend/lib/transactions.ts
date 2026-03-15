import { PoolConnection } from 'mysql2/promise';
import { getConnection } from './db';

export async function executeTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('🔄 Transaction started');
    
    const result = await callback(connection);
    
    await connection.commit();
    console.log('✅ Transaction committed');
    
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function transactionQuery<T = any>(
  connection: PoolConnection,
  sql: string,
  params?: any[]
): Promise<T> {
  const [results] = await connection.execute(sql, params);
  return results as T;
}

export async function transactionQueryOne<T = any>(
  connection: PoolConnection,
  sql: string,
  params?: any[]
): Promise<T | null> {
  const [results] = await connection.execute(sql, params);
  const rows = results as T[];
  return rows.length > 0 ? rows[0] : null;
}
