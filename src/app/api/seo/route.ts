import { NextRequest, NextResponse } from "next/server";
import { getDomainOverview, getOrganicKeywords, getKeywordOverview, getRelatedKeywords, getDomainCompetitors, getBacklinksOverview } from "@/lib/semrush";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const domain = searchParams.get("domain");
  const keyword = searchParams.get("keyword");
  const database = searchParams.get("database") || "us";
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    switch (action) {
      case "domain_overview":
        if (!domain) {
          return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }
        const overview = await getDomainOverview(domain, database);
        return NextResponse.json({ data: overview });

      case "organic_keywords":
        if (!domain) {
          return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }
        const keywords = await getOrganicKeywords(domain, database, limit);
        return NextResponse.json({ data: keywords });

      case "keyword_overview":
        if (!keyword) {
          return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
        }
        const keywordData = await getKeywordOverview(keyword, database);
        return NextResponse.json({ data: keywordData });

      case "related_keywords":
        if (!keyword) {
          return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
        }
        const relatedKeywords = await getRelatedKeywords(keyword, database, limit);
        return NextResponse.json({ data: relatedKeywords });

      case "competitors":
        if (!domain) {
          return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }
        const competitors = await getDomainCompetitors(domain, database, limit);
        return NextResponse.json({ data: competitors });

      case "backlinks":
        if (!domain) {
          return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }
        const backlinks = await getBacklinksOverview(domain);
        return NextResponse.json({ data: backlinks });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("SEO API error:", error);
    return NextResponse.json({ error: "Failed to fetch SEO data" }, { status: 500 });
  }
}
