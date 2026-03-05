import { NextResponse } from "next/server";
import { naverGet } from "@/lib/naver";

type SearchType = "shop" | "blog" | "cafearticle" | "news";

type SearchItem = {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  postdate?: string;
  pubDate?: string;
  lprice?: string;
  mallName?: string;
  [key: string]: unknown;
};

type SearchResponse = {
  items: SearchItem[];
};

const validTypes: SearchType[] = ["shop", "blog", "cafearticle", "news"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      type: SearchType;
      keywords: string[];
      display?: number;
    };

    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: "지원하지 않는 검색 타입입니다." }, { status: 400 });
    }

    const keywords = (body.keywords || []).map((k) => k.trim()).filter(Boolean);
    if (!keywords.length) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }

    const display = Math.max(1, Math.min(100, body.display ?? 100));

    const allItems: (SearchItem & { searchKeyword: string })[] = [];

    for (const keyword of keywords) {
      const url = `https://openapi.naver.com/v1/search/${body.type}.json?query=${encodeURIComponent(keyword)}&display=${display}`;
      const api = await naverGet<SearchResponse>(url);
      const merged = (api.items || []).map((item) => ({
        ...item,
        searchKeyword: keyword,
      }));
      allItems.push(...merged);
    }

    return NextResponse.json({ items: allItems });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "검색 API 호출 실패" },
      { status: 500 },
    );
  }
}
