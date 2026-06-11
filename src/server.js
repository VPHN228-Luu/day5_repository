'use strict';

const { createApp } = require('./app');
const { createDb } = require('./db');

const PORT = process.env.PORT || 3000;

const db = createDb(process.env.DB_PATH || 'data.db');
const app = createApp(db);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Work Order Screen listening on http://localhost:${PORT}`);
});
