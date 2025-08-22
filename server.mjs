import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/public", express.static(path.join(__dirname, "public")));

const DEFAULT_BG = path.join(__dirname, "o.png");

const LOCAL_FONT = path.join(__dirname, "NotoSansDevanagari.ttf");
if (fs.existsSync(LOCAL_FONT)) GlobalFonts.registerFromPath(LOCAL_FONT, "NotoDeva");

async function loadFontFromUrl(fontUrl){
  if(!fontUrl) return;
  try{
    const res = await fetch(fontUrl);
    if(!res.ok) throw new Error("font fetch failed");
    const buf = Buffer.from(await res.arrayBuffer());
    const p = path.join(__dirname, "tmp-"+Date.now()+".ttf");
    fs.writeFileSync(p, buf);
    GlobalFonts.registerFromPath(p, "NotoDeva");
  }catch(e){ console.warn("font load:", e.message); }
}

async function loadBg(bg){
  if(!bg) return loadImage(DEFAULT_BG);
  if(/^https?:/i.test(bg)){
    const r = await fetch(bg);
    if(!r.ok) throw new Error("bg fetch failed");
    const buf = Buffer.from(await r.arrayBuffer());
    return loadImage(buf);
  }
  const p = path.isAbsolute(bg) ? bg : path.join(__dirname, bg);
  if(!fs.existsSync(p)) throw new Error("bg not found");
  return loadImage(p);
}

function ellipsisLine(ctx, text, x, y, maxW){
  if(ctx.measureText(text).width <= maxW){ ctx.fillText(text, x, y); return; }
  let lo=0, hi=text.length;
  while(lo<hi){
    const mid=(lo+hi)>>1, t=text.slice(0,mid)+"…";
    if(ctx.measureText(t).width<=maxW) lo=mid+1; else hi=mid;
  }
  ctx.fillText(text.slice(0, Math.max(0, lo-1))+"…", x, y);
}

function wrap(ctx, text, x, startY, maxW, lh, maxLines){
  const words=String(text).split(/\s+/).filter(Boolean);
  let line="", y=startY, lines=0;
  for(let i=0;i<words.length;i++){
    const test = line + words[i] + " ";
    if(ctx.measureText(test).width > maxW && i>0){
      ctx.fillText(line.trim(), x, y);
      lines++;
      if(lines>=maxLines){
        ellipsisLine(ctx, words.slice(i).join(" "), x, y, maxW);
        return;
      }
      line = words[i]+" ";
      y += lh;
    }else line = test;
  }
  if(line) ctx.fillText(line.trim(), x, y);
}

app.get("/health", (_req,res)=>res.send("ok"));

app.post("/generate", async (req, res)=>{
  try{
    const { headline="", sub="", body="", bg, fontUrl, out } = req.body || {};
    if(!headline || !sub || !body) return res.status(400).json({ error:"Provide headline, sub, body" });
    await loadFontFromUrl(fontUrl);
    const base = await loadBg(bg);

    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, 0, 0);

    const pageW = base.width, cx = pageW/2;
    const fontFamily = GlobalFonts.has("NotoDeva") ? "NotoDeva" : "sans-serif";
    ctx.fillStyle = "#000"; ctx.textAlign="center"; ctx.textBaseline="middle";

    ctx.font = `bold 60px ${fontFamily}`;
    wrap(ctx, headline, cx, 460, pageW-200, 68, 2);

    ctx.font = `bold 46px ${fontFamily}`;
    ellipsisLine(ctx, sub, cx, 590, pageW-220);

    ctx.font = `34px ${fontFamily}`;
    wrap(ctx, body, cx, 670, pageW-240, 52, 6);

    const dir = path.join(__dirname, "public");
    if(!fs.existsSync(dir)) fs.mkdirSync(dir);
    const fname = (out && out.replace(/[^a-z0-9_.-]/gi,"_")) || `breaking-${Date.now()}.png`;
    const outPath = path.join(dir, fname);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.get("host")}`;
    return res.json({ url: `${baseUrl}/public/${fname}`, filename: fname });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:"failed", detail:e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("listening", PORT));
