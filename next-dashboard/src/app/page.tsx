"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
};

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

const CHART_COLORS = ["#1a3cff", "#20c997", "#ff5470", "#ff9f1c", "#4b3fce", "#26a0fc", "#7cc66f", "#7f4de8"];

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

  const [googleGeo, setGoogleGeo] = useState("KR");
  const [googleTimeframe, setGoogleTimeframe] = useState("today 12-m");

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

  const keywords = useMemo(() => parseKeywords(keywordsRaw), [keywordsRaw]);

  const selectedCategory = insightCategory === "manual" ? manualCategory.trim() : insightCategory;

  const trendKeywords = useMemo(() => Array.from(new Set(trendRows.map((r) => r.keyword))), [trendRows]);

  const trendChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();

    for (const row of trendRows) {
      if (!map.has(row.period)) {
        map.set(row.period, { period: row.period });
      }
      map.get(row.period)![row.keyword] = row.ratio;
    }

    return Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [trendRows]);

  const insightKeywords = useMemo(() => Array.from(new Set(insightRows.map((r) => r.keyword))), [insightRows]);

  const insightChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();

    for (const row of insightRows) {
      if (!map.has(row.period)) {
        map.set(row.period, { period: row.period });
      }
      map.get(row.period)![row.keyword] = row.ratio;
    }

    return Array.from(map.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [insightRows]);

  const priceStats = useMemo(() => {
    const prices = shopItems
      .map((item) => Number(item.lprice || "0"))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (!prices.length) {
      return { avg: 0, min: 0, max: 0 };
    }

    const sum = prices.reduce((acc, cur) => acc + cur, 0);
    return {
      avg: sum / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [shopItems]);

  const trendPeak = useMemo(() => {
    if (!trendRows.length) return { keyword: "-", ratio: 0, period: "-" };

    return trendRows.reduce((max, row) => (row.ratio > max.ratio ? row : max), trendRows[0]);
  }, [trendRows]);

  const totalContent = blogItems.length + cafeItems.length + newsItems.length;

  const googleTrendsUrl = useMemo(() => {
    const query = keywords.join(",");
    if (!query) return "https://trends.google.com/trends/explore";
    const params = new URLSearchParams({
      date: googleTimeframe,
      q: query,
    });
    if (googleGeo) params.set("geo", googleGeo);
    return `https://trends.google.com/trends/explore?${params.toString()}`;
  }, [keywords, googleGeo, googleTimeframe]);

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

  async function runAnalysis() {
    if (!keywords.length) {
      setErrorMsg("키워드를 1개 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const payload = {
      keywords,
      startDate,
      endDate,
    };

    const requests = await Promise.allSettled([
      postJson<{ rows: TrendRow[] }>("/api/naver/trend", payload),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "shop", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "blog", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "cafearticle", display: 100 }),
      postJson<{ items: SearchItem[] }>("/api/naver/search", { ...payload, type: "news", display: 100 }),
      postJson<{ rows: TrendRow[] }>("/api/naver/insight", { ...payload, category: selectedCategory }),
    ]);

    const errors: string[] = [];

    if (requests[0].status === "fulfilled") setTrendRows(requests[0].value.rows || []);
    else {
      setTrendRows([]);
      errors.push(`트렌드: ${requests[0].reason instanceof Error ? requests[0].reason.message : "실패"}`);
    }

    if (requests[1].status === "fulfilled") setShopItems(requests[1].value.items || []);
    else {
      setShopItems([]);
      errors.push(`쇼핑: ${requests[1].reason instanceof Error ? requests[1].reason.message : "실패"}`);
    }

    if (requests[2].status === "fulfilled") setBlogItems(requests[2].value.items || []);
    else {
      setBlogItems([]);
      errors.push(`블로그: ${requests[2].reason instanceof Error ? requests[2].reason.message : "실패"}`);
    }

    if (requests[3].status === "fulfilled") setCafeItems(requests[3].value.items || []);
    else {
      setCafeItems([]);
      errors.push(`카페: ${requests[3].reason instanceof Error ? requests[3].reason.message : "실패"}`);
    }

    if (requests[4].status === "fulfilled") setNewsItems(requests[4].value.items || []);
    else {
      setNewsItems([]);
      errors.push(`뉴스: ${requests[4].reason instanceof Error ? requests[4].reason.message : "실패"}`);
    }

    if (requests[5].status === "fulfilled") setInsightRows(requests[5].value.rows || []);
    else {
      setInsightRows([]);
      errors.push(`쇼핑인사이트: ${requests[5].reason instanceof Error ? requests[5].reason.message : "실패"}`);
    }

    setErrorMsg(errors.join(" | "));
    setLastUpdated(new Date().toLocaleString("ko-KR"));
    setLoading(false);
  }

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTrendTable() {
    if (!trendRows.length) {
      return <p className={styles.empty}>표시할 트렌드 데이터가 없습니다.</p>;
    }

    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>키워드</th>
              <th>날짜</th>
              <th>검색 지수</th>
            </tr>
          </thead>
          <tbody>
            {trendRows.slice(0, 30).map((row, idx) => (
              <tr key={`${row.keyword}-${row.period}-${idx}`}>
                <td>{row.keyword}</td>
                <td>{row.period}</td>
                <td>{row.ratio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderShopTable() {
    if (!shopItems.length) {
      return <p className={styles.empty}>표시할 쇼핑 데이터가 없습니다.</p>;
    }

    return (
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
            {shopItems.slice(0, 40).map((item, idx) => (
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
    );
  }

  function renderContentTable(items: SearchItem[], type: "blog" | "cafe" | "news") {
    if (!items.length) {
      return <p className={styles.empty}>표시할 데이터가 없습니다.</p>;
    }

    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>키워드</th>
              <th>제목</th>
              <th>{type === "news" ? "발행일" : "작성일"}</th>
              <th>링크</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 40).map((item, idx) => (
              <tr key={`${item.searchKeyword}-${idx}`}>
                <td>{item.searchKeyword}</td>
                <td>{stripHtml(item.title)}</td>
                <td>{type === "news" ? toShortDate(item.pubDate || "") : toShortDate(item.postdate || "")}</td>
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
    );
  }

  function renderInsightTable() {
    if (!insightRows.length) {
      return <p className={styles.empty}>표시할 쇼핑인사이트 데이터가 없습니다.</p>;
    }

    return (
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
            {insightRows.slice(0, 40).map((row, idx) => (
              <tr key={`${row.keyword}-${row.period}-${idx}`}>
                <td>{row.keyword}</td>
                <td>{row.period}</td>
                <td>{row.ratio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTab() {
    switch (activeTab) {
      case "trend":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>검색 트렌드 비교</h3>
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
                        <Line
                          key={keyword}
                          type="monotone"
                          dataKey={keyword}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>트렌드 차트 데이터가 없습니다.</p>
              )}
            </div>
            <div className={styles.panelCard}>
              <h3>트렌드 원본 데이터</h3>
              {renderTrendTable()}
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
              <h3>실시간 쇼핑 결과</h3>
              {renderShopTable()}
            </div>
          </section>
        );

      case "blog":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>블로그 수집 결과</h3>
              {renderContentTable(blogItems, "blog")}
            </div>
          </section>
        );

      case "cafe":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>카페 수집 결과</h3>
              {renderContentTable(cafeItems, "cafe")}
            </div>
          </section>
        );

      case "news":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>뉴스 수집 결과</h3>
              {renderContentTable(newsItems, "news")}
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
                        <Line
                          key={keyword}
                          type="monotone"
                          dataKey={keyword}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.empty}>쇼핑인사이트 데이터가 없습니다.</p>
              )}
            </div>
            <div className={styles.panelCard}>
              <h3>쇼핑인사이트 원본 데이터</h3>
              {renderInsightTable()}
            </div>
          </section>
        );

      case "report":
        return (
          <section className={styles.tabPanel}>
            <div className={styles.panelCard}>
              <h3>종합 요약</h3>
              <div className={styles.reportText}>
                <p>
                  <strong>트렌드 최고점</strong>: {trendPeak.keyword} / {trendPeak.period} / {trendPeak.ratio.toFixed(2)}
                </p>
                <p>
                  <strong>시장 가격대</strong>: 평균 {toCurrency(priceStats.avg)} · 최저 {toCurrency(priceStats.min)} · 최고{" "}
                  {toCurrency(priceStats.max)}
                </p>
                <p>
                  <strong>콘텐츠 반응량</strong>: 블로그 {blogItems.length.toLocaleString("ko-KR")}건, 카페{" "}
                  {cafeItems.length.toLocaleString("ko-KR")}건, 뉴스 {newsItems.length.toLocaleString("ko-KR")}건
                </p>
                <p>
                  <strong>실무 활용</strong>: 키워드별 상승 시점과 가격 분포, 콘텐츠 채널 비중을 함께 보면서 마케팅 집행 순서를
                  정하는 데 사용할 수 있습니다.
                </p>
              </div>
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
              <iframe src={googleTrendsUrl} title="Google Trends" className={styles.googleFrame} />
            </div>
          </section>
        );

      default:
        return null;
    }
  }

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
            <textarea
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              rows={4}
              placeholder="예: 오메가3, 비타민D, 유산균"
            />
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
              <input
                type="text"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                placeholder="예: 50000008"
              />
            </label>
          ) : null}

          <button className={styles.analyzeBtn} onClick={runAnalysis} disabled={loading}>
            {loading ? "분석 중..." : "실시간 분석 실행"}
          </button>

          <p className={styles.caption}>API 상태: {statusReady ? "정상" : "미설정"}</p>
          <p className={styles.caption}>키 소스: {statusSource}</p>
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
            <span>{startDate} ~ {endDate}</span>
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
            <button
              key={tab.id}
              className={clsx(styles.tabButton, activeTab === tab.id && styles.tabButtonActive)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {renderTab()}
      </main>
    </div>
  );
}
