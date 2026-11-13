// Turns 5-second samples of "what is on screen + is the user idle" into
// compact activity segments for upload.
//
// Samples stay in the buffer until they are older than the idle threshold.
// That way, when the OS reports "idle for 5 minutes", the last 5 minutes of
// samples can still be re-labelled as idle before anything is sent, so idle
// time is never counted as active.

export class ActivityBuffer {
  /** @param {number} tickSeconds sampling interval */
  constructor(tickSeconds) {
    this.tickMs = tickSeconds * 1000;
    /** @type {Array<{t:number, app_name:string, window_title:string|null, url_domain:string|null, is_idle:boolean}>} */
    this.ticks = [];
  }

  addTick(tick) {
    this.ticks.push(tick);
  }

  // The user has been idle since `sinceMs`: re-label samples from then on.
  markIdleSince(sinceMs) {
    for (const tick of this.ticks) {
      if (tick.t >= sinceMs) tick.is_idle = true;
    }
  }

  get size() {
    return this.ticks.length;
  }

  // Removes samples that finished before `cutoffMs` and returns them merged
  // into segments. Pass Infinity to drain everything.
  takeSegments(cutoffMs) {
    const ready = [];
    while (this.ticks.length && this.ticks[0].t + this.tickMs <= cutoffMs) {
      ready.push(this.ticks.shift());
    }
    return compress(ready, this.tickMs);
  }
}

export function sameActivity(a, b) {
  return (
    a.app_name === b.app_name &&
    a.window_title === b.window_title &&
    a.url_domain === b.url_domain &&
    a.is_idle === b.is_idle
  );
}

// Merges consecutive samples of the same window into one segment. A gap of
// more than 1.5 ticks (PC asleep, app paused) always starts a new segment.
export function compress(ticks, tickMs) {
  const segments = [];
  let current = null;
  let lastT = 0;
  for (const tick of ticks) {
    const contiguous = current && tick.t - lastT <= tickMs * 1.5;
    if (current && contiguous && sameActivity(current, tick)) {
      current.endMs = tick.t + tickMs;
    } else {
      if (current) segments.push(current);
      current = {
        startMs: tick.t,
        endMs: tick.t + tickMs,
        app_name: tick.app_name,
        window_title: tick.window_title,
        url_domain: tick.url_domain,
        is_idle: tick.is_idle,
      };
    }
    lastT = tick.t;
  }
  if (current) segments.push(current);
  return segments.map((s) => ({
    started_at: new Date(s.startMs).toISOString(),
    ended_at: new Date(s.endMs).toISOString(),
    app_name: s.app_name,
    window_title: s.window_title,
    url_domain: s.url_domain,
    is_idle: s.is_idle,
  }));
}

export function domainFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const host = new URL(url).hostname;
    return host ? host.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}
