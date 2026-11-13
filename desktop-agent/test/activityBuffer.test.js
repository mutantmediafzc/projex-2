import { test } from "node:test";
import assert from "node:assert/strict";
import { ActivityBuffer, compress, domainFromUrl } from "../src/activityBuffer.js";

const T0 = Date.parse("2026-11-13T05:00:00.000Z");
const tick = (i, app, extra = {}) => ({
  t: T0 + i * 5000,
  app_name: app,
  window_title: `${app} window`,
  url_domain: null,
  is_idle: false,
  ...extra,
});

test("merges consecutive samples of the same window", () => {
  const segs = compress([tick(0, "Chrome"), tick(1, "Chrome"), tick(2, "Chrome")], 5000);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].started_at, new Date(T0).toISOString());
  assert.equal(segs[0].ended_at, new Date(T0 + 15000).toISOString());
});

test("splits on app change and on gaps", () => {
  const segs = compress([tick(0, "Chrome"), tick(1, "Figma"), tick(10, "Figma")], 5000);
  assert.equal(segs.length, 3);
});

test("idle re-labelling applies only to buffered samples after idle start", () => {
  const buf = new ActivityBuffer(5);
  for (let i = 0; i < 6; i++) buf.addTick(tick(i, "Chrome"));
  buf.markIdleSince(T0 + 3 * 5000);
  const segs = buf.takeSegments(Infinity);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].is_idle, false);
  assert.equal(segs[1].is_idle, true);
  assert.equal(segs[1].started_at, new Date(T0 + 15000).toISOString());
  assert.equal(buf.size, 0);
});

test("takeSegments keeps samples newer than the cutoff", () => {
  const buf = new ActivityBuffer(5);
  for (let i = 0; i < 4; i++) buf.addTick(tick(i, "Chrome"));
  const segs = buf.takeSegments(T0 + 10000);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].ended_at, new Date(T0 + 10000).toISOString());
  assert.equal(buf.size, 2);
});

test("domainFromUrl", () => {
  assert.equal(domainFromUrl("https://www.facebook.com/adsmanager"), "facebook.com");
  assert.equal(domainFromUrl("not a url"), null);
  assert.equal(domainFromUrl(undefined), null);
});
