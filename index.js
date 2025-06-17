const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual keys
const API_KEY = 'agzWsx0twdZy7vZx3odUbTYw0mfP4ekl';
const SECRET = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCYzffBNu6S...'; // short for security

// Storage config
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// Upload Endpoint
app.post('/analyze', upload.single('photo'), async (req, res) => {
  const filePath = req.file.path;
  const fileSize = req.file.size;
  const fileName = req.file.originalname;

  try {
    // Step 1: Ask for upload URL
    const fileResponse = await axios.post(
      'https://yce-api-01.perfectcorp.com/s2s/v1.1/file/skin-analysis',
      {
        files: [{
          content_type: 'image/jpeg',
          file_name: fileName,
          file_size: fileSize
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const uploadURL = fileResponse.data.result.files[0].requests[0].url;
    const fileId = fileResponse.data.result.files[0].file_id;
    const headers = fileResponse.data.result.files[0].requests[0].headers;

    // Step 2: Upload file to given URL
    const imageData = fs.readFileSync(filePath);
    await axios.put(uploadURL, imageData, { headers });

    // Step 3: Analyze
    const analysisResponse = await axios.post(
      'https://yce-api-01.perfectcorp.com/s2s/v1.0/task/skin-analysis',
      {
        request_id: 1,
        payload: {
          file_sets: {
            src_ids: [fileId]
          },
          actions: [{
            id: 0,
            params: {
              dst_actions: ["hd_wrinkle", "hd_pore", "hd_texture", "hd_acne"]
            }
          }]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(analysisResponse.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    fs.unlinkSync(filePath); // Clean uploaded image
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
