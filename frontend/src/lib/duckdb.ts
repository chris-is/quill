import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

export class DuckDBService {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private worker: Worker | null = null;

  async initialize(): Promise<void> {
    if (this.db) return; // Already initialized

    // Select bundle based on browser capabilities
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

    // Create worker
    this.worker = new Worker(bundle.mainWorker!);

    // Create logger
    const logger = new duckdb.ConsoleLogger();

    // Initialize DuckDB
    this.db = new duckdb.AsyncDuckDB(logger, this.worker);
    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // Create connection
    this.conn = await this.db.connect();
  }

  async query(sql: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const result = await this.conn.query(sql);
    return result.toArray().map(row => row.toJSON());
  }

  async insertArrowData(tableName: string, arrowData: Uint8Array): Promise<void> {
    if (!this.db) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    // Register Arrow data as a table
    await this.db.registerFileBuffer(`${tableName}.arrow`, arrowData);

    // Create table from Arrow file
    await this.conn?.query(`
      CREATE OR REPLACE TABLE ${tableName} AS
      SELECT * FROM read_parquet('${tableName}.arrow')
    `);
  }

  async createTableFromArrow(tableName: string, arrowData: Uint8Array): Promise<void> {
    if (!this.conn) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    try {
      // Insert Arrow data directly
      await this.conn.insertArrowFromIPCStream(arrowData, {
        name: tableName,
        create: true,
      });
    } catch (error) {
      console.error('Error creating table from Arrow data:', error);
      throw error;
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.conn) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const result = await this.conn.query("SHOW TABLES");
    const rows = result.toArray().map(row => row.toJSON());
    // SHOW TABLES returns objects with 'name' property
    return rows.map(row => row.name as string);
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.conn) {
      throw new Error('DuckDB not initialized. Call initialize() first.');
    }

    const result = await this.conn.query(`DESCRIBE ${tableName}`);
    return result.toArray().map(row => row.toJSON());
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let duckdbService: DuckDBService | null = null;

export const getDuckDBService = (): DuckDBService => {
  if (!duckdbService) {
    duckdbService = new DuckDBService();
  }
  return duckdbService;
};