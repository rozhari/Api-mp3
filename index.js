const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const app = express();
const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 3000;

// Health check
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Black Audio→Video API running',
    endpoints: ['/convert (POST file)', '/convert?url=... (GET)']
  });
});

function runFfmpeg(inputPath, outputPath, size='720x720') {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'lavfi', '-i', `color=c=black:s=${size}:r=1`,
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', outputPath
    ];
    execFile(ffmpegPath, args, (err, stdout, stderr) => {
      if (err) {
        console.error('ffmpeg error:', err);
        console.error('stderr:', stderr);
        return reject(new Error('FFmpeg failed'));
      }
      resolve();
    });
  });
}

function safeUnlink(p) {
  try { fs.existsSync(p) && fs.unlinkSync(p); } catch {}
}

// POST /convert (file upload)
app.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name should be "file")' });
  const inputPath = req.file.path;
  const size = (req.query.size || '720x720').trim();
  const outputPath = `${inputPath}.mp4`;

  try {
    await runFfmpeg(inputPath, outputPath, size);
    res.download(outputPath, 'output.mp4', () => {
      safeUnlink(inputPath);
      safeUnlink(outputPath);
    });
  } catch (e) {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// GET /convert?url=...
app.get('/convert', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing "url" query parameter' });
  const size = (req.query.size || '720x720').trim();

  const id = uuidv4();
  const inputPath = path.join('uploads', `dl_${id}.audio`);
  const outputPath = `${inputPath}.mp4`;

  try {
    const response = await axios.get(url, { responseType: 'stream', timeout: 60000 });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(inputPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await runFfmpeg(inputPath, outputPath, size);
    res.download(outputPath, 'output.mp4', () => {
      safeUnlink(inputPath);
      safeUnlink(outputPath);
    });
  } catch (e) {
    console.error('download/convert error:', e.message);
    safeUnlink(inputPath);
    safeUnlink(outputPath);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
