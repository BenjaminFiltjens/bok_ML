import { mkdir, readFile, writeFile } from "node:fs/promises";
import dns from "node:dns";
import path from "node:path";
import { setMaxListeners } from "node:events";

dns.setDefaultResultOrder("ipv4first");
setMaxListeners(0);

const SOURCE_URL =
  process.env.ESS_STAFF_SOURCE_URL ||
  "https://www.tudelft.nl/en/tpm/our-faculty/departments/engineering-systems-and-services/people";
const OUT_FILE = path.resolve(process.env.ESS_STAFF_OUT_FILE || "data/ess-staff.json");
const ADVISOR_SECTION_FILE = path.resolve("data/advisor-sections.json");
const PROFILE_CONCURRENCY = Number(process.env.ESS_PROFILE_CONCURRENCY || 4);

const SECTION_PATTERNS = [
  {
    section: "Transport and Logistics",
    domain: "TLO",
    patterns: ["Transport and Logistics", "Transport en Logistiek", "Transport, Mobility and Logistics"]
  },
  {
    section: "Energy and Industry",
    domain: "E&I",
    patterns: ["Energy and Industry", "Energie en Industrie"]
  },
  {
    section: "Information and Communication Technology",
    domain: "ICT",
    patterns: [
      "Information and Communication Technology",
      "Information Communication Technology",
      "Informatie en Communicatie Technologie",
      "Informatie en Communicatietechnologie"
    ]
  },
  {
    section: "System Engineering",
    domain: "SDM",
    patterns: ["System Engineering", "Systems Engineering"]
  },
  {
    section: "Policy Analysis",
    domain: "SDM",
    patterns: ["Policy Analysis", "Beleidsanalyse"]
  }
];

const TITLE_PATTERN = /\b(professor|emeritus|prof|drs|dr|ir|msc|ll\.?m|mba|phd)\.?(?=\s|,|$)/gi;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function personKey(value = "") {
  return stripHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(TITLE_PATTERN, " ")
    .replace(/\b(ba|msc|llm|mba|phd)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanPersonName(value = "") {
  return stripHtml(value)
    .replace(TITLE_PATTERN, " ")
    .replace(/\b(BA|MSc|LLM|MBA|PhD)\b\.?/g, " ")
    .replace(/^[\s.,]+|[\s.,]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}

function aliasesForName(rawName = "") {
  const clean = cleanPersonName(rawName);
  const aliases = [stripHtml(rawName), clean];
  const nicknameMatch = clean.match(/\(([^)]+)\)\s*(.+)$/);
  if (nicknameMatch) {
    const nickname = nicknameMatch[1].trim();
    const surname = nicknameMatch[2].trim();
    const initials = clean.slice(0, nicknameMatch.index).trim();
    aliases.push(`${nickname} ${surname}`);
    if (initials) aliases.push(`${initials} ${surname}`);
  }
  const withoutParentheses = clean.replace(/\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
  aliases.push(withoutParentheses);
  return unique(aliases);
}

function normalizeProfileUrl(href = "") {
  const decoded = decodeHtml(href);
  const match = decoded.match(/\/(?:en\/)?staff\/([^/?#]+)\/?/i);
  if (!match?.[1]) return "";
  return `https://www.tudelft.nl/staff/${match[1]}/`;
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 18000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "tbm-ml-thesis-explorer/0.1 (+https://github.com)"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(800 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${lastError.message} while fetching ${url}`);
}

async function loadAdvisorSections() {
  try {
    return JSON.parse(await readFile(ADVISOR_SECTION_FILE, "utf8"));
  } catch {
    return { aliases: {}, staff: {}, sectionDomains: {} };
  }
}

function parsePeoplePage(html) {
  const people = [];
  const cardPattern = /<a\s+[^>]*href="([^"]+)"[^>]*class="[^"]*\bcard\b[^"]*"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi;
  for (const match of html.matchAll(cardPattern)) {
    const displayName = stripHtml(match[2]);
    if (!displayName || displayName.length < 3) continue;
    const profileUrl = normalizeProfileUrl(match[1]);
    const aliases = aliasesForName(displayName);
    people.push({
      displayName: aliases.find((alias) => !alias.includes("(")) || displayName,
      rawNames: [displayName],
      aliases,
      profileUrl,
      section: "",
      domain: "",
      sectionSource: ""
    });
  }
  return people;
}

function mergePeople(people) {
  const merged = new Map();
  for (const person of people) {
    const key = person.profileUrl || personKey(person.displayName);
    if (!merged.has(key)) {
      merged.set(key, person);
      continue;
    }
    const current = merged.get(key);
    current.rawNames = unique([...current.rawNames, ...person.rawNames]);
    current.aliases = unique([...current.aliases, ...person.aliases]);
    if (!current.profileUrl && person.profileUrl) current.profileUrl = person.profileUrl;
  }
  return [...merged.values()];
}

function findSectionInText(text = "") {
  const normalized = text.replace(/\s+/g, " ");
  const affiliationIndex = Math.max(normalized.indexOf("Engineering, Systems and Services"), normalized.indexOf("Engineering Systems and Services"));
  const candidates = affiliationIndex >= 0 ? [normalized.slice(affiliationIndex, affiliationIndex + 420), normalized] : [normalized];
  for (const candidate of candidates) {
    for (const section of SECTION_PATTERNS) {
      if (section.patterns.some((pattern) => candidate.includes(pattern))) {
        return { section: section.section, domain: section.domain };
      }
    }
  }
  return { section: "", domain: "" };
}

function extractPureProfileUrl(html = "") {
  const match = html.match(/https:\/\/research\.tudelft\.nl\/en\/persons\/[^"'<\s]+/i);
  return match?.[0] || "";
}

async function mapConcurrent(items, worker, concurrency) {
  const output = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return output;
}

function applyManualSections(people, advisorSections) {
  const sectionDomains = advisorSections.sectionDomains || {};
  const aliases = advisorSections.aliases || {};
  const staff = advisorSections.staff || {};
  const aliasLookup = Object.fromEntries(Object.entries(aliases).map(([alias, canonical]) => [personKey(alias), canonical]));
  const staffLookup = Object.fromEntries(Object.entries(staff).map(([name, entry]) => [personKey(name), { canonicalName: name, ...entry }]));
  for (const person of people) {
    for (const alias of person.aliases) {
      const canonicalName = aliasLookup[personKey(alias)] || alias;
      const manual = staffLookup[personKey(canonicalName)];
      if (!manual) continue;
      person.aliases = unique([...person.aliases, manual.canonicalName]);
      if (manual.section) {
        person.section = manual.section;
        person.domain = manual.domain || sectionDomains[manual.section] || "";
        person.sectionSource = manual.sourceUrl || "data/advisor-sections.json";
      }
      break;
    }
  }
}

async function enrichFromProfiles(people) {
  await mapConcurrent(
    people,
    async (person, index) => {
      if (!person.profileUrl) return person;
      try {
        await sleep(index * 80);
        const html = await fetchText(person.profileUrl, 2);
        const text = stripHtml(html);
        const section = findSectionInText(text);
        if (section.section) {
          person.section = section.section;
          person.domain = section.domain;
          person.sectionSource = person.profileUrl;
        }
        const pureProfileUrl = extractPureProfileUrl(html);
        if (pureProfileUrl) person.pureProfileUrl = pureProfileUrl;
      } catch (error) {
        person.profileFetchError = error.message;
      }
      return person;
    },
    PROFILE_CONCURRENCY
  );
  return people;
}

async function main() {
  const [html, advisorSections] = await Promise.all([fetchText(SOURCE_URL), loadAdvisorSections()]);
  const people = mergePeople(parsePeoplePage(html));
  await enrichFromProfiles(people);
  applyManualSections(people, advisorSections);
  people.sort((a, b) => a.displayName.localeCompare(b.displayName));
  const staff = people.map((person) => ({
    displayName: person.displayName,
    rawNames: unique(person.rawNames),
    aliases: unique(person.aliases).sort((a, b) => a.localeCompare(b)),
    profileUrl: person.profileUrl,
    pureProfileUrl: person.pureProfileUrl || "",
    section: person.section,
    domain: person.domain,
    sectionSource: person.sectionSource,
    profileFetchError: person.profileFetchError || ""
  }));
  const output = {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    note: "Generated from the public TU Delft ESS people page and linked TU Delft staff profiles. Used as the hard inclusion list for harvested records.",
    stats: {
      staffFound: staff.length,
      staffWithProfile: staff.filter((person) => person.profileUrl).length,
      staffWithSection: staff.filter((person) => person.section).length,
      staffWithoutSection: staff.filter((person) => !person.section).length
    },
    sectionPatterns: SECTION_PATTERNS,
    staff
  };
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${staff.length} ESS staff records to ${OUT_FILE}`);
  console.log(`${output.stats.staffWithSection} staff entries have a section/domain assignment`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
