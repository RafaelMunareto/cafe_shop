import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import app from './app.js';

const port = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distIndex = path.join(distDir, 'index.html');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }

  return res.status(404).json({
    error: 'Frontend não encontrado. Execute "npm run build" para publicar o cliente junto com a API.',
  });
});

app.listen(port, () => {
  console.log(`Cafe Shop API rodando em http://localhost:${port}`);
});
