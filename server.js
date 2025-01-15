process.env.YTDL_NO_UPDATE = 'true';
const express = require("express");
const axios = require('axios');
const ytdl = require('ytdl-core');
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const fileUpload = require('express-fileupload');
const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FOLDER = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Users file path and utility functions
const usersFilePath = path.join(__dirname, "users.json");

const readUsers = () => {
  if (!fs.existsSync(usersFilePath)) {
    return [];
  }
  const data = fs.readFileSync(usersFilePath, "utf8");
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Error parsing users.json:", error);
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Ensure data folder exists
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER);
}

app.use(fileUpload());

// User Registration Endpoint
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body;
  const users = readUsers();

  const userExists = users.some((user) => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: "User already exists!" });
  }

  const newUser = { username, email, password };
  users.push(newUser);
  writeUsers(users);

  res.status(200).json({ message: "User registered successfully!" });
});

// User Login Endpoint
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  const user = users.find((user) => user.email === email && user.password === password);

  if (!user) {
    return res.status(400).json({ message: "Invalid email or password!" });
  }

  res.status(200).json({ message: "Login successful!" });
});

// YouTube Video Info Endpoint
app.get('/api/download', async (req, res) => {
  const videoUrl = decodeURIComponent(req.query.url);
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    if (ytdl.validateURL(videoUrl)) {
      const info = await ytdl.getInfo(videoUrl);
      res.json(info);
    } else {
      res.status(400).json({ error: 'Invalid video URL' });
    }
  } catch (err) {
    if (err.statusCode === 410) {
      res.status(410).json({ error: 'The video is no longer available.' });
    } else {
      res.status(500).json({ error: 'An error occurred while processing the video.' });
    }
  }
});

// File Upload Endpoint
app.post('/api/upload', (req, res) => {
  if (!req.files || !req.files.jsonFile) {
    return res.status(400).send('No file uploaded');
  }

  const jsonFile = req.files.jsonFile;

  if (path.extname(jsonFile.name) !== '.json') {
    return res.status(400).send('Only JSON files are allowed');
  }

  const savePath = path.join(DATA_FOLDER, jsonFile.name);

  jsonFile.mv(savePath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.send('File uploaded successfully');
  });
});

// Fetch all stored JSON files
app.get('/api/data', (req, res) => {
  fs.readdir(DATA_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).send(err);
    }

    const jsonData = files
      .filter(file => path.extname(file) === '.json')
      .map(file => {
        const filePath = path.join(DATA_FOLDER, file);
        const fileContent = fs.readFileSync(filePath);
        return JSON.parse(fileContent);
      });

    res.json(jsonData);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
