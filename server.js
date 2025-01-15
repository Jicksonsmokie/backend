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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
}

app.use(fileUpload());

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

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();

  const user = users.find((user) => user.email === email && user.password === password);

  if (!user) {
    return res.status(400).json({ message: "Invalid email or password!" });
  }

  res.status(200).json({ message: "Login successful!" });
});

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
      res.status(410).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'An error occurred while processing the video.' });
    }
  }
});







app.post('/api/upload', (req, res) => {
  if (!req.files || !req.files.jsonFile) {
    return res.status(400).send('No file uploaded');
  }

  const jsonFile = req.files.jsonFile;

  if (path.extname(jsonFile.name) !== '.json') {
    return res.status(400).send('Only JSON files are allowed');
  }

  fs.readdir(DATA_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading directory');
    }

    files
      .filter((file) => path.extname(file) === '.json') // Filter JSON files
      .forEach((file) => {
        try {
          fs.unlinkSync(path.join(DATA_FOLDER, file)); // Delete each JSON file
        } catch (err) {
          return res.status(500).send(`Error deleting file: ${file}`);
        }
      });

    // Save the new file
    const savePath = path.join(DATA_FOLDER, jsonFile.name);
    jsonFile.mv(savePath, (err) => {
      if (err) {
        return res.status(500).send('Error saving the file');
      }
      res.send('All old JSON files deleted, and new file uploaded successfully');
    });
  });
});


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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
