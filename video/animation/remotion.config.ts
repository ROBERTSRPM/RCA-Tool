import {Config} from "@remotion/cli/config";
import fs from "fs";

// Use the Chromium that is already installed (no browser download).
const candidates = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
].filter(Boolean) as string[];
const exe = candidates.find((p) => fs.existsSync(p));
if (exe) Config.setBrowserExecutable(exe);

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(18);
Config.setOverwriteOutput(true);
