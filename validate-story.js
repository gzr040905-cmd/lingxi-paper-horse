const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "story-data.js"), "utf8"), context);

const story = context.window.LINGXI_STORY;
if (!story) throw new Error("LINGXI_STORY missing");

const evidence = story.evidence || [];
if (evidence.length !== 24) throw new Error(`Expected 24 evidence pages, got ${evidence.length}`);

const ids = new Set();
const keywords = new Set();
const titles = new Set();

evidence.forEach((item, index) => {
  if (ids.has(item.id)) throw new Error(`Duplicate id: ${item.id}`);
  if (keywords.has(item.keyword)) throw new Error(`Duplicate keyword: ${item.keyword}`);
  if (titles.has(item.title)) throw new Error(`Duplicate title: ${item.title}`);
  ids.add(item.id);
  keywords.add(item.keyword);
  titles.add(item.title);
  if (index > 0) {
    const prev = evidence[index - 1].id;
    const prereq = JSON.stringify(item.prerequisites || []);
    if (prereq !== JSON.stringify([prev])) throw new Error(`${item.id} prerequisites should be [${prev}] but got ${prereq}`);
  }
  if (index === 0 && (item.prerequisites || []).length) throw new Error("ev-01 should not have prerequisites");
  if (!item.body || item.body.length < 180) throw new Error(`${item.id} body too short`);
  if (!item.summary || !item.nextDirection) throw new Error(`${item.id} summary fields missing`);
  if (!Array.isArray(item.hints) || item.hints.length < 3) throw new Error(`${item.id} hints incomplete`);
});

const reachable = new Set();
for (const item of evidence) {
  const ok = (item.prerequisites || []).every((id) => reachable.has(id));
  if (item.id !== "ev-01" && !ok) throw new Error(`${item.id} is not reachable`);
  reachable.add(item.id);
}

console.log("Story validation passed:", {
  pages: evidence.length,
  uniqueKeywords: keywords.size,
  chapters: story.chapters.length
});
