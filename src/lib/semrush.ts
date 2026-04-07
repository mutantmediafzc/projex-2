// SEMrush API Integration Service
const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY || "f9ad9c77fdbd2b57d551867ab800d380";
const SEMRUSH_BASE_URL = "https://api.semrush.com";

export type SemrushDomainOverview = {
  domain: string;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adwordsKeywords: number;
  adwordsTraffic: number;
  adwordsCost: number;
  plaBudget: number;
  plaUniqKeywords: number;
  backlinks: number;
  referringDomains: number;
  domainAuthority: number;
};

export type SemrushKeyword = {
  keyword: string;
  position: number;
  previousPosition: number;
  searchVolume: number;
  cpc: number;
  url: string;
  traffic: number;
  trafficPercent: number;
  trafficCost: number;
  competition: number;
  trends: string;
  timestamp: string;
};

export type SemrushBacklink = {
  sourceUrl: string;
  targetUrl: string;
  anchor: string;
  domainAuthority: number;
  pageAuthority: number;
  external: boolean;
  nofollow: boolean;
  firstSeen: string;
  lastSeen: string;
};

export type SemrushProject = {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
};

// Parse SEMrush CSV response
function parseSemrushResponse<T>(csv: string, mapper: (row: string[]) => T): T[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  
  const results: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(";");
    try {
      results.push(mapper(row));
    } catch {
      // Skip invalid rows
    }
  }
  return results;
}

// Get domain overview
export async function getDomainOverview(domain: string, database = "us"): Promise<SemrushDomainOverview | null> {
  try {
    const params = new URLSearchParams({
      type: "domain_ranks",
      key: SEMRUSH_API_KEY,
      export_columns: "Dn,Or,Ot,Oc,Ad,At,Ac,Sh,Sv",
      domain,
      database,
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return null;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const values = lines[1].split(";");
    return {
      domain: values[0] || domain,
      organicKeywords: parseInt(values[1]) || 0,
      organicTraffic: parseInt(values[2]) || 0,
      organicCost: parseFloat(values[3]) || 0,
      adwordsKeywords: parseInt(values[4]) || 0,
      adwordsTraffic: parseInt(values[5]) || 0,
      adwordsCost: parseFloat(values[6]) || 0,
      plaBudget: parseFloat(values[7]) || 0,
      plaUniqKeywords: parseInt(values[8]) || 0,
      backlinks: 0,
      referringDomains: 0,
      domainAuthority: 0,
    };
  } catch (error) {
    console.error("Error fetching domain overview:", error);
    return null;
  }
}

// Get organic keywords for a domain
export async function getOrganicKeywords(
  domain: string,
  database = "us",
  limit = 100
): Promise<SemrushKeyword[]> {
  try {
    const params = new URLSearchParams({
      type: "domain_organic",
      key: SEMRUSH_API_KEY,
      export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr,Tc,Co,Td,Ts",
      domain,
      database,
      display_limit: limit.toString(),
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return [];
    }

    return parseSemrushResponse(text, (row) => ({
      keyword: row[0] || "",
      position: parseInt(row[1]) || 0,
      previousPosition: parseInt(row[2]) || 0,
      searchVolume: parseInt(row[3]) || 0,
      cpc: parseFloat(row[4]) || 0,
      url: row[5] || "",
      traffic: parseFloat(row[6]) || 0,
      trafficPercent: parseFloat(row[7]) || 0,
      trafficCost: parseFloat(row[8]) || 0,
      competition: parseFloat(row[9]) || 0,
      trends: row[10] || "",
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching organic keywords:", error);
    return [];
  }
}

// Get keyword overview
export async function getKeywordOverview(keyword: string, database = "us") {
  try {
    const params = new URLSearchParams({
      type: "phrase_this",
      key: SEMRUSH_API_KEY,
      export_columns: "Ph,Nq,Cp,Co,Nr,Td",
      phrase: keyword,
      database,
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return null;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const values = lines[1].split(";");
    return {
      keyword: values[0] || keyword,
      searchVolume: parseInt(values[1]) || 0,
      cpc: parseFloat(values[2]) || 0,
      competition: parseFloat(values[3]) || 0,
      results: parseInt(values[4]) || 0,
      trend: values[5] || "",
    };
  } catch (error) {
    console.error("Error fetching keyword overview:", error);
    return null;
  }
}

// Get related keywords
export async function getRelatedKeywords(keyword: string, database = "us", limit = 20) {
  try {
    const params = new URLSearchParams({
      type: "phrase_related",
      key: SEMRUSH_API_KEY,
      export_columns: "Ph,Nq,Cp,Co,Nr,Td",
      phrase: keyword,
      database,
      display_limit: limit.toString(),
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return [];
    }

    return parseSemrushResponse(text, (row) => ({
      keyword: row[0] || "",
      searchVolume: parseInt(row[1]) || 0,
      cpc: parseFloat(row[2]) || 0,
      competition: parseFloat(row[3]) || 0,
      results: parseInt(row[4]) || 0,
      trend: row[5] || "",
    }));
  } catch (error) {
    console.error("Error fetching related keywords:", error);
    return [];
  }
}

// Get backlinks overview
export async function getBacklinksOverview(domain: string) {
  try {
    const params = new URLSearchParams({
      type: "backlinks_overview",
      key: SEMRUSH_API_KEY,
      target: domain,
      target_type: "root_domain",
      export_columns: "total,domains_num,urls_num,ips_num,follows_num,nofollows_num,texts_num,images_num",
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/analytics/v1/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return null;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const values = lines[1].split(";");
    return {
      totalBacklinks: parseInt(values[0]) || 0,
      referringDomains: parseInt(values[1]) || 0,
      referringUrls: parseInt(values[2]) || 0,
      referringIps: parseInt(values[3]) || 0,
      followLinks: parseInt(values[4]) || 0,
      nofollowLinks: parseInt(values[5]) || 0,
      textLinks: parseInt(values[6]) || 0,
      imageLinks: parseInt(values[7]) || 0,
    };
  } catch (error) {
    console.error("Error fetching backlinks overview:", error);
    return null;
  }
}

// Get domain competitors
export async function getDomainCompetitors(domain: string, database = "us", limit = 10) {
  try {
    const params = new URLSearchParams({
      type: "domain_organic_organic",
      key: SEMRUSH_API_KEY,
      export_columns: "Dn,Cr,Np,Or,Ot,Oc,Ad",
      domain,
      database,
      display_limit: limit.toString(),
    });

    const response = await fetch(`${SEMRUSH_BASE_URL}/?${params}`);
    const text = await response.text();

    if (text.includes("ERROR")) {
      console.error("SEMrush API error:", text);
      return [];
    }

    return parseSemrushResponse(text, (row) => ({
      domain: row[0] || "",
      competitionLevel: parseFloat(row[1]) || 0,
      commonKeywords: parseInt(row[2]) || 0,
      organicKeywords: parseInt(row[3]) || 0,
      organicTraffic: parseInt(row[4]) || 0,
      organicCost: parseFloat(row[5]) || 0,
      adwordsKeywords: parseInt(row[6]) || 0,
    }));
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return [];
  }
}

// Utility to format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// Utility to calculate keyword difficulty label
export function getKeywordDifficultyLabel(difficulty: number): { label: string; color: string } {
  if (difficulty < 30) return { label: "Easy", color: "text-green-600 bg-green-50" };
  if (difficulty < 50) return { label: "Medium", color: "text-yellow-600 bg-yellow-50" };
  if (difficulty < 70) return { label: "Hard", color: "text-orange-600 bg-orange-50" };
  return { label: "Very Hard", color: "text-red-600 bg-red-50" };
}
