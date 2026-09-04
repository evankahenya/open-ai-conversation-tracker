import fs from 'fs';
import path from 'path';
import { getConversation, appendEvent, incrementScreenshotCount, setCurrentActivity } from './store';
import { runInConversationLock } from './concurrency';
import { analyzeScreenshotWithOpenAI } from './openaiService';
import { realtimeHub } from './realtime';
import { ScreenshotAnalysisEvent } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const WATCH_DIR = path.join(DATA_DIR, 'watch');
const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');

// Ensure directories exist
for (const dir of [WATCH_DIR, SCREENSHOTS_DIR, PROCESSED_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let isWatcherRunning = false;
let watcherInterval: NodeJS.Timeout | null = null;
let autoSimulationInterval: NodeJS.Timeout | null = null;
let sampleCounter = 1;

export function getWatcherStatus() {
  return {
    running: isWatcherRunning,
    watchDir: 'data/watch',
    screenshotsDir: 'data/screenshots',
    processedDir: 'data/processed',
    autoSimulation: autoSimulationInterval !== null,
  };
}

/**
 * Process a single screenshot through the pipeline:
 * watch/ -> screenshots/ -> OpenAI -> store -> realtime broadcast -> processed/
 */
export async function processScreenshot(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return;
  }

  const conv = getConversation();
  const conversationId = conv.conversationId;

  // Move or copy to screenshots directory for web serving
  const destScreenshotPath = path.join(SCREENSHOTS_DIR, filename);
  if (filePath !== destScreenshotPath) {
    fs.copyFileSync(filePath, destScreenshotPath);
  }

  // Move original from watch/ to processed/ if it was in watch/
  const processedPath = path.join(PROCESSED_DIR, filename);
  if (fs.existsSync(filePath) && filePath.startsWith(WATCH_DIR)) {
    try {
      fs.renameSync(filePath, processedPath);
    } catch {
      // If rename across mounts fails, copy & unlink
      fs.copyFileSync(filePath, processedPath);
      fs.unlinkSync(filePath);
    }
  }

  const screenshotUrl = `/api/screenshots/${filename}`;
  const timestamp = new Date().toISOString();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const messageId = `msg_${Date.now()}`;

  // 1. Broadcast screenshot event immediately
  realtimeHub.broadcast({
    id: `evt_img_${Date.now()}`,
    type: 'screenshot',
    conversationId,
    timestamp,
    data: {
      filename,
      url: screenshotUrl,
    },
  });

  // 2. Safely acquire conversation lock to call OpenAI Responses API
  await runInConversationLock(conversationId, async () => {
    let fullAnalysis = '';

    await analyzeScreenshotWithOpenAI(conversationId, destScreenshotPath, {
      onStart: () => {
        realtimeHub.broadcast({
          id: `evt_start_${Date.now()}`,
          type: 'assistant_delta',
          conversationId,
          timestamp: new Date().toISOString(),
          data: {
            messageId,
            delta: '',
          },
        });
      },
      onDelta: (delta: string) => {
        fullAnalysis += delta;
        // Broadcast delta to connected browsers in real-time
        realtimeHub.broadcast({
          id: `evt_delta_${Date.now()}`,
          type: 'assistant_delta',
          conversationId,
          timestamp: new Date().toISOString(),
          data: {
            messageId,
            delta,
          },
        });
      },
      onComplete: (completedText: string) => {
        fullAnalysis = completedText;
      },
      onError: (err: Error) => {
        console.error('[Watcher Analysis Error]:', err.message);
        fullAnalysis = `Analysis note: Screen observed (${filename}). Ready for next frame.`;
      },
    });

    // 3. Increment screenshot count and update current activity
    incrementScreenshotCount();

    const activity = deriveActivityFromText(fullAnalysis, filename, timestamp);
    setCurrentActivity(activity);

    // 4. Save to local event store (the UI history)
    const analysisEvent: ScreenshotAnalysisEvent = {
      id: eventId,
      type: 'screenshot_analysis',
      conversationId,
      timestamp,
      screenshot: filename,
      screenshotUrl,
      content: fullAnalysis,
      activity,
    };

    appendEvent(analysisEvent);

    // 5. Broadcast complete analysis and activity update
    realtimeHub.broadcast(analysisEvent);
    realtimeHub.broadcast({
      id: `evt_act_${Date.now()}`,
      type: 'activity_update',
      conversationId,
      timestamp,
      data: activity,
    });
  });
}

function deriveActivityFromText(text: string, filename: string, timestamp: string) {
  let application = 'Development Workspace';
  let activity = text.slice(0, 120);

  const lower = text.toLowerCase();
  if (lower.includes('code') || lower.includes('visual studio') || filename.includes('vscode')) {
    application = 'Visual Studio Code';
    activity = 'Editing TypeScript source code and server routes';
  } else if (lower.includes('terminal') || lower.includes('zsh') || filename.includes('terminal')) {
    application = 'Terminal';
    activity = 'Running build scripts and inspecting git status';
  } else if (lower.includes('browser') || lower.includes('chrome') || filename.includes('browser')) {
    application = 'Web Browser';
    activity = 'Testing web interface and reviewing application logs';
  }

  return {
    application,
    activity,
    lastUpdate: timestamp,
  };
}

/**
 * Triggers an immediate sample screenshot analysis (for manual demo / testing in UI)
 */
export async function triggerSampleCapture(): Promise<void> {
  const screenshots = ['screenshot001.jpg', 'screenshot002.jpg', 'screenshot003.jpg'];
  const chosen = screenshots[sampleCounter % screenshots.length];
  sampleCounter++;

  const source = path.join(SCREENSHOTS_DIR, chosen);
  if (fs.existsSync(source)) {
    // Create a new snapshot copy to simulate incoming screenshot from watcher
    const newFilename = `capture_${Date.now()}_${chosen}`;
    const target = path.join(WATCH_DIR, newFilename);
    fs.copyFileSync(source, target);
    await processScreenshot(target);
  }
}

/**
 * Starts the Node.js background filesystem watcher
 */
export function startWatcher(): void {
  if (isWatcherRunning) return;
  isWatcherRunning = true;
  console.log('[Watcher] Background screen watcher started on data/watch');

  // Check for any existing files in watch/
  const checkWatchDir = async () => {
    try {
      if (!fs.existsSync(WATCH_DIR)) return;
      const files = fs.readdirSync(WATCH_DIR);
      for (const file of files) {
        if (!file.startsWith('.')) {
          const fullPath = path.join(WATCH_DIR, file);
          if (fs.statSync(fullPath).isFile()) {
            await processScreenshot(fullPath);
          }
        }
      }
    } catch (err) {
      console.error('[Watcher Check Error]:', err);
    }
  };

  // Initial check
  checkWatchDir();

  // Watch via fs.watch + interval fallback to be bulletproof across container environments
  try {
    fs.watch(WATCH_DIR, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        const fullPath = path.join(WATCH_DIR, filename);
        if (fs.existsSync(fullPath)) {
          setTimeout(() => processScreenshot(fullPath), 100);
        }
      }
    });
  } catch (err) {
    console.warn('[Watcher] Native fs.watch warning, relying on interval polling:', err);
  }

  watcherInterval = setInterval(checkWatchDir, 3000);
}

export function stopWatcher(): void {
  isWatcherRunning = false;
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
  if (autoSimulationInterval) {
    clearInterval(autoSimulationInterval);
    autoSimulationInterval = null;
  }
}
