"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./page.module.css";

type TabId =
  | "trend"
  | "shop"
  | "blog"
  | "cafe"
  | "news"
  | "insight"
  | "report"
  | "google";

type TrendRow = {
  keyword: string;
  period: string;
  ratio: number;
  gender?: string;
  baseKeyword?: string;
};

type SearchItem = {
  title: string;
  link: string;
  description: string;
  searchKeyword: string;
  lprice?: string;
  mallName?: string;
  bloggername?: string;
  postdate?: string;
  pubDate?: string;
  cafename?: string;
  image?: string;
};

type TrendsEmbedApi = {
  renderExploreWidgetTo?: (
    container: Element,
    widgetType: string,
    request: {
      comparisonItem: Array<{ keyword: string; geo: string; time: string }>;
      category: number;
      property: string;
    },
    options: {
      exploreQuery: string;
      guestPath: string;
    },
  ) => void;
};

declare global {
  interface Window {
    trends?: {
      embed?: TrendsEmbedApi;
    };
  }
}

const TABS: { id: TabId; label: string }[] = [
  { id: "trend", label: "트렌드 비교" },
  { id: "shop", label: "실시간 쇼핑" },
  { id: "blog", label: "실시간 블로그" },
  { id: "cafe", label: "실시간 카페" },
  { id: "news", label: "실시간 뉴스" },
  { id: "insight", label: "쇼핑인사이트" },
  { id: "report", label: "종합 리포트" },
  { id: "google", label: "구글 트렌드" },
];

const INSIGHT_CATEGORIES = [
  { label: "패션의류", value: "50000000" },
  { label: "패션잡화", value: "50000001" },
  { label: "화장품/미용", value: "50000002" },
  { label: "디지털/가전", value: "50000003" },
  { label: "가구/인테리어", value: "50000004" },
  { label: "출산/육아", value: "50000005" },
  { label: "식품", value: "50000006" },
  { label: "스포츠/레저", value: "50000007" },
  { label: "생활/건강", value: "50000008" },
  { label: "여가/생활편의", value: "50000009" },
  { label: "면세점", value: "50000010" },
  { label: "도서", value: "50000011" },
  { label: "직접 입력", value: "manual" },
] as const;

const AGE_OPTIONS = [
  { label: "0~12세", code: "1" },
  { label: "13~18세", code: "2" },
  { label: "19~24세", code: "3" },
  { label: "25~29세", code: "4" },
  { label: "30~34세", code: "5" },
  { label: "35~39세", code: "6" },
  { label: "40~44세", code: "7" },
  { label: "45~49세", code: "8" },
  { label: "50~54세", code: "9" },
  { label: "55~59세", code: "10" },
  { label: "60세 이상", code: "11" },
] as const;

const CHART_COLORS = ["#1a3cff", "#20c997", "#ff5470", "#ff9f1c", "#4b3fce", "#26a0fc", "#7cc66f", "#7f4de8"];

const PAGE_SIZE = {
  trend: 20,
  shop: 20,
  blog: 20,
  cafe: 20,
  news: 20,
  insight: 20,
} as const;

type PageKey = keyof typeof PAGE_SIZE;

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseKeywords(raw: string) {
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function toCurrency(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function toShortDate(value: string) {
  if (!value) return "-";
  const normalized = value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, cur) => acc + cur, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = average(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

function escapeCsvCell(value: unknown) {
  const stringified = String(value ?? "");
  const escaped = stringified.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

function downloadFile(fileName: string, content: string, mimeType: string) {
  if (!content) return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getTopWords(texts: string[], limit = 15) {
  const stopWords = new Set(["있는", "에서", "으로", "하고", "보다", "하는", "대한", "관련", "최신", "가장", "입니다", "the", "and", "for"]);
  const counts = new Map<string, number>();

  for (const text of texts) {
    const words = stripHtml(text)
      .toLowerCase()
      .replace(/[^0-9a-zA-Z가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w));

    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

async function postJson<T>(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "API 호출 중 오류가 발생했습니다.");
  }

  return data;
}

function withPagination<T>(rows: T[], page: number, size: number) {
  const total = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(page, 1), total);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    current,
    total,
  };
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const oneYearAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    return d;
  }, []);

  const [keywordsRaw, setKeywordsRaw] = useState("오메가3, 비타민D, 유산균");
  const [startDate, setStartDate] = useState(toDateInput(oneYearAgo));
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [insightCategory, setInsightCategory] = useState("50000008");
  const [manualCategory, setManualCategory] = useState("50000000");
  const [activeTab, setActiveTab] = useState<TabId>("trend");

  const [analysisMode, setAnalysisMode] = useState<"general" | "gender_compare">("general");
  const [trendGender, setTrendGender] = useState<"" | "m" | "f">("");
  const [selectedAgeCodes, setSelectedAgeCodes] = useState<string[]>([]);

  const [shopKeywordFilter, setShopKeywordFilter] = useState("전체");
  const [shopViewMode, setShopViewMode] = useState<"table" | "thumb">("table");
  const [blogKeywordFilter, setBlogKeywordFilter] = useState("전체");
  const [cafeKeywordFilter, setCafeKeywordFilter] = useState("전체");
  const [newsKeywordFilter, setNewsKeywordFilter] = useState("전체");

  const [googleGeo, setGoogleGeo] = useState("KR");
  const [googleTimeframe, setGoogleTimeframe] = useState("today 12-m");
  const [googleWidgetError, setGoogleWidgetError] = useState("");

  const [statusReady, setStatusReady] = useState(false);
  const [statusSource, setStatusSource] = useState("확인 중");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("-");

  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [shopItems, setShopItems] = useState<SearchItem[]>([]);
  const [blogItems, setBlogItems] = useState<SearchItem[]>([]);
  const [cafeItems, setCafeItems] = useState<SearchItem[]>([]);
  const [newsItems, setNewsItems] = useState<SearchItem[]>([]);
  const [insightRows, setInsightRows] = useState<TrendRow[]>([]);

  const [pages, setPages] = useState<Record<PageKey, number>>({
    trend: 1,
    shop: 1,
    blog: 1,
    cafe: 1,
    news: 1,
    insight: 1,
  });

  const keywords = useMemo(() => parseKeywords(keywordsRaw), [keywordsRaw]);
  const selectedCategory = insightCategory === "manual" ? manualCategory.trim() : insightCategory;

  const trendKeywords = useMemo(() => Array.from(new Set(trendRows.map((r) => r.keyword))), [trendRows]);
  const insightKeywords = useMemo(() => Array.from(new Set(insightRows.map((r) => r.keyword))), [insightRows]);

  const trendChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const row of trendRows) {
      if (!map.has(row.period)) map.set(row.period, { period: row.period });
      map.get(row.period)![row.keyword] = row.ratio;
    }
    return Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [trendRows]);

  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, Map<string, { sum: number; count: number }>>();

    for (const row of trendRows) {
      const month = row.period.slice(0, 7);
      if (!monthMap.has(month)) monthMap.set(month, new Map());
      const keyMap = monthMap.get(month)!;
      if (!keyMap.has(row.keyword)) keyMap.set(row.keyword, { sum: 0, count: 0 });
      const agg = keyMap.get(row.keyword)!;
      agg.sum += row.ratio;
      agg.count += 1;
    }

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, keywordMap]) => {
        const row: Record<string, string | number> = { month };
        for (const [keyword, agg] of keywordMap.entries()) {
          row[keyword] = agg.sum / agg.count;
        }
        return row;
      });
  }, [trendRows]);

  const insightChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const row of insightRows) {
      if (!map.has(row.period)) map.set(row.period, { period: row.period });
      map.get(row.period)![row.keyword] = row.ratio;
    }
    return Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [insightRows]);

  const trendStats = useMemo(() => {
    return trendKeywords.map((keyword) => {
      const data = trendRows.filter((row) => row.keyword === keyword).map((row) => row.ratio);
      const recent7 = data.slice(-7);
      const recent30 = data.slice(-30);
      return {
        keyword,
        avg: average(data),
        max: data.length ? Math.max(...data) : 0,
        min: data.length ? Math.min(...data) : 0,
        sd: stdDev(data),
        recent7: average(recent7),
        recent30: average(recent30),
      };
    });
  }, [trendKeywords, trendRows]);

  const insightStats = useMemo(() => {
    return insightKeywords.map((keyword) => {
      const rows = insightRows.filter((r) => r.keyword === keyword).sort((a, b) => a.period.localeCompare(b.period));
      const ratios = rows.map((r) => r.ratio);
      const peak = rows.reduce((best, row) => (row.ratio > best.ratio ? row : best), rows[0] || { keyword, period: "-", ratio: 0 });
      const recent7 = ratios.slice(-7);
      const prev7 = ratios.slice(-14, -7);
      const change = average(prev7) > 0 ? ((average(recent7) - average(prev7)) / average(prev7)) * 100 : 0;
      return {
        keyword,
        avg: average(ratios),
        max: ratios.length ? Math.max(...ratios) : 0,
        min: ratios.length ? Math.min(...ratios) : 0,
        peakDate: peak.period,
        peakRatio: peak.ratio,
        change,
      };
    });
  }, [insightKeywords, insightRows]);

  const priceStats = useMemo(() => {
    const prices = shopItems.map((item) => Number(item.lprice || "0")).filter((price) => Number.isFinite(price) && price > 0);
    if (!prices.length) return { avg: 0, min: 0, max: 0 };
    return {
      avg: average(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [shopItems]);

  const trendPeak = useMemo(() => {
    if (!trendRows.length) return { keyword: "-", ratio: 0, period: "-" };
    return trendRows.reduce((max, row) => (row.ratio > max.ratio ? row : max), trendRows[0]);
  }, [trendRows]);

  const totalContent = blogItems.length + cafeItems.length + newsItems.length;
  const contentShare = useMemo(
    () => [
      { name: "Blog", value: blogItems.length },
      { name: "Cafe", value: cafeItems.length },
      { name: "News", value: newsItems.length },
    ],
    [blogItems.length, cafeItems.length, newsItems.length],
  );

  const googleTrendsUrl = useMemo(() => {
    const query = keywords.join(",");
    if (!query) return "https://trends.google.com/trends/explore";
    const params = new URLSearchParams({ date: googleTimeframe, q: query });
    if (googleGeo) params.set("geo", googleGeo);
    return `https://trends.google.com/trends/explore?${params.toString()}`;
  }, [keywords, googleGeo, googleTimeframe]);

  const reportText = useMemo(
    () => `1. 트렌드 최고점: ${trendPeak.keyword} / ${trendPeak.period} / ${trendPeak.ratio.toFixed(2)}
2. 시장 가격대: 평균 ${toCurrency(priceStats.avg)} · 최저 ${toCurrency(priceStats.min)} · 최고 ${toCurrency(priceStats.max)}
3. 콘텐츠 반응량: 블로그 ${blogItems.length.toLocaleString("ko-KR")}건, 카페 ${cafeItems.length.toLocaleString("ko-KR")}건, 뉴스 ${newsItems.length.toLocaleString("ko-KR")}건
4. 활용 제안: 키워드별 상승 시점, 가격 분포, 채널 반응을 함께 보고 집행 순서를 결정하세요.`,
    [blogItems.length, cafeItems.length, newsItems.length, priceStats.avg, priceStats.max, priceStats.min, trendPeak.keyword, trendPeak.period, trendPeak.ratio],
  );

  const filteredShopItems = useMemo(
    () => (shopKeywordFilter === "전체" ? shopItems : shopItems.filter((item) => item.searchKeyword === shopKeywordFilter)),
    [shopItems, shopKeywordFilter],
  );
  const filteredBlogItems = useMemo(
    () => (blogKeywordFilter === "전체" ? blogItems : blogItems.filter((item) => item.searchKeyword === blogKeywordFilter)),
    [blogItems, blogKeywordFilter],
  );
  const filteredCafeItems = useMemo(
    () => (cafeKeywordFilter === "전체" ? cafeItems : cafeItems.filter((item) => item.searchKeyword === cafeKeywordFilter)),
    [cafeItems, cafeKeywordFilter],
  );
  const filteredNewsItems = useMemo(
    () => (newsKeywordFilter === "전체" ? newsItems : newsItems.filter((item) => item.searchKeyword === newsKeywordFilter)),
    [newsItems, newsKeywordFilter],
  );

  const blogTopWords = useMemo(() => getTopWords(blogItems.map((item) => item.title)), [blogItems]);
  const cafeTopWords = useMemo(() => getTopWords(cafeItems.map((item) => item.title)), [cafeItems]);
  const newsTopWords = useMemo(() => getTopWords(newsItems.map((item) => item.title)), [newsItems]);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = (await res.json()) as { ready: boolean; source: string };
        if (!mounted) return;
        setStatusReady(data.ready);
        setStatusSource(data.source);
      } catch {
        if (!mounted) return;
        setStatusReady(false);
        setStatusSource("상태 확인 실패");
      }
    }

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "google") return;

    const container = document.getElementById("google-trends-widget");
    if (!container) return;

    if (!keywords.length) {
      container.innerHTML = "<p style='padding:16px;color:#68759c'>키워드를 1개 이상 입력하면 위젯이 표시됩니다.</p>";
      setGoogleWidgetError("");
      return;
    }

    let timeoutId = 0;

    const renderWidget = () => {
      const embed = window.trends?.embed;
      if (!embed?.renderExploreWidgetTo) {
        setGoogleWidgetError("구글 트렌드 위젯 로더를 불러오지 못했습니다.");
        return;
      }

      container.innerHTML = "";
      setGoogleWidgetError("");

      const comparisonItem = keywords.map((keyword) => ({
        keyword,
        geo: googleGeo,
        time: googleTimeframe,
      }));

      const exploreQuery = new URLSearchParams({
        q: keywords.join(","),
        date: googleTimeframe,
      });
      if (googleGeo) exploreQuery.set("geo", googleGeo);

      embed.renderExploreWidgetTo(
        container,
        "TIMESERIES",
        {
          comparisonItem,
          category: 0,
          property: "",
        },
        {
          exploreQuery: exploreQuery.toString(),
          guestPath: "https://trends.google.com/trends/embed/",
        },
      );

      timeoutId = window.setTimeout(() => {
        if (!container.querySelector("iframe")) {
          setGoogleWidgetError("브라우저 환경에서 위젯 표시가 제한되었습니다. 새 탭 버튼으로 열어주세요.");
        }
      }, 2500);
    };

    const existing = document.getElementById("google-trends-script") as HTMLScriptElement | null;
    if (window.trends?.embed?.renderExploreWidgetTo) {
      renderWidget();
      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    if (existing) {
      existing.addEventListener("load", renderWidget);
      return () => {
        existing.removeEventListener("load", renderWidget);
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    const script = document.createElement("script");
    script.id = "google-trends-script";
    script.src = "https://ssl.gstatic.com/trends_nrtr/4012_RC01/embed_loader.js";
    script.async = true;
    script.onload = renderWidget;
    script.onerror = () => setGoogleWidgetError("구글 트렌드 스크립트 로드에 실패했습니다.");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [activeTab, googleGeo, googleTimeframe, keywords]);

  function resetPages() {
    setPages({ trend: 1, shop: 1, blog: 1, cafe: 1, news: 1, insight: 1 });
  }

  function toggleAge(code: string) {
    setSelectedAgeCodes((prev) => (prev.includes(code) ? prev.filter((value) => value !== code) : [...prev, code]));
  }

  function setPage(key: PageKey, page: number) {
    setPages((prev) => ({ ...prev, [key]: page }));
  }

  function downloadCsv(filePrefix: string, rows: Record<string, unknown>[]) {
    const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
    downloadFile(fileName, toCsv(rows), "text/csv;charset=utf-8;");
  }

  function downloadTxt(filePrefix: string, content: string) {
    const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.txt`;
    downloadFile(fileName, content, "text/plain;charset=utf-8;");
  }

  async function runAnalysis() {
    if (!keywords.length) {
      setErrorMsg("키워드를 1개 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    resetPages();

    const payload = { keywords, startDate, endDate };
    const errors: string[] = [];

    let trendResult: TrendRow[] = [];

    if (analysisMode === "gender_compare") {
      const [mRes, fRes] = await Promise.allSettled([
        postJson<{ rows: TrendRow[] }>("/api/naver/trend", { ...payload, gender: "m", ages: selectedAgeCodes }),
        postJson<{ rows: TrendRow[] }>("/api/naver/trend", { ...payload, gender: "f", ages: selectedAgeCodes }),
      ]);

      if (mRes.status === "fulfilled") {
        trendResult.push(
          ...(mRes.value.rows || []).map((row) => ({
            ...row,
            baseKeyword: row.keyword,
            gender: "남성",
            keyword: `${row.keyword} (남성)`,
          })),
        );
      } else {
        errors.push(`트렌드(남성): ${mRes.reason instanceof Error ? mRes.reason.message : "실패"}`);
      }

      if (fRes.status === "fulfilled") {
        trendResult.push(
          ...(fRes.value.rows || []).map((row) => ({
            ...row,
            baseKeyword: row.keyword,
            gender: "여성",
            keyword: `${row.keyword} (여성)`,
          })),
        );
      } else {
        errors.push(`트렌드(여성): ${fRes.reason instanceof Error ? fRes.reason.message : "실패"}`);
      }
    } else {
      const trendRes = await Promise.allSettled([
        postJson<{ rows: TrendRow[] }>("/api/naver/trend", {
          ...payload,
          gender: trendGender || undefined,
          ages: selectedAgeCodes,
        }),
      ]);

      if (trendRes[0].status === "fulfilled") {
        trendResult = (trendRes[0].value.rows || []).map((row) => ({
          ...row,
          baseKeyword: row.keyword,
          gender: trendGender === "m" ? "남성" : trendGender === "f" ? "여성" : "전체",
        }));
      } else {
        errors.push(`트렌드: ${trendRes[0].reason instanceof Error ? trendRes[0].reason.message : "실패"}`);
      }
    }

    setTrendRows(trendResult);

    const requests = await Promise.allSettled([
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "shop", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "blog", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "cafearticle", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "news", display: 100 }),
      postJson<{ rows: TrendRow[] }>("/api/naver/insight", { ...payload, category: selectedCategory }),
    ]);

    if (requests[0].status === "fulfilled") setShopItems(requests[0].value.items || []);
    else {
      setShopItems([]);
      errors.push(`쇼핑: ${requests[0].reason instanceof Error ? requests[0].reason.message : "실패"}`);
    }

    if (requests[1].status === "fulfilled") setBlogItems(requests[1].value.items || []);
    else {
      setBlogItems([]);
      errors.push(`블로그: ${requests[1].reason instanceof Error ? requests[1].reason.message : "실패"}`);
    }

    if (requests[2].status === "fulfilled") setCafeItems(requests[2].value.items || []);
    else {
      setCafeItems([]);
      errors.push(`카페: ${requests[2].reason instanceof Error ? requests[2].reason.message : "실패"}`);
    }

    if (requests[3].status === "fulfilled") setNewsItems(requests[3].value.items || []);
    else {
      setNewsItems([]);
      errors.push(`뉴스: ${requests[3].reason instanceof Error ? requests[3].reason.message : "실패"}`);
    }

    if (requests[4].status === "fulfilled") {
      setInsightRows((requests[4].value.rows || []).map((row) => ({ ...row, baseKeyword: row.keyword })));
    } else {
      setInsightRows([]);
      errors.push(`쇼핑인사이트: ${requests[4].reason instanceof Error ? requests[4].reason.message : "실패"}`);
    }

    setErrorMsg(errors.join(" | "));
    setLastUpdated(new Date().toLocaleString("ko-KR"));
    setLoading(false);
  }

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderPager(key: PageKey, total: number, current: number) {
    if (total <= 1) return null;
    return (
      <div className={styles.pager}>
        <button type="button" onClick={() => setPage(key, current - 1)} disabled={current <= 1}>
          이전
        </button>
        <span>
          {current} / {total}
        </span>
        <button type="button" onClick={() => setPage(key, current + 1)} disabled={current >= total}>
          다음
        </button>
      </div>
    );
  }

  function renderWordChips(words: { word: string; count: number }[]) {
    if (!words.length) return <p className={styles.empty}>표시할 키워드가 없습니다.</p>;
    return (
      <div className={styles.wordChipWrap}>
        {words.map((item) => (
          <span key={item.word} className={styles.wordChip}>
            {item.word} ({item.count})
          </span>
        ))}
      </div>
    );
  }

  function renderTab() {
    const trendPaged = withPagination(trendRows, pages.trend, PAGE_SIZE.trend);
    const shopPaged = withPagination(filteredShopItems, pages.shop, PAGE_SIZE.shop);
    const blogPaged = withPagination(filteredBlogItems, pages.blog, PAGE_SIZE.blog);
    const cafePaged = withPagination(filteredCafeItems, pages.cafe, PAGE_SIZE.cafe);
    const newsPaged = withPagination(filteredNewsItems, pages.news, PAGE_SIZE.news);
    const insightPaged = withPagination(insightRows, pages.insight, PAGE_SIZE.insight);

    switch (activeTab) {
      case "trend":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>검색 트렌드 비교</h3>
                <span className={styles.badge}>기간 {startDate} ~ {endDate}</span>
              </div>

              <div className={styles.controlRow}>
                <label>
                  분석 모드
                  <select value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value as "general" | "gender_compare")}>
                    <option value="general">일반 트렌드</option>
                    <option value="gender_compare">성별 비교</option>
                  </select>
                </label>

                {analysisMode === "general" ? (
                  <label>
                    성별
                    <select value={trendGender} onChange={(e) => setTrendGender(e.target.value as "" | "m" | "f") }>
                      <option value="">전체</option>
                      <option value="m">남성</option>
                      <option value="f">여성</option>
                    </select>
                  </label>
                ) : (
                  <div className={styles.inlineInfo}>성별 비교 모드: 남성 vs 여성</div>
                )}
              </div>

              <div className={styles.ageWrap}>
                <span className={styles.ageLabel}>연령 필터</span>
                <div className={styles.ageGrid}>
                  {AGE_OPTIONS.map((age) => (
                    <label key={age.code} className={styles.ageCheck}>
                      <input type="checkbox" checked={selectedAgeCodes.includes(age.code)} onChange={() => toggleAge(age.code)} />
                      <span>{age.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {trendChartData.length ? (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ff" />
                      <XAxis dataKey="period" tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {trendKeywords.map((keyword, idx) => (
                        <Line key={keyword} type="monotone" dataKey={keyword} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2.4} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>트렌드 차트 데이터가 없습니다.</p>
              )}
            </div>

            <div className={styles.panelCard}>
              <h3>월별 평균 트렌드</h3>
              {monthlyTrendData.length ? (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ff" />
                      <XAxis dataKey="month" tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {trendKeywords.map((keyword, idx) => (
                        <Bar key={keyword} dataKey={keyword} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[6, 6, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>월별 데이터가 없습니다.</p>
              )}
            </div>

            <div className={styles.panelCard}>
              <h3>키워드별 통계 요약</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>평균</th>
                      <th>최대</th>
                      <th>최소</th>
                      <th>변동성(표준편차)</th>
                      <th>최근 7일 평균</th>
                      <th>최근 30일 평균</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendStats.map((row) => (
                      <tr key={row.keyword}>
                        <td>{row.keyword}</td>
                        <td>{row.avg.toFixed(2)}</td>
                        <td>{row.max.toFixed(2)}</td>
                        <td>{row.min.toFixed(2)}</td>
                        <td>{row.sd.toFixed(2)}</td>
                        <td>{row.recent7.toFixed(2)}</td>
                        <td>{row.recent30.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>트렌드 원본 데이터</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!trendRows.length}
                  onClick={() =>
                    downloadCsv(
                      "trend_data",
                      trendRows.map((row) => ({
                        키워드: row.keyword,
                        성별: row.gender || "전체",
                        날짜: row.period,
                        검색지수: row.ratio,
                      })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>성별</th>
                      <th>날짜</th>
                      <th>검색 지수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendPaged.rows.map((row, idx) => (
                      <tr key={`${row.keyword}-${row.period}-${idx}`}>
                        <td>{row.keyword}</td>
                        <td>{row.gender || "전체"}</td>
                        <td>{row.period}</td>
                        <td>{row.ratio.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPager("trend", trendPaged.total, trendPaged.current)}
            </div>
          </section>
        );

      case "shop":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.rowGrid}>
              <article className={styles.miniCard}>
                <span>평균 판매가</span>
                <strong>{toCurrency(priceStats.avg)}</strong>
              </article>
              <article className={styles.miniCard}>
                <span>최저 판매가</span>
                <strong>{toCurrency(priceStats.min)}</strong>
              </article>
              <article className={styles.miniCard}>
                <span>최고 판매가</span>
                <strong>{toCurrency(priceStats.max)}</strong>
              </article>
            </div>

            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>실시간 쇼핑 결과</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!shopItems.length}
                  onClick={() =>
                    downloadCsv(
                      "shop_data",
                      shopItems.map((item) => ({
                        키워드: item.searchKeyword,
                        상품명: stripHtml(item.title),
                        판매처: item.mallName || "",
                        최저가: item.lprice ? Number(item.lprice) : "",
                        링크: item.link,
                      })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>

              <div className={styles.controlRow}>
                <label>
                  키워드 필터
                  <select value={shopKeywordFilter} onChange={(e) => setShopKeywordFilter(e.target.value)}>
                    <option value="전체">전체</option>
                    {keywords.map((keyword) => (
                      <option key={keyword} value={keyword}>
                        {keyword}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  보기 방식
                  <select value={shopViewMode} onChange={(e) => setShopViewMode(e.target.value as "table" | "thumb") }>
                    <option value="table">리스트 보기</option>
                    <option value="thumb">썸네일 보기</option>
                  </select>
                </label>
              </div>

              {shopViewMode === "table" ? (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>키워드</th>
                          <th>상품명</th>
                          <th>판매처</th>
                          <th>최저가</th>
                          <th>링크</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopPaged.rows.map((item, idx) => (
                          <tr key={`${item.searchKeyword}-${idx}`}>
                            <td>{item.searchKeyword}</td>
                            <td>{stripHtml(item.title)}</td>
                            <td>{item.mallName || "-"}</td>
                            <td>{item.lprice ? `${Number(item.lprice).toLocaleString("ko-KR")}원` : "-"}</td>
                            <td>
                              <a href={item.link} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                                보기
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPager("shop", shopPaged.total, shopPaged.current)}
                </>
              ) : (
                <>
                  <div className={styles.thumbGrid}>
                    {shopPaged.rows.map((item, idx) => (
                      <article key={`${item.searchKeyword}-thumb-${idx}`} className={styles.thumbCard}>
                        {item.image ? <img src={item.image} alt={stripHtml(item.title)} /> : <div className={styles.noImage}>No Image</div>}
                        <h4>{stripHtml(item.title)}</h4>
                        <p>{item.mallName || "-"}</p>
                        <strong>{item.lprice ? `${Number(item.lprice).toLocaleString("ko-KR")}원` : "-"}</strong>
                        <a href={item.link} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                          상세보기
                        </a>
                      </article>
                    ))}
                  </div>
                  {renderPager("shop", shopPaged.total, shopPaged.current)}
                </>
              )}
            </div>
          </section>
        );

      case "blog":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>블로그 수집 결과</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!blogItems.length}
                  onClick={() =>
                    downloadCsv(
                      "blog_data",
                      blogItems.map((item) => ({
                        키워드: item.searchKeyword,
                        제목: stripHtml(item.title),
                        작성일: toShortDate(item.postdate || ""),
                        링크: item.link,
                      })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>

              <div className={styles.controlRow}>
                <label>
                  키워드 필터
                  <select value={blogKeywordFilter} onChange={(e) => setBlogKeywordFilter(e.target.value)}>
                    <option value="전체">전체</option>
                    {keywords.map((keyword) => (
                      <option key={keyword} value={keyword}>
                        {keyword}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <h4 className={styles.subTitle}>자주 등장한 단어</h4>
              {renderWordChips(blogTopWords)}

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>제목</th>
                      <th>작성일</th>
                      <th>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogPaged.rows.map((item, idx) => (
                      <tr key={`${item.searchKeyword}-${idx}`}>
                        <td>{item.searchKeyword}</td>
                        <td>{stripHtml(item.title)}</td>
                        <td>{toShortDate(item.postdate || "")}</td>
                        <td>
                          <a href={item.link} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                            이동
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPager("blog", blogPaged.total, blogPaged.current)}
            </div>
          </section>
        );

      case "cafe":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>카페 수집 결과</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!cafeItems.length}
                  onClick={() =>
                    downloadCsv(
                      "cafe_data",
                      cafeItems.map((item) => ({
                        키워드: item.searchKeyword,
                        제목: stripHtml(item.title),
                        작성일: toShortDate(item.postdate || ""),
                        링크: item.link,
                      })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>

              <div className={styles.controlRow}>
                <label>
                  키워드 필터
                  <select value={cafeKeywordFilter} onChange={(e) => setCafeKeywordFilter(e.target.value)}>
                    <option value="전체">전체</option>
                    {keywords.map((keyword) => (
                      <option key={keyword} value={keyword}>
                        {keyword}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <h4 className={styles.subTitle}>자주 등장한 단어</h4>
              {renderWordChips(cafeTopWords)}

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>제목</th>
                      <th>작성일</th>
                      <th>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cafePaged.rows.map((item, idx) => (
                      <tr key={`${item.searchKeyword}-${idx}`}>
                        <td>{item.searchKeyword}</td>
                        <td>{stripHtml(item.title)}</td>
                        <td>{toShortDate(item.postdate || "")}</td>
                        <td>
                          <a href={item.link} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                            이동
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPager("cafe", cafePaged.total, cafePaged.current)}
            </div>
          </section>
        );

      case "news":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>뉴스 수집 결과</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!newsItems.length}
                  onClick={() =>
                    downloadCsv(
                      "news_data",
                      newsItems.map((item) => ({
                        키워드: item.searchKeyword,
                        제목: stripHtml(item.title),
                        발행일: toShortDate(item.pubDate || ""),
                        링크: item.link,
                      })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>

              <div className={styles.controlRow}>
                <label>
                  키워드 필터
                  <select value={newsKeywordFilter} onChange={(e) => setNewsKeywordFilter(e.target.value)}>
                    <option value="전체">전체</option>
                    {keywords.map((keyword) => (
                      <option key={keyword} value={keyword}>
                        {keyword}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <h4 className={styles.subTitle}>자주 등장한 단어</h4>
              {renderWordChips(newsTopWords)}

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>제목</th>
                      <th>발행일</th>
                      <th>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newsPaged.rows.map((item, idx) => (
                      <tr key={`${item.searchKeyword}-${idx}`}>
                        <td>{item.searchKeyword}</td>
                        <td>{stripHtml(item.title)}</td>
                        <td>{toShortDate(item.pubDate || "")}</td>
                        <td>
                          <a href={item.link} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                            이동
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPager("news", newsPaged.total, newsPaged.current)}
            </div>
          </section>
        );

      case "insight":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>쇼핑인사이트 클릭 추이</h3>
              {insightChartData.length ? (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={insightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ff" />
                      <XAxis dataKey="period" tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#5e6788", fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      {insightKeywords.map((keyword, idx) => (
                        <Line key={keyword} type="monotone" dataKey={keyword} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2.4} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>쇼핑인사이트 데이터가 없습니다.</p>
              )}
            </div>

            <div className={styles.panelCard}>
              <h3>키워드별 쇼핑인사이트 통계</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>평균</th>
                      <th>최대</th>
                      <th>최소</th>
                      <th>피크 날짜</th>
                      <th>최근 변화율(%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insightStats.map((row) => (
                      <tr key={row.keyword}>
                        <td>{row.keyword}</td>
                        <td>{row.avg.toFixed(2)}</td>
                        <td>{row.max.toFixed(2)}</td>
                        <td>{row.min.toFixed(2)}</td>
                        <td>{row.peakDate}</td>
                        <td>{Number.isFinite(row.change) ? row.change.toFixed(2) : "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>쇼핑인사이트 원본 데이터</h3>
                <button
                  type="button"
                  className={styles.downloadBtn}
                  disabled={!insightRows.length}
                  onClick={() =>
                    downloadCsv(
                      "shopping_insight_data",
                      insightRows.map((row) => ({ 키워드: row.keyword, 날짜: row.period, 클릭지수: row.ratio })),
                    )
                  }
                >
                  CSV 다운로드
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>키워드</th>
                      <th>날짜</th>
                      <th>클릭 지수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insightPaged.rows.map((row, idx) => (
                      <tr key={`${row.keyword}-${row.period}-${idx}`}>
                        <td>{row.keyword}</td>
                        <td>{row.period}</td>
                        <td>{row.ratio.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPager("insight", insightPaged.total, insightPaged.current)}
            </div>
          </section>
        );

      case "report":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <h3>종합 요약</h3>
                <button type="button" className={styles.downloadBtn} onClick={() => downloadTxt("report", reportText)}>
                  TXT 다운로드
                </button>
              </div>
              <div className={styles.reportText}>
                <p>
                  <strong>트렌드 최고점</strong>: {trendPeak.keyword} / {trendPeak.period} / {trendPeak.ratio.toFixed(2)}
                </p>
                <p>
                  <strong>시장 가격대</strong>: 평균 {toCurrency(priceStats.avg)} · 최저 {toCurrency(priceStats.min)} · 최고 {toCurrency(priceStats.max)}
                </p>
                <p>
                  <strong>콘텐츠 반응량</strong>: 블로그 {blogItems.length.toLocaleString("ko-KR")}건, 카페 {cafeItems.length.toLocaleString("ko-KR")}건, 뉴스 {newsItems.length.toLocaleString("ko-KR")}건
                </p>
                <p>
                  <strong>실무 활용</strong>: 상승 시점/가격 분포/채널 반응을 함께 보며 집행 순서와 메시지를 조정하세요.
                </p>
              </div>
            </div>

            <div className={styles.panelCard}>
              <h3>콘텐츠 채널 점유율</h3>
              {contentShare.some((item) => item.value > 0) ? (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={contentShare} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                        {contentShare.map((entry, idx) => (
                          <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>점유율을 계산할 데이터가 없습니다.</p>
              )}
            </div>
          </section>
        );

      case "google":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>구글 트렌드 빠른 이동</h3>
              <div className={styles.googleControls}>
                <label>
                  지역
                  <select value={googleGeo} onChange={(e) => setGoogleGeo(e.target.value)}>
                    <option value="">전세계</option>
                    <option value="KR">대한민국</option>
                    <option value="US">미국</option>
                    <option value="JP">일본</option>
                  </select>
                </label>
                <label>
                  기간
                  <select value={googleTimeframe} onChange={(e) => setGoogleTimeframe(e.target.value)}>
                    <option value="now 7-d">지난 7일</option>
                    <option value="today 1-m">지난 30일</option>
                    <option value="today 12-m">지난 12개월</option>
                    <option value="all">2004~현재</option>
                  </select>
                </label>
                <a href={googleTrendsUrl} target="_blank" rel="noreferrer" className={styles.primaryAction}>
                  구글 트렌드 새 탭으로 열기
                </a>
              </div>
              {googleWidgetError ? <p className={styles.errorInline}>{googleWidgetError}</p> : null}
              <div id="google-trends-widget" className={styles.googleWidget} />
            </div>
          </section>
        );

      default:
        return null;
    }
  }

  const genderText = analysisMode === "gender_compare" ? "남성 vs 여성" : trendGender === "m" ? "남성" : trendGender === "f" ? "여성" : "전체";
  const ageLabels = AGE_OPTIONS.filter((age) => selectedAgeCodes.includes(age.code)).map((age) => age.label);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <div className={styles.brandBadge}>N</div>
          <div>
            <h1>Naver Insight Lab</h1>
            <p>BankDash Rebuild · Next.js</p>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <label>
            키워드 (쉼표 구분)
            <textarea value={keywordsRaw} onChange={(e) => setKeywordsRaw(e.target.value)} rows={4} placeholder="예: 오메가3, 비타민D, 유산균" />
          </label>

          <div className={styles.inputRow}>
            <label>
              시작일
              <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              종료일
              <input type="date" value={endDate} min={startDate} max={toDateInput(today)} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <label>
            쇼핑인사이트 카테고리
            <select value={insightCategory} onChange={(e) => setInsightCategory(e.target.value)}>
              {INSIGHT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {insightCategory === "manual" ? (
            <label>
              카테고리 ID
              <input type="text" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} placeholder="예: 50000008" />
            </label>
          ) : null}

          <button className={styles.analyzeBtn} onClick={runAnalysis} disabled={loading}>
            {loading ? "분석 중..." : "실시간 분석 실행"}
          </button>

          <p className={styles.caption}>API 상태: {statusReady ? "정상" : "미설정"}</p>
          <p className={styles.caption}>키 소스: {statusSource}</p>
          <p className={styles.caption}>트렌드 필터: 성별 {genderText} {ageLabels.length ? `| 연령 ${ageLabels.join(", ")}` : "| 연령 전체"}</p>
          <p className={styles.caption}>마지막 업데이트: {lastUpdated}</p>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>NAVER DATA PLATFORM</p>
            <h2>실시간 키워드 시장 분석 대시보드</h2>
            <p className={styles.sub}>트렌드 · 쇼핑 · 콘텐츠 · 쇼핑인사이트를 한 화면에서 분석합니다.</p>
          </div>
          <div className={styles.headerMeta}>
            <span>{keywords.length}개 키워드 분석</span>
            <span>
              {startDate} ~ {endDate}
            </span>
          </div>
        </header>

        {errorMsg ? <div className={styles.errorBox}>{errorMsg}</div> : null}

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span>트렌드 최고 키워드</span>
            <strong>{trendPeak.keyword}</strong>
            <em>{trendPeak.period}</em>
          </article>
          <article className={styles.metricCard}>
            <span>평균 시장가</span>
            <strong>{toCurrency(priceStats.avg)}</strong>
            <em>쇼핑 상위 데이터 기준</em>
          </article>
          <article className={styles.metricCard}>
            <span>콘텐츠 반응량</span>
            <strong>{totalContent.toLocaleString("ko-KR")}건</strong>
            <em>블로그 + 카페 + 뉴스</em>
          </article>
          <article className={styles.metricCard}>
            <span>쇼핑인사이트 포인트</span>
            <strong>{insightRows.length.toLocaleString("ko-KR")}</strong>
            <em>카테고리 {selectedCategory || "-"}</em>
          </article>
        </section>

        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <button key={tab.id} className={clsx(styles.tabButton, activeTab === tab.id && styles.tabButtonActive)} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        {renderTab()}
      </main>
    </div>
  );
}
