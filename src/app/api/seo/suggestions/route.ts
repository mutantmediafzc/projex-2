import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, keywords, projectType, currentMetrics } = body;

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const prompt = `You are an expert SEO and AEO (Answer Engine Optimization) consultant. Analyze the following website and provide actionable content suggestions.

Domain: ${domain}
Project Type: ${projectType || "SEO & AEO"}
Current Target Keywords: ${keywords?.join(", ") || "Not specified"}
Current Metrics: ${currentMetrics ? JSON.stringify(currentMetrics) : "Not available"}

Provide 5-8 content suggestions in JSON format with the following structure:
{
  "suggestions": [
    {
      "type": "blog_topic" | "keyword_opportunity" | "content_gap" | "trending_topic" | "aeo_question" | "optimization_tip",
      "title": "Brief title",
      "description": "Detailed description of the suggestion",
      "keywords": ["relevant", "keywords"],
      "priority_score": 1-100,
      "estimated_impact": "low" | "medium" | "high",
      "implementation_effort": "low" | "medium" | "high"
    }
  ],
  "trending_topics": [
    {
      "topic": "Trending topic name",
      "relevance": "Why it's relevant to this domain",
      "suggested_angle": "How to approach this topic"
    }
  ],
  "aeo_opportunities": [
    {
      "question": "Question people are asking",
      "suggested_answer_format": "How to structure the answer",
      "target_featured_snippet": true | false
    }
  ]
}

Focus on:
1. Content gaps that competitors might be filling
2. Long-tail keyword opportunities
3. Questions people ask (for AEO/featured snippets)
4. Trending topics in the industry
5. Technical SEO improvements
6. Content optimization tips

Return ONLY valid JSON, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // Try to parse the JSON response
    let suggestions;
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, "").trim();
      suggestions = JSON.parse(cleanedResponse);
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json({ 
        error: "Failed to parse AI suggestions",
        raw: responseText 
      }, { status: 500 });
    }

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    console.error("AI suggestions error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
