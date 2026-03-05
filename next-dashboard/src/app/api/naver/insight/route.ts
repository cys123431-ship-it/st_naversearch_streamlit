import { NextResponse } from "next/server";
import { naverPost } from "@/lib/naver";

type InsightPoint = {
  period: string;
  ratio: number;
};

type InsightResult = {
  title: string;
  data: InsightPoint[];
};

type InsightResponse = {
  results: InsightResult[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      category: string;
      keywords: string[];
      startDate: string;
      endDate: string;
    };

    const keywords = (body.keywords || []).map((k) => k.trim()).filter(Boolean);
    if (!keywords.length) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }

    const payload = {
      startDate: body.startDate,
      endDate: body.endDate,
      timeUnit: "date",
      category: body.category,
      keyword: keywords.map((kw) => ({ name: kw, param: [kw] })),
    };

    const api = await naverPost<InsightResponse>(
      "https://openapi.naver.com/v1/datalab/shopping/category/keywords",
      payload,
    );

    const rows = (api.results || []).flatMap((result) =>
      (result.data || []).map((d) => ({
        keyword: result.title,
        period: d.period,
        ratio: d.ratio,
      })),
    );

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "쇼핑인사이트 API 호출 실패" },
      { status: 500 },
    );
  }
}
