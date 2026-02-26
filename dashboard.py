import streamlit as st
import pandas as pd
import plotly.express as px
import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from wordcloud import WordCloud
st.set_page_config(page_title="Naver Market Insights", layout="wide", page_icon="⚡")
st.sidebar.header("🎨 테마 설정")
is_dark = st.sidebar.toggle("다크 모드", value=False)
theme_cls = "dark" if is_dark else "light"
plotly_template = "plotly_dark" if is_dark else "plotly_white"
if is_dark:
    bg_color = "#0E1117"
    card_bg = "#1A1C24"
    text_color = "#FFFFFF"
    header_color = "#79A3FF"
    accent_color = "#00D4FF"
    border_color = "#30363D"
    tab_bg = "#21262D"
    tab_active_bg = "#30363D"
    grid_color = "rgba(255, 255, 255, 0.1)"
else:
    bg_color = "#F8F9FA"
    card_bg = "#FFFFFF"
    text_color = "#1F2937"
    header_color = "#1E3A8A"
    accent_color = "#3B82F6"
    border_color = "#E5E7EB"
    tab_bg = "#F3F4F6"
    tab_active_bg = "#FFFFFF"
    grid_color = "rgba(0, 0, 0, 0.05)"
def update_chart_style(fig):
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color=text_color, family="'Outfit', sans-serif"),
        margin=dict(t=50, b=50, l=50, r=50),
        hoverlabel=dict(bgcolor=card_bg, font_size=13, font_family="'Outfit', sans-serif"),
        xaxis=dict(gridcolor=grid_color, zerolinecolor=grid_color),
        yaxis=dict(gridcolor=grid_color, zerolinecolor=grid_color),
    )
    return fig
st.markdown(f"""
    <style>
    .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"] {{
        background-color: {bg_color};
        color: {text_color};
    }}
    [data-testid="stSidebar"] {{
        background-color: {card_bg};
        border-right: 1px solid {border_color};
    }}
    [data-testid="stSidebar"] .stMarkdown {{
        color: {text_color};
    }}
    .main {{ background-color: {bg_color}; color: {text_color}; }}
    .stMetric {{ 
        background-color: {card_bg}; 
        padding: 15px; 
        border-radius: 10px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        border: 1px solid {border_color}; 
    }}
    div[data-testid="stMetricValue"] {{ color: {text_color}; }}
    div[data-testid="stMetricLabel"] {{ color: {text_color}; opacity: 0.9; font-weight: 500; }}
    h1, h2, h3 {{ color: {header_color} !important; font-family: 'Outfit', sans-serif; }}
    .stTabs [data-baseweb="tab-list"] {{ gap: 10px; background-color: transparent; }}
    .stTabs [data-baseweb="tab"] {{
        padding: 10px 20px;
        background-color: {tab_bg};
        border-radius: 5px 5px 0 0;
        font-weight: 600;
        color: {text_color};
        border: none;
    }}
    .stTabs [aria-selected="true"] {{ 
        background-color: {tab_active_bg} !important; 
        border-top: 4px solid {accent_color} !important; 
        color: {accent_color} !important; 
    }}
    .stMarkdown, label, .stText, p, span, div {{ color: {text_color}; }}
    .stWidgetLabel p {{ color: {text_color} !important; font-weight: 500; font-size: 1rem; }}
    [data-testid="stSidebar"] label, [data-testid="stSidebar"] .stMarkdown p {{
        color: {text_color} !important;
        font-weight: 500;
    }}
    .stExpander, [data-testid="stExpander"] {{ 
        background-color: {card_bg} !important; 
        border: 1px solid {border_color} !important; 
        border-radius: 10px; 
    }}
    .stExpander header p, [data-testid="stExpander"] summary p, [data-testid="stExpander"] label p {{ 
        color: {header_color} !important; 
        font-weight: 600 !important; 
        font-size: 1.1rem !important; 
    }}
    .fixed-footer {{
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        background-color: {card_bg}f2;
        padding: 10px 20px;
        border-radius: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        font-size: 14px;
        font-weight: 700;
        border: 2px solid {accent_color};
    }}
    div[data-baseweb="select"] {{
        background-color: {tab_bg} !important;
        color: {text_color} !important;
    }}
    div[data-baseweb="select"] * {{
        color: {text_color} !important;
    }}
    .stTextInput>div>div>input, .stSelectbox>div>div, .stMultiSelect>div {{
        background-color: {tab_bg} !important;
        color: {text_color} !important;
        border-color: {border_color} !important;
    }}
    span[data-baseweb="tag"] {{
        background-color: {accent_color}33 !important;
        color: {text_color} !important;
        border: 1px solid {accent_color}77 !important;
    }}
    div[data-testid="stRadio"] label p {{
        color: {text_color} !important;
    }}
    </style>
""", unsafe_allow_html=True)
def get_api_keys():
    cid, csec = None, None
    try:
        if 'NAVER_CLIENT_ID' in st.secrets:
            cid = st.secrets['NAVER_CLIENT_ID']
            csec = st.secrets['NAVER_CLIENT_SECRET']
    except Exception:
        pass
    if not cid or not csec:
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            load_dotenv(env_path, override=True)
            cid = os.getenv('NAVER_CLIENT_ID')
            csec = os.getenv('NAVER_CLIENT_SECRET')
    if cid: cid = str(cid).strip().strip("'").strip('"')
    if csec: csec = str(csec).strip().strip("'").strip('"')
    return cid, csec
CLIENT_ID, CLIENT_SECRET = get_api_keys()
HEADERS = {"X-Naver-Client-Id": CLIENT_ID, "X-Naver-Client-Secret": CLIENT_SECRET, "Content-Type": "application/json"}
@st.cache_data(ttl=600)
def fetch_realtime_trend(keywords, start_date, end_date, gender=None, ages=None):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    url = "https://openapi.naver.com/v1/datalab/search"
    body = {"startDate": start_date, "endDate": end_date, "timeUnit": "date", "keywordGroups": [{"groupName": k, "keywords": [k]} for k in keywords]}
    if gender: body["gender"] = gender
    if ages and len(ages) > 0: body["ages"] = ages
    res = requests.post(url, headers=HEADERS, data=json.dumps(body))
    if res.status_code == 200:
        dfs = [pd.DataFrame(r['data']).assign(keyword=r['title']) for r in res.json()['results']]
        return pd.concat(dfs), None
    return None, f"Trend API Error: {res.status_code}"
@st.cache_data(ttl=600)
def fetch_realtime_shopping(keywords):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/shop.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items: item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None
@st.cache_data(ttl=600)
def fetch_realtime_blog(keywords):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/blog.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items: item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None
@st.cache_data(ttl=600)
def fetch_realtime_cafe(keywords):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/cafearticle.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items: item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None
@st.cache_data(ttl=600)
def fetch_realtime_news(keywords):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/news.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items: item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None
@st.cache_data(ttl=600)
def fetch_shopping_insight_trend(cat_id, keywords, start_date, end_date):
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정", None
    url = "https://openapi.naver.com/v1/datalab/shopping/category/keywords"
    body = {"startDate": start_date, "endDate": end_date, "timeUnit": "date", "category": cat_id, "keyword": [{"name": k, "param": [k]} for k in keywords]}
    res = requests.post(url, headers=HEADERS, data=json.dumps(body))
    response_data = None
    try: response_data = res.json()
    except: pass
    if res.status_code == 200:
        results = response_data.get('results', []) if response_data else []
        if not results: return pd.DataFrame(), None, response_data
        dfs = []
        for r in results:
            if 'data' in r and r['data']:
                df = pd.DataFrame(r['data'])
                df['keyword'] = r['title']
                dfs.append(df)
        return (pd.concat(dfs) if dfs else pd.DataFrame()), None, response_data
    else:
        error_msg = f"API 오류 (상태코드: {res.status_code})"
        if response_data and 'errorMessage' in response_data: error_msg += f" - {response_data['errorMessage']}"
        return None, error_msg, response_data
def clean_html(text):
    if pd.isna(text): return ""
    return text.replace('<b>', '').replace('</b>', '').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
@st.cache_data
def generate_wordcloud(text):
    if not text: return None
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_font_path = os.path.join(current_dir, "fonts", "NanumGothic.ttf")
    mac_font_path = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
    linux_font_path = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
    font_path = next((p for p in [project_font_path, mac_font_path, linux_font_path] if os.path.exists(p)), None)
    try:
        return WordCloud(font_path=font_path, width=800, height=400, background_color="white", max_words=100).generate(text)
    except:
        return WordCloud(width=800, height=400, background_color="white").generate(text)
@st.cache_data
def convert_df(df): return df.to_csv(index=False).encode('utf-8-sig')
def paginate(df, page_size, key_prefix):
    if df is None or df.empty: return None
    total_pages = (len(df) - 1) // page_size + 1
    page_key = f"{key_prefix}_current_page"
    if page_key not in st.session_state: st.session_state[page_key] = 1
    col1, col2, col3 = st.columns([1, 2, 1])
    with col1:
        if st.button("이전", key=f"{key_prefix}_prev", disabled=st.session_state[page_key] <= 1):
            st.session_state[page_key] -= 1
            st.rerun()
    with col2: st.write(f"페이지 **{st.session_state[page_key]}** / {total_pages}")
    with col3:
        if st.button("다음", key=f"{key_prefix}_next", disabled=st.session_state[page_key] >= total_pages):
            st.session_state[page_key] += 1
            st.rerun()
    start_idx = (st.session_state[page_key] - 1) * page_size
    return df.iloc[start_idx : start_idx + page_size]
st.title("⚡ 실시간 Naver Market Insights")
st.caption("네이버 API를 통해 실시간 데이터를 직접 분석합니다.")
st.sidebar.header("🔍 실시간 분석 설정")
target_kws = st.sidebar.text_input("분석 키워드 (쉼표 구분)", "오메가3, 비타민D, 유산균")
keywords = [k.strip() for k in target_kws.split(',') if k.strip()]
st.sidebar.divider()
st.sidebar.subheader("📅 분석 기간 설정")
today = datetime.now()
one_year_ago = today - timedelta(days=365)
date_range = st.sidebar.date_input("조회 기간 선택", value=(one_year_ago, today), max_value=today)
if isinstance(date_range, tuple) and len(date_range) == 2:
    start_date, end_date = date_range[0].strftime("%Y-%m-%d"), date_range[1].strftime("%Y-%m-%d")
else:
    start_date, end_date = one_year_ago.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")
st.sidebar.divider()
st.sidebar.info(f"선택된 키워드: {', '.join(keywords)}")
tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs(["📈 트렌드 비교", "🛍️ 실시간 쇼핑", "📝 블로그", "☕ 카페", "📰 뉴스", "📊 쇼핑인사이트", "📑 종합 리포트"])
with tab1:
    st.header(f"📈 실시간 검색어 트렌드 ({start_date} ~ {end_date})")
    with st.expander("📊 분석 설정 (모드 & 인구통계)", expanded=True):
        col_mode, col_gender = st.columns(2)
        with col_mode: analysis_mode = st.radio("분석 모드", ["일반 트렌드", "성별 비교"])
        with col_gender:
            selected_gender = ""
            if analysis_mode != "성별 비교":
                gender_option = st.radio("성별", ["전체", "남성", "여성"], horizontal=True)
                selected_gender = {"전체": "", "남성": "m", "여성": "f"}[gender_option]
        age_options = ["0~12세", "13~18세", "19~24세", "25~29세", "30~34세", "35~39세", "40~44세", "45~49세", "50~54세", "55~59세", "60세 이상"]
        selected_ages = st.multiselect("연령대", age_options)
        selected_age_codes = [str(age_options.index(a) + 1) for a in selected_ages] if selected_ages else []
    df_trend, err = None, None
    if analysis_mode == "일반 트렌드": df_trend, err = fetch_realtime_trend(keywords, start_date, end_date, selected_gender, selected_age_codes)
    elif analysis_mode == "성별 비교":
        df_m, _ = fetch_realtime_trend(keywords, start_date, end_date, "m", selected_age_codes)
        df_f, _ = fetch_realtime_trend(keywords, start_date, end_date, "f", selected_age_codes)
        dfs = [df.assign(gender=g) for df, g in zip([df_m, df_f], ['남성', '여성']) if df is not None]
        df_trend = pd.concat(dfs) if dfs else None
    if err: st.error(err)
    elif df_trend is not None:
        df_trend['period'] = pd.to_datetime(df_trend['period'])
        fig1 = px.line(df_trend, x='period', y='ratio', color='keyword', facet_col='gender' if analysis_mode == "성별 비교" else None, title="실시간 검색 트렌드 추이", template=plotly_template)
        st.plotly_chart(update_chart_style(fig1), use_container_width=True)
        st.dataframe(df_trend, use_container_width=True)
with tab2:
    st.header("🛍️ 실시간 쇼핑")
    df_shop, shop_err = fetch_realtime_shopping(keywords)
    if not shop_err and df_shop is not None:
        df_shop['lprice'] = pd.to_numeric(df_shop['lprice'], errors='coerce')
        df_shop['title'] = df_shop['title'].apply(clean_html)
        cols_shop = st.columns(3)
        cols_shop[0].metric("수집된 상품", len(df_shop))
        cols_shop[1].metric("평균가", f"{int(df_shop['lprice'].mean()):,}원")
        cols_shop[2].metric("판매처", df_shop['mallName'].nunique())
        fig_shop = px.box(df_shop, x='search_keyword', y='lprice', color='search_keyword', title="가격 분포 비교", template=plotly_template)
        st.plotly_chart(update_chart_style(fig_shop), use_container_width=True)
        st.dataframe(df_shop, use_container_width=True)
for i, ckey in enumerate(["blog", "cafe", "news"]):
    with [tab3, tab4, tab5][i]:
        fetch_func = {"blog": fetch_realtime_blog, "cafe": fetch_realtime_cafe, "news": fetch_realtime_news}[ckey]
        df_c, err_c = fetch_func(keywords)
        if not err_c and df_c is not None:
            df_c['title'] = df_c['title'].apply(clean_html)
            st.metric(f"{ckey.upper()} 문서", len(df_c))
            all_txt = " ".join(df_c['title'].dropna().tolist())
            wc = generate_wordcloud(all_txt)
            if wc: st.image(wc.to_array())
            st.dataframe(df_c, use_container_width=True)
with tab6:
    st.header("📊 쇼핑인사이트")
    cat_id = "50000008"
    df_ins, err_ins, _ = fetch_shopping_insight_trend(cat_id, keywords, start_date, end_date)
    if not err_ins and df_ins is not None:
        df_ins['period'] = pd.to_datetime(df_ins['period'])
        fig_ins = px.line(df_ins, x='period', y='ratio', color='keyword', title="쇼핑 클릭 트렌드", template=plotly_template)
        st.plotly_chart(update_chart_style(fig_ins), use_container_width=True)
with tab7:
    st.header("📑 종합 리포트")
    st.write("실시간 마켓 리포트를 생성합니다.")
    # 간략 리포트 로직
    r_text = f"마켓 인사이트 리포트 ({datetime.now().strftime('%Y-%m-%d')})\n키워드: {', '.join(keywords)}"
    st.markdown(f"```\n{r_text}\n```")
    st.download_button("📥 다운로드", r_text, "report.txt")
st.sidebar.caption(f"업데이트: {datetime.now().strftime('%H:%M:%S')}")
st.sidebar.caption("[© 오늘코드](https://www.youtube.com/todaycode)")
