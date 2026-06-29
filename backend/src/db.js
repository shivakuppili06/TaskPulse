const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set. Database operations will fail.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  if (!connectionString) return;
  
  const client = await pool.connect();
  try {
    // Create todos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        completed BOOLEAN DEFAULT FALSE,
        "kanbanStatus" TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        "dueDate" TIMESTAMP WITH TIME ZONE,
        tags TEXT[] DEFAULT '{}',
        category TEXT DEFAULT 'General',
        pinned BOOLEAN DEFAULT FALSE,
        repeat TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        subtasks JSONB DEFAULT '[]',
        notes TEXT DEFAULT '',
        "timeEstimate" INTEGER,
        "timeSpent" INTEGER DEFAULT 0,
        "order" INTEGER DEFAULT 0,
        archived BOOLEAN DEFAULT FALSE,
        "deletedAt" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create activity table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id UUID PRIMARY KEY,
        action TEXT NOT NULL,
        "todoId" UUID,
        "todoTitle" TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb
};
