# Poster API (for n8n)
Simple Express API that renders your fixed-design breaking poster.

## Endpoints
- POST `/generate` → JSON body: `{ "headline": "...", "sub": "...", "body": "...", "bg": "(optional URL or file)", "fontUrl": "(optional TTF URL)" }`
  - Response: `{ "url": "https://.../public/<file>.png", "filename": "..." }`
- GET `/health` → "ok"

## Local Run
```
npm i
npm start
```
Test:
```
curl -X POST http://localhost:3000/generate -H "Content-Type: application/json" -d '{"headline":"सरकार ने नई नीति लागू की, शिक्षा के स्तर में बदलाव होगा","sub":"नीति का असर अगले सत्र से","body":"(70–120 शब्द)"}'
```

## Deploy on Render
- Build: `npm install`
- Start: `npm start`
- Env: `PUBLIC_BASE_URL=https://<your-service>.onrender.com`
