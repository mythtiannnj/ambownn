require('dotenv').config();
const express = require('express');
const path = require('path');
const sendHandler = require('./api/send');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/send', sendHandler);

app.get('/dashboard', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/dashboard.html'))
);
app.get('/404', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/404.html'))
);
app.get('/500', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/500.html'))
);

app.listen(PORT, () =>
  console.log(`Random Ambon running on http://localhost:${PORT}`)
);