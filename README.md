# Black Audio → Video API

Convert audio (mp3/ogg/m4a etc.) to a black-screen MP4 using FFmpeg.

## Endpoints

- `POST /convert` — multipart upload with field name `file`. Optional `?size=720x720`.
- `GET /convert?url=...` — pass a direct audio URL. Optional `&size=720x720`.

## Deploy (Render / Railway)

1. Create a new Node app, connect this repo.
2. Ensure build uses Node 18+.
3. **No system ffmpeg needed** — we bundle via `@ffmpeg-installer/ffmpeg`.
4. Start command: `node index.js`

## Example `curl`

Upload a local file:
```bash
curl -F "file=@song.mp3" https://your-app.onrender.com/convert -o out.mp4
