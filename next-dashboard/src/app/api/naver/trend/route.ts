import { NextResponse } from "next/server";
import { naverPost } from "@/lib/naver";

type TrendPoint = {
  period: string;
  ratio: number;
};

type TrendResult = {
  title: string;
  data: TrendPoint[];
};

type TrendApiResponse = {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: TrendResult[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      keywords: string[];
      startDate: string;
      endDate: string;
      gender?: string;
      ages?: string[];
    };

    const keywords = (body.keywords || []).map((k) => k.trim()).filter(Boolean);
    if (!keywords.length) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      startDate: body.startDate,
      endDate: body.endDate,
      timeUnit: "date",
      keywordGroups: keywords.map((kw) => ({ groupName: kw, keywords: [kw] })),
    };

    if (body.gender) payload.gender = body.gender;
    if (body.ages && body.ages.length) payload.ages = body.ages;

    const api = await naverPost<TrendApiResponse>(
      "https://openapi.naver.com/v1/datalab/search",
      payload,
    );

    const rows = api.results.flatMap((r) =>
      r.data.map((d) => ({
        keyword: r.title,
        period: d.period,
        ratio: d.ratio,
      })),
    );

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "트렌드 API 호출 실패" },
      { status: 500 },
    );
  }
}
