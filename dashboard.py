import streamlit as st
import pandas as pd
import plotly.express as px
import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from wordcloud import WordCloud

# 페이지 설정
st.set_page_config(page_title="Naver Market Insights", layout="wide", page_icon="⚡")

# --- 테마 설정 ---
st.sidebar.header("🎨 테마 설정")
is_dark = st.sidebar.toggle("다크 모드", value=False)
theme_cls = "dark" if is_dark else "light"
plotly_template = "plotly_dark" if is_dark else "plotly_white"

# 테마 색상 정의
if is_dark:
    bg_color = "#0E1117"    # Streamlit 기본 다크 배경과 유사한 깊은 색상
    card_bg = "#1A1C24"    # 카드 레이어 구분
    text_color = "#FFFFFF" # 최대 대비를 위해 순백색 사용
    header_color = "#79A3FF" # 밝고 부드러운 블루
    accent_color = "#00D4FF" # 형광빛 블루로 시인성 확보
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

# Plotly 공통 레이아웃 설정 함수
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

# CSS 스타일링
st.markdown(f"""
    <style>
    /* 전역 배경 및 기본 텍스트 색상 */
    .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"] {{
        background-color: {bg_color};
        color: {text_color};
    }}
    
    /* 사이드바 스타일 */
    [data-testid="stSidebar"] {{
        background-color: {card_bg};
        border-right: 1px solid {border_color};
    }}
    [data-testid="stSidebar"] .stMarkdown {{
        color: {text_color};
    }}
    
    /* 메인 콘텐츠 영역 */
    .main {{ background-color: {bg_color}; color: {text_color}; }}
    
    /* 메트릭 카드 */
    .stMetric {{ 
        background-color: {card_bg}; 
        padding: 15px; 
        border-radius: 10px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        border: 1px solid {border_color}; 
    }}
    div[data-testid="stMetricValue"] {{ color: {text_color}; }}
    div[data-testid="stMetricLabel"] {{ color: {text_color}; opacity: 0.9; font-weight: 500; }}
    
    /* 제목 스타일 */
    h1, h2, h3 {{ color: {header_color} !important; font-family: 'Outfit', sans-serif; }}
    
    /* 탭 스타일 */
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
    
    /* 위젯 라벨 및 마크다운 */
    .stMarkdown, label, .stText, p, span, div {{ color: {text_color}; }}
    .stWidgetLabel p {{ color: {text_color} !important; font-weight: 500; font-size: 1rem; }}
    
    /* 사이드바 위젯 라벨 강제 적용 */
    [data-testid="stSidebar"] label, [data-testid="stSidebar"] .stMarkdown p {{
        color: {text_color} !important;
        font-weight: 500;
    }}
    
    /* 익스팬더 및 카드 */
    .stExpander, [data-testid="stExpander"] {{ 
        background-color: {card_bg} !important; 
        border: 1px solid {border_color} !important; 
        border-radius: 10px; 
    }}
    /* 익스팬더 헤더 제목 강제 적용 */
    .stExpander header p, [data-testid="stExpander"] summary p, [data-testid="stExpander"] label p {{ 
        color: {header_color} !important; 
        font-weight: 600 !important; 
        font-size: 1.1rem !important; 
    }}
    
    /* 하단 푸터 */
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
    
    /* 입력창 및 선택창 스타일 보정 (BaseWeb 기반) */
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
    /* 멀티셀렉트 태그 스타일 */
    span[data-baseweb="tag"] {{
        background-color: {accent_color}33 !important;
        color: {text_color} !important;
        border: 1px solid {accent_color}77 !important;
    }}
    /* 라디오 버튼 라벨 */
    div[data-testid="stRadio"] label p {{
        color: {text_color} !important;
    }}
    </style>
""", unsafe_allow_html=True)

# --- 인증 및 경로 설정 ---
def _clean_secret_value(value):
    if value is None:
        return None
    cleaned = str(value).strip().strip("'").strip('"')
    return cleaned if cleaned else None


def get_api_keys():
    """네이버 API 키를 가져옵니다. (Cloud Secrets, 환경변수, 로컬/외부 .env 지원)"""
    # 1) Streamlit Secrets (Cloud 배포시)
    try:
        if "NAVER_CLIENT_ID" in st.secrets and "NAVER_CLIENT_SECRET" in st.secrets:
            cid = _clean_secret_value(st.secrets["NAVER_CLIENT_ID"])
            csec = _clean_secret_value(st.secrets["NAVER_CLIENT_SECRET"])
            if cid and csec:
                return cid, csec, "Streamlit Secrets"
    except Exception:
        pass

    # 2) OS 환경변수
    cid = _clean_secret_value(os.getenv("NAVER_CLIENT_ID"))
    csec = _clean_secret_value(os.getenv("NAVER_CLIENT_SECRET"))
    if cid and csec:
        return cid, csec, "OS Environment"

    # 3) .env 파일 탐색 (현재 프로젝트 + 상위 naverapp)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_env_path = os.path.join(base_dir, ".env")
    sibling_naverapp_env_path = os.path.join(os.path.dirname(base_dir), "naverapp", ".env")

    env_candidates = []
    explicit_env_path = os.getenv("NAVER_ENV_PATH")
    if explicit_env_path:
        env_candidates.append(explicit_env_path)
    env_candidates.extend([project_env_path, sibling_naverapp_env_path])

    for env_path in env_candidates:
        if not env_path or not os.path.exists(env_path):
            continue
        load_dotenv(env_path, override=False)
        cid = _clean_secret_value(os.getenv("NAVER_CLIENT_ID"))
        csec = _clean_secret_value(os.getenv("NAVER_CLIENT_SECRET"))
        if cid and csec:
            return cid, csec, env_path

    return None, None, "미설정"


CLIENT_ID, CLIENT_SECRET, API_KEY_SOURCE = get_api_keys()
HEADERS = {"X-Naver-Client-Id": CLIENT_ID, "X-Naver-Client-Secret": CLIENT_SECRET, "Content-Type": "application/json"}

# --- 실시간 API 호출 함수 ---
@st.cache_data(ttl=600)
def fetch_realtime_trend(keywords, start_date, end_date, gender=None, ages=None):
    """네이버 검색어 트렌드 API 호출 (성별/연령 필터 추가)"""
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키가 설정되지 않았습니다."
    url = "https://openapi.naver.com/v1/datalab/search"
    body = {
        "startDate": start_date, "endDate": end_date,
        "timeUnit": "date",
        "keywordGroups": [{"groupName": k, "keywords": [k]} for k in keywords]
    }
    
    if gender:
        body["gender"] = gender
    if ages and len(ages) > 0:
        body["ages"] = ages
        
    res = requests.post(url, headers=HEADERS, data=json.dumps(body))
    if res.status_code == 200:
        dfs = [pd.DataFrame(r['data']).assign(keyword=r['title']) for r in res.json()['results']]
        return pd.concat(dfs), None
    return None, f"Trend API Error: {res.status_code}"

@st.cache_data(ttl=600)
def fetch_realtime_shopping(keywords):
    """네이버 쇼핑 검색 API 호출 (다중 키워드 통합)"""
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/shop.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items:
                item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None

@st.cache_data(ttl=600)
def fetch_realtime_blog(keywords):
    """네이버 블로그 검색 API 호출 (다중 키워드 통합)"""
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/blog.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items:
                item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None

@st.cache_data(ttl=600)
def fetch_realtime_cafe(keywords):
    """네이버 카페 검색 API 호출 (다중 키워드 통합)"""
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/cafearticle.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items:
                item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None

@st.cache_data(ttl=600)
def fetch_realtime_news(keywords):
    """네이버 뉴스 검색 API 호출 (다중 키워드 통합)"""
    if not CLIENT_ID or not CLIENT_SECRET: return None, "인증 키 미설정"
    all_items = []
    for kw in keywords:
        url = f"https://openapi.naver.com/v1/search/news.json?query={kw}&display=100"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            items = res.json().get('items', [])
            for item in items:
                item['search_keyword'] = kw
            all_items.extend(items)
    return pd.DataFrame(all_items) if all_items else None, None

@st.cache_data(ttl=600)
def fetch_shopping_insight_trend(cat_id, keywords, start_date, end_date):
    """쇼핑인사이트 분야 내 키워드 클릭 트렌드 API 호출"""
    if not CLIENT_ID or not CLIENT_SECRET: 
        return None, "인증 키 미설정", None
    
    url = "https://openapi.naver.com/v1/datalab/shopping/category/keywords"
    body = {
        "startDate": start_date, 
        "endDate": end_date,
        "timeUnit": "date",
        "category": cat_id,
        "keyword": [{"name": k, "param": [k]} for k in keywords]
    }
    
    res = requests.post(url, headers=HEADERS, data=json.dumps(body))
    
    # 응답 전체를 저장 (디버깅용)
    response_data = None
    try:
        response_data = res.json()
    except:
        pass
    
    if res.status_code == 200:
        results = response_data.get('results', []) if response_data else []
        
        if not results:
            # 빈 결과 - API는 성공했지만 데이터가 없음
            return pd.DataFrame(), None, response_data
        
        dfs = []
        for r in results:
            if 'data' in r and r['data']:
                df = pd.DataFrame(r['data'])
                df['keyword'] = r['title']
                dfs.append(df)
        
        if dfs:
            return pd.concat(dfs), None, response_data
        else:
            return pd.DataFrame(), None, response_data
    else:
        # API 에러
        error_msg = f"API 오류 (상태코드: {res.status_code})"
        if response_data and 'errorMessage' in response_data:
            error_msg += f" - {response_data['errorMessage']}"
        return None, error_msg, response_data


@st.cache_data(ttl=600)
def fetch_shopping_insight_demographics(cat_id):
    """쇼핑인사이트 분야별 데모그래픽(성별/연령) 분석 데이터 호출"""
    # 원칙적으로는 여러 API를 조합해야 하지만, 여기서는 성별/연령 비중 데이터를 시뮬레이션하거나 
    # 쇼핑인사이트 카테고리 키워드 API의 응답을 활용할 수 있습니다. 
    # 본 구현에서는 분야별 대표 데이터를 가져오는 로직을 구성합니다.
    return None, "준비 중인 기능입니다."

# --- 데이터 전처리 헬퍼 ---
def clean_html(text):
    """HTML 태그 제거"""
    if pd.isna(text): return ""
    return text.replace('<b>', '').replace('</b>', '').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')

@st.cache_data
def generate_wordcloud(text):
    """텍스트로 워드클라우드 생성 (한글 폰트 지원)"""
    if not text: return None
    
    # 폰트 우선순위 설정 (프로젝트 폰트 -> 시스템 폰트)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_font_path = os.path.join(current_dir, "fonts", "NanumGothic.ttf")
    mac_font_path = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
    linux_font_path = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf" # 일반적인 리눅스 경로
    
    font_path = None
    if os.path.exists(project_font_path):
        font_path = project_font_path
    elif os.path.exists(mac_font_path):
        font_path = mac_font_path
    elif os.path.exists(linux_font_path):
        font_path = linux_font_path
        
    try:
        wc = WordCloud(
            font_path=font_path, 
            width=800, 
            height=400, 
            background_color="white",
            max_words=100
        ).generate(text)
        return wc
    except Exception as e:
        logger.error(f"워드클라우드 생성 중 오류 발생: {e}")
        # 폰트 없이 재시도 (한글은 깨질 수 있음)
        return WordCloud(width=800, height=400, background_color="white").generate(text)

@st.cache_data
def convert_df(df):
    """데이터프레임을 CSV로 변환 (한글 깨짐 방지 utf-8-sig)"""
    return df.to_csv(index=False).encode('utf-8-sig')

def paginate(df, page_size, key_prefix):
    """데이터프레임 페이징 및 내비게이션 UI"""
    if df is None or df.empty:
        return None
    
    total_pages = (len(df) - 1) // page_size + 1
    
    # 세션 상태 초기화
    page_key = f"{key_prefix}_current_page"
    if page_key not in st.session_state:
        st.session_state[page_key] = 1
        
    # 페이지 선택 UI
    col1, col2, col3 = st.columns([1, 2, 1])
    with col1:
        if st.button("이전", key=f"{key_prefix}_prev", disabled=st.session_state[page_key] <= 1):
            st.session_state[page_key] -= 1
            st.rerun()
    with col2:
        st.write(f"페이지 **{st.session_state[page_key]}** / {total_pages}")
    with col3:
        if st.button("다음", key=f"{key_prefix}_next", disabled=st.session_state[page_key] >= total_pages):
            st.session_state[page_key] += 1
            st.rerun()
            
    start_idx = (st.session_state[page_key] - 1) * page_size
    end_idx = start_idx + page_size
    return df.iloc[start_idx:end_idx]

# --- 메인 UI ---
st.title("⚡ 실시간 Naver Market Insights")
st.caption("로컬 파일이 아닌, 네이버 API를 통해 실시간 데이터를 직접 분석합니다.")

# 사이드바
# API 인증 상태 진단 (오류 시에만 상단 노출)
if not CLIENT_ID or not CLIENT_SECRET:
    st.sidebar.error("❌ API 인증 키를 로드할 수 없습니다.")
    st.sidebar.markdown("""
        **해결 가이드:**
        1. 아래 경로 중 하나에 `.env` 파일 생성
           - `st_naversearch/.env`
           - `../naverapp/.env`
        2. 파일 내용 확인:
           ```text
           NAVER_CLIENT_ID=고객아이디
           NAVER_CLIENT_SECRET=비밀키
           ```
        3. 배포 환경에서는 Streamlit Secrets 사용
        4. 공백이나 따옴표 없이 입력 권장
    """)

st.sidebar.header("🔍 실시간 분석 설정")

target_kws = st.sidebar.text_input("분석 키워드 (쉼표 구분)", "오메가3, 비타민D, 유산균")
keywords = [k.strip() for k in target_kws.split(',') if k.strip()]

st.sidebar.divider()
st.sidebar.subheader("📅 분석 기간 설정")
today = datetime.now()
one_year_ago = today - timedelta(days=365)

date_range = st.sidebar.date_input(
    "조회 기간 선택",
    value=(one_year_ago, today),
    max_value=today,
    help="시작일과 종료일을 선택하세요."
)

# 날짜 범위가 적절히 선택되었는지 확인
if isinstance(date_range, tuple) and len(date_range) == 2:
    start_date = date_range[0].strftime("%Y-%m-%d")
    end_date = date_range[1].strftime("%Y-%m-%d")
else:
    # 한 날짜만 선택된 경우나 미선택 시 기본값 적용
    start_date = one_year_ago.strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    st.sidebar.warning("시작일과 종료일을 모두 선택해주세요.")

st.sidebar.divider()
st.sidebar.info(f"선택된 키워드: {', '.join(keywords)}")



st.sidebar.caption("💡 10분마다 데이터가 최신화됩니다.")

tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    "📈 트렌드 비교", "🛍️ 실시간 쇼핑", "📝 실시간 블로그", 
    "☕ 실시간 카페", "📰 실시간 뉴스", "📊 쇼핑인사이트", "📑 종합 리포트"
])

# Tab 1: 트렌드 비교
with tab1:
    st.header(f"📈 실시간 검색어 트렌드 ({start_date} ~ {end_date})")
    st.markdown("🔗 [네이버 데이터랩에서 확인하기](https://datalab.naver.com/keyword/trendSearch.naver)")

    with st.expander("📊 분석 설정 (모드 & 인구통계)", expanded=True):
        col_mode, col_gender = st.columns(2)
        with col_mode:
            analysis_mode = st.radio(
                "분석 모드", 
                ["일반 트렌드", "성별 비교"], 
                help="일반: 선택한 필터 기준 통합 추이\n성별: 남성 vs 여성 그룹별 상세 패턴 비교"
            )
        
        with col_gender:
            # 성별 선택
            selected_gender = ""
            gender_option = "전체"
            if analysis_mode != "성별 비교":
                gender_option = st.radio("성별", ["전체", "남성", "여성"], horizontal=True)
                gender_map = {"전체": "", "남성": "m", "여성": "f"}
                selected_gender = gender_map[gender_option]
            else:
                st.info("성별 비교 모드: 남성 vs 여성을 비교합니다.")
        
        # 연령 선택
        age_options = ["0~12세", "13~18세", "19~24세", "25~29세", "30~34세", "35~39세", "40~44세", "45~49세", "50~54세", "55~59세", "60세 이상"]
        age_codes = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
        age_ref = dict(zip(age_options, age_codes))
        
        selected_ages = st.multiselect("연령대 (다중 선택 가능)", age_options, placeholder="전체 연령")
        selected_age_codes = [age_ref[a] for a in selected_ages] if selected_ages else []
    
    # 필터 정보 표시
    filter_info = []
    if analysis_mode == "일반 트렌드":
        if selected_gender: filter_info.append(f"성별: {gender_option}")
        if selected_ages: filter_info.append(f"연령: {', '.join(selected_ages)}")
    elif analysis_mode == "성별 비교":
        filter_info.append("분석: 성별 비교 (남성 vs 여성)")
        if selected_ages: filter_info.append(f"연령: {', '.join(selected_ages)}")
        
    if filter_info:
        st.caption(f"적용된 필터: {' | '.join(filter_info)}")

    # --- 데이터 수집 로직 ---
    df_trend = None
    err = None
    
    if analysis_mode == "일반 트렌드":
        df_trend, err = fetch_realtime_trend(keywords, start_date, end_date, selected_gender, selected_age_codes)
    
    elif analysis_mode == "성별 비교":
        # 남성/여성 각각 호출 후 병합
        df_m, err_m = fetch_realtime_trend(keywords, start_date, end_date, "m", selected_age_codes)
        df_f, err_f = fetch_realtime_trend(keywords, start_date, end_date, "f", selected_age_codes)
        
        dfs = []
        if df_m is not None: 
            df_m['gender'] = '남성'
            dfs.append(df_m)
        if df_f is not None: 
            df_f['gender'] = '여성'
            dfs.append(df_f)
            
        if dfs:
            df_trend = pd.concat(dfs)
        else:
            err = err_m or err_f
            
    # --- 결과 시각화 ---
    if err:
        st.error(err)
    elif df_trend is not None and not df_trend.empty:
        df_trend['period'] = pd.to_datetime(df_trend['period'])
        
        st.info(f"📊 총 **{len(df_trend):,}**개의 트렌드 데이터 포인트가 분석되었습니다.")
        
        # 1. 그래프 그리기 (모드별 분기)
        if analysis_mode == "일반 트렌드":
            fig1 = px.line(df_trend, x='period', y='ratio', color='keyword', 
                           title="실시간 검색 트렌드 추이",
                           template=plotly_template, color_discrete_sequence=px.colors.qualitative.Prism)
        
        elif analysis_mode == "성별 비교":
            # 색상은 키워드, col은 성별로 구분
            fig1 = px.line(df_trend, x='period', y='ratio', color='keyword', facet_col='gender',
                           title="성별 검색 트렌드 비교 (Max 100 상대지수)",
                           template=plotly_template, color_discrete_sequence=px.colors.qualitative.Prism)
            # subplot 제목 깔끔하게
            fig1.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1]))
            
        fig1.update_layout(hovermode="x unified")
        st.plotly_chart(update_chart_style(fig1), use_container_width=True)
        
        # 비교 모드일 경우 안내 문구 추가
        if analysis_mode != "일반 트렌드":
            st.caption("""
            ⚠️ **주의**: Naver DataLab 그래프의 y축(ratio)은 해당 조건 내 최댓값을 100으로 둔 **상대적 지표**입니다. 
            서로 다른 그룹 간의 절대적인 검색량 크기 비교(예: 남성의 50과 여성의 50이 같은 검색량임)를 의미하지 않습니다. 
            각 그룹 내에서의 추세 변화 패턴을 비교하는 목적으로 활용하세요.
            """)
        
        # --- 1년 이상일 때 월별 트렌드 차트 추가 ---
        date_diff = (df_trend['period'].max() - df_trend['period'].min()).days
        if date_diff >= 365:
            st.divider()
            st.subheader("📅 월별 트렌드 추이")
            st.caption("분석 기간이 1년 이상이므로 월별 집계 트렌드를 함께 제공합니다.")
            
            # 월별 집계
            df_monthly = df_trend.copy()
            df_monthly['year_month'] = df_monthly['period'].dt.to_period('M').astype(str)
            
            if analysis_mode == "성별 비교":
                monthly_agg = df_monthly.groupby(['year_month', 'keyword', 'gender'])['ratio'].agg(
                    평균='mean', 최대='max'
                ).reset_index()
                
                fig_monthly = px.bar(
                    monthly_agg, x='year_month', y='평균', color='keyword',
                    facet_col='gender', barmode='group',
                    title="월별 평균 검색 트렌드 (성별 비교)",
                    labels={'year_month': '월', '평균': '평균 검색 지수'},
                    template=plotly_template,
                    color_discrete_sequence=px.colors.qualitative.Prism
                )
                fig_monthly.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1]))
            else:
                monthly_agg = df_monthly.groupby(['year_month', 'keyword'])['ratio'].agg(
                    평균='mean', 최대='max'
                ).reset_index()
                
                fig_monthly = px.bar(
                    monthly_agg, x='year_month', y='평균', color='keyword',
                    barmode='group',
                    title="월별 평균 검색 트렌드",
                    labels={'year_month': '월', '평균': '평균 검색 지수'},
                    template=plotly_template,
                    color_discrete_sequence=px.colors.qualitative.Prism
                )
            
            fig_monthly.update_layout(xaxis_tickangle=-45, hovermode="x unified")
            st.plotly_chart(update_chart_style(fig_monthly), use_container_width=True)
            
            # 월별 추이 라인 차트 (트렌드 흐름 파악용)
            if analysis_mode == "일반 트렌드":
                fig_monthly_line = px.line(
                    monthly_agg, x='year_month', y='최대', color='keyword',
                    title="월별 최대 검색 지수 추이",
                    labels={'year_month': '월', '최대': '최대 검색 지수'},
                    template=plotly_template,
                    markers=True,
                    color_discrete_sequence=px.colors.qualitative.Safe
                )
                st.plotly_chart(update_chart_style(fig_monthly_line), use_container_width=True)
        
        st.divider()
        
        # 그룹핑 기준 설정
        group_cols = ['keyword']
        if analysis_mode == "성별 비교": group_cols.append('gender')
        
        col1, col2 = st.columns(2)
        with col1:
            # 그래프 2: 평균 검색량 바 차트
            avg_df = df_trend.groupby(group_cols)['ratio'].mean().reset_index().sort_values('ratio', ascending=False)
            
            # 바차트 시각화
            if analysis_mode == "일반 트렌드":
                fig2 = px.bar(avg_df, x='keyword', y='ratio', color='keyword', 
                              title="평균 검색 활동 점유율", text_auto='.1f',
                              color_discrete_sequence=px.colors.qualitative.Safe)
            else:
                fig2 = px.bar(avg_df, x='keyword', y='ratio', color='gender', barmode='group',
                              title="성별/키워드별 평균 검색 강도", text_auto='.1f',
                              color_discrete_sequence=px.colors.qualitative.Safe)

            st.plotly_chart(fig2, use_container_width=True)
            
        with col2:
            # 키워드별 피크 시점 & 최근 추세
            st.subheader("🔥 키워드별 피크 & 최근 추세")
            peak_trend_data = []
            for kw in df_trend['keyword'].unique():
                kw_data = df_trend[df_trend['keyword'] == kw].sort_values('period')
                peak_row = kw_data.sort_values('ratio', ascending=False).iloc[0]
                
                recent_7 = kw_data.tail(7)['ratio'].mean()
                recent_30 = kw_data.tail(30)['ratio'].mean()
                overall_avg = kw_data['ratio'].mean()
                
                # 최근 7일 대비 전체 평균 변화율
                change_vs_avg = ((recent_7 - overall_avg) / overall_avg * 100) if overall_avg > 0 else 0
                
                peak_trend_data.append({
                    '키워드': kw,
                    '피크 날짜': peak_row['period'].strftime('%Y-%m-%d'),
                    '피크 지수': round(float(peak_row['ratio']), 1),
                    '최근7일 평균': round(recent_7, 1),
                    '전체 대비(%)': round(change_vs_avg, 1)
                })
            
            peak_trend_df = pd.DataFrame(peak_trend_data)
            st.dataframe(peak_trend_df, use_container_width=True, hide_index=True)
        
        # --- 키워드별 상세 기술 통계 ---
        st.divider()
        st.subheader("📊 키워드별 상세 기술 통계")
        st.caption("각 키워드의 검색 트렌드 지표를 다양한 관점에서 분석한 결과입니다.")
        
        detailed_stats = []
        for kw in df_trend['keyword'].unique():
            kw_data = df_trend[df_trend['keyword'] == kw].sort_values('period')
            ratio = kw_data['ratio']
            
            mean_val = ratio.mean()
            std_val = ratio.std()
            cv = (std_val / mean_val * 100) if mean_val > 0 else 0  # 변동계수(%)
            
            recent_7 = kw_data.tail(7)['ratio'].mean()
            recent_30 = kw_data.tail(30)['ratio'].mean()
            
            detailed_stats.append({
                '키워드': kw,
                '평균': round(mean_val, 2),
                '중앙값': round(ratio.median(), 2),
                '최솟값': round(ratio.min(), 2),
                '최댓값': round(ratio.max(), 2),
                '표준편차': round(std_val, 2),
                '변동계수(%)': round(cv, 1),
                '최근7일 평균': round(recent_7, 2),
                '최근30일 평균': round(recent_30, 2)
            })
        
        stats_df = pd.DataFrame(detailed_stats)
        st.dataframe(stats_df, use_container_width=True, hide_index=True)
        
        # 기술 통계 해석 도움말
        with st.expander("💡 통계 지표 해석 가이드"):
            st.markdown("""
            | 지표 | 설명 |
            |------|------|
            | **평균** | 분석 기간 전체의 평균 검색 지수 |
            | **중앙값** | 데이터의 정중앙 값 (이상치 영향을 덜 받음) |
            | **최솟값 / 최댓값** | 기간 내 가장 낮은/높은 검색 지수 |
            | **표준편차** | 검색 지수의 흩어진 정도 (클수록 변동이 큼) |
            | **변동계수(%)** | 평균 대비 표준편차 비율. 키워드 간 변동성을 비교할 때 유용 |
            | **최근 7일 / 30일 평균** | 최근 단기·중기 트렌드. 전체 평균과 비교하여 상승/하락세 판단 |
            """)

        st.subheader("📋 전체 데이터 목록")
        st.dataframe(df_trend, use_container_width=True)
        st.download_button(
            label="📥 트렌드 데이터 다운로드 (CSV)",
            data=convert_df(df_trend),
            file_name=f"trend_search_{analysis_mode}_{start_date}_{end_date}.csv",
            mime="text/csv"
        )

# Tab 2: 실시간 쇼핑
with tab2:
    st.header("🛍️ 통합 실시간 쇼핑 마켓 현황")
    df_shop, shop_err = fetch_realtime_shopping(keywords)
    if shop_err:
        st.error(shop_err)
    elif df_shop is not None:
        # 데이터 전처리
        df_shop['lprice'] = pd.to_numeric(df_shop['lprice'], errors='coerce')
        df_shop['title'] = df_shop['title'].apply(clean_html)
        
        # KPI 섹션 (통합)
        m1, m2, m3 = st.columns(3)
        m1.metric("수집된 전체 상품", f"{len(df_shop)}개")
        m2.metric("전체 평균가", f"{int(df_shop['lprice'].mean()):,}원")
        m3.metric("활성 판매처", f"{df_shop['mallName'].nunique()}개")
        
        col3, col4 = st.columns([1, 1])
        with col3:
            # 그래프 3: 키워드별 가격 분포 박스 플롯
            fig3 = px.box(df_shop, x='search_keyword', y='lprice', color='search_keyword',
                          title="키워드별 최저가 분포 (Box Plot)",
                          labels={'lprice': '최저가(원)', 'search_keyword': '검색어'},
                          template=plotly_template)
            st.plotly_chart(update_chart_style(fig3), use_container_width=True)
            
        with col4:
            # 그래프 4: 가격 분포 히스토그램 (신규 추가)
            fig_hist = px.histogram(df_shop, x='lprice', color='search_keyword',
                                   title="키워드별 가격 분포 (Histogram)",
                                   labels={'lprice': '최저가(원)', 'search_keyword': '검색어', 'count': '빈도'},
                                   barmode='overlay', # 여러 키워드가 겹쳐 보일 수 있도록 설정
                                   marginal='rug',   # 하단에 러그 플롯 추가 (밀도 확인용)
                                   template=plotly_template)
            st.plotly_chart(update_chart_style(fig_hist), use_container_width=True)
            
        st.divider()

        # 기존 상품 비중 차트는 하단에 배치하거나 레이아웃을 조정
        col5, col6 = st.columns([1, 1])
        with col5:
             kw_counts = df_shop['search_keyword'].value_counts().reset_index()
             kw_counts.columns = ['키워드', '상품 수']
             fig4 = px.bar(kw_counts, x='키워드', y='상품 수', color='키워드',
                           title="키워드별 수집 상품 비중",
                           text_auto=True,
                           color_discrete_sequence=px.colors.qualitative.Pastel)
             st.plotly_chart(update_chart_style(fig4), use_container_width=True)
        
        with col6:
            # 판매처별 빈도수 막대그래프 (하단 섹션에서 위로 이동 또는 중복 조정)
            mall_counts = df_shop['mallName'].value_counts().head(10).reset_index()
            mall_counts.columns = ['판매처', '상품 수']
            fig_mall = px.bar(mall_counts, x='상품 수', y='판매처', orientation='h',
                              title="채널별 상품 노출 빈도 (TOP 10)",
                              color='상품 수', color_continuous_scale='GnBu')
            st.plotly_chart(update_chart_style(fig_mall), use_container_width=True)
            
        st.divider()
        
        # 추가 통계 섹션
        st.subheader("📊 쇼핑 마켓 심층 분석")
        s_col1, s_col2 = st.columns([1, 1])
        
        with s_col1:
            # 제품별 가격 기술 통계
            st.markdown("#### 💰 가격 기술 통계")
            price_stats = df_shop.groupby('search_keyword')['lprice'].describe().reset_index()
            price_stats.columns = ['키워드', '개수', '평균가', '표준편차', '최솟값', '25%', '50%', '75%', '최댓값']
            # 보기 좋게 포맷팅
            price_stats[['평균가', '최솟값', '50%', '최댓값']] = price_stats[['평균가', '최솟값', '50%', '최댓값']].applymap(lambda x: f"{int(x):,}원" if not pd.isna(x) else "-")
            st.dataframe(price_stats[['키워드', '평균가', '최솟값', '50%', '최댓값']], use_container_width=True, hide_index=True)
            
        with s_col2:
            # 판매처별 빈도수 막대그래프
            st.markdown("#### 🏪 상위 판매처 분포")
            mall_counts = df_shop['mallName'].value_counts().head(10).reset_index()
            mall_counts.columns = ['판매처', '상품 수']
            fig_mall = px.bar(mall_counts, x='상품 수', y='판매처', orientation='h',
                              title="채널별 상품 노출 빈도 (TOP 10)",
                              color='상품 수', color_continuous_scale='GnBu')
            st.plotly_chart(fig_mall, use_container_width=True)
            
        st.divider()
        col_title, col_kw_filter, col_view = st.columns([2, 1, 1])
        with col_title:
            st.subheader("🛒 실시간 인기 상품 리스트")
        with col_kw_filter:
            # 키워드 필터 추가
            filter_options = ["전체"] + keywords
            selected_kw = st.selectbox("키워드 필터", filter_options, label_visibility="collapsed")
        with col_view:
            view_mode = st.radio("보기 모드", ["목록보기", "섬네일 목록"], horizontal=True, label_visibility="collapsed")
        
        # 데이터 필터링
        if selected_kw == "전체":
            # 전체 보기 시 키워드별로 상품이 섞이도록 처리 (랜덤 선택 대신 키워드별 순차 노출 고려 가능)
            display_df = df_shop.copy()
            # 키워드별로 상위권을 우선 노출하기 위해 정렬 유지 또는 재정렬
        else:
            display_df = df_shop[df_shop['search_keyword'] == selected_kw]
        
        if view_mode == "목록보기":
            # 상품 카드 레이아웃 구현 (이미지 + 상세정보)
            # 페이징 적용
            paged_df = paginate(display_df, 20, "shop_list")
            if paged_df is not None:
                for idx, row in paged_df.iterrows():
                    with st.container():
                        col_img, col_info = st.columns([1, 4])
                        
                        with col_img:
                            # 상품 이미지 표시
                            if row.get('image'):
                                st.image(row['image'], use_container_width=True)
                            else:
                                st.info("이미지 없음")
                        
                        with col_info:
                            # 상품명 (링크 연결)
                            st.markdown(f"### [{row['title']}]({row['link']})")
                            
                            # 가격 및 카테고리
                            p_col1, p_col2 = st.columns(2)
                            with p_col1:
                                st.write(f"**💰 최저가:** {int(row['lprice']):,}원")
                            with p_col2:
                                st.write(f"**📁 카테고리:** {row['category1']}")
                            
                            # 판매처 및 키워드
                            st.write(f"**🏪 판매처:** {row['mallName']} | **🔑 키워드:** {row['search_keyword']}")
                            
                            # 바로가기 버튼
                            st.link_button("상품 보러가기", row['link'], use_container_width=True)
                        
                        st.divider()
        else:
            # 섬네일 목록 (그리드 레이아웃)
            # 페이징 적용
            paged_df = paginate(display_df, 12, "shop_thumb")
            if paged_df is not None:
                cols_per_row = 4
                for i in range(0, len(paged_df), cols_per_row):
                    cols = st.columns(cols_per_row)
                    for j in range(cols_per_row):
                        if i + j < len(paged_df):
                            row = paged_df.iloc[i + j]
                            with cols[j]:
                                if row.get('image'):
                                    st.image(row['image'], use_container_width=True)
                                st.markdown(f"**[{row['title']}]({row['link']})**")
                                st.write(f"💰 {int(row['lprice']):,}원")
                                st.caption(f"🏪 {row['mallName']} | {row['search_keyword']}")
                                st.link_button("보기", row['link'], use_container_width=True)
                    st.write("") # 간격 조정

        st.download_button(
             label="📥 쇼핑 데이터 다운로드 (CSV)",
             data=convert_df(df_shop),
             file_name=f"realtime_shopping_{datetime.now().strftime('%Y%m%d')}.csv",
             mime="text/csv"
        )

# Tab 3: 실시간 블로그
with tab3:
    st.header("📝 실시간 블로그 반응 통합 분석")
    df_blog, blog_err = fetch_realtime_blog(keywords)
    if blog_err:
        st.error(blog_err)
    elif df_blog is not None:
        df_blog['title'] = df_blog['title'].apply(clean_html)
        df_blog['postdate'] = pd.to_datetime(df_blog['postdate'], format='%Y%m%d', errors='coerce')
        
        st.metric("수집된 블로그 문서", f"{len(df_blog):,}건")
        
        # 키워드별 게시물 추이
        blog_daily = df_blog.groupby(['postdate', 'search_keyword']).size().reset_index(name='content_count')
        fig5 = px.line(blog_daily, x='postdate', y='content_count', color='search_keyword',
                       title="키워드별 최근 블로그 게시물 분포",
                       labels={'postdate': '작성일', 'content_count': '게시물 수'},
                       template=plotly_template)
        st.plotly_chart(update_chart_style(fig5), use_container_width=True)
        
        col_blog1, col_blog2 = st.columns(2)
        with col_blog1:
            # 주요 블로거 랭킹
            top_bloggers = df_blog['bloggername'].value_counts().head(10).reset_index()
            top_bloggers.columns = ['블로거명', '게시물 수']
            fig_top_blog = px.bar(top_bloggers, x='게시물 수', y='블로거명', orientation='h',
                                  title="🏆 주요 활동 블로거 TOP 10",
                                  template=plotly_template,
                                  color='게시물 수', color_continuous_scale='Magma')
            st.plotly_chart(update_chart_style(fig_top_blog), use_container_width=True)
            
        with col_blog2:
            # 블로그 제목 키워드 분석
            st.write("🔍 블로그 제목 핵심 단어")
            all_blog_titles = " ".join(df_blog['title'].dropna().tolist())
            blog_words = [w for w in all_blog_titles.split() if len(w) > 1 and w not in keywords]
            from collections import Counter
            blog_word_counts = Counter(blog_words).most_common(12)
            if blog_word_counts:
                df_blog_word = pd.DataFrame(blog_word_counts, columns=['단어', '빈도'])
                fig_blog_word = px.bar(df_blog_word, x='단어', y='빈도',
                                       title="블로그 제목 빈출 키워드",
                                       template=plotly_template,
                                       color='빈도',
                                       color_continuous_scale=px.colors.sequential.PuRd)
                st.plotly_chart(update_chart_style(fig_blog_word), use_container_width=True)

        # 워드클라우드 시각화
        st.write("☁️ 블로그 이슈 워드클라우드")
        wc_blog = generate_wordcloud(all_blog_titles)
        if wc_blog:
             st.image(wc_blog.to_array(), caption="Blog Title WordCloud")
        
        st.divider()
        st.subheader("📖 최근 블로그 콘텐츠 통합 리스트")
        # 페이징 적용
        paged_blog = paginate(df_blog.sort_values('postdate', ascending=False), 20, "blog_list")
        if paged_blog is not None:
            st.dataframe(
                paged_blog[['search_keyword', 'title', 'bloggername', 'postdate', 'link']], 
                column_config={
                    "link": st.column_config.LinkColumn(
                        "링크",
                        help="클릭시 해당 블로그로 이동합니다.",
                        validate="^https://.*",
                        display_text="바로가기"
                    ),
                    "postdate": st.column_config.DateColumn(
                        "작성일",
                        format="YYYY-MM-DD"
                    )
                },
                use_container_width=True,
                hide_index=True
            )
        st.download_button(
             label="📥 블로그 데이터 다운로드 (CSV)",
             data=convert_df(df_blog),
             file_name=f"realtime_blog_{datetime.now().strftime('%Y%m%d')}.csv",
             mime="text/csv"
        )

# Tab 4: 실시간 카페
with tab4:
    st.header("☕ 실시간 카페 커뮤니티 반응 통합")
    df_cafe, cafe_err = fetch_realtime_cafe(keywords)
    if cafe_err:
        st.error(cafe_err)
    elif df_cafe is not None:
        df_cafe['title'] = df_cafe['title'].apply(clean_html)
        
        st.metric("수집된 카페 게시글", f"{len(df_cafe):,}건")

        # 1. 키워드별 카페 게시물 비중 (기존)
        cafe_kw_counts = df_cafe['search_keyword'].value_counts().reset_index()
        cafe_kw_counts.columns = ['키워드', '게시물 수']
        
        col_cafe1, col_cafe2 = st.columns(2)
        with col_cafe1:
            fig_cafe = px.bar(cafe_kw_counts, x='게시물 수', y='키워드', orientation='h',
                              title="키워드별 카페 활동량 비교", color='키워드',
                              template=plotly_template,
                              color_discrete_sequence=px.colors.qualitative.Pastel)
            st.plotly_chart(update_chart_style(fig_cafe), use_container_width=True)
            
        with col_cafe2:
            # 2. 주요 활동 카페 랭킹 (신규)
            top_cafes = df_cafe['cafename'].value_counts().head(10).reset_index()
            top_cafes.columns = ['카페명', '게시물 수']
            fig_top_cafe = px.bar(top_cafes, x='게시물 수', y='카페명', orientation='h',
                                  title="🏆 주요 활동 카페 TOP 10",
                                  template=plotly_template,
                                  color='게시물 수', color_continuous_scale='Viridis')
            st.plotly_chart(update_chart_style(fig_top_cafe), use_container_width=True)

        st.divider()
        
        # 3. 게시글 제목 핵심 키워드 분석 (신규)
        st.subheader("🔍 카페 게시글 핵심 키워드 분석 (Top 15)")
        all_titles = " ".join(df_cafe['title'].dropna().tolist())
        # 단순 형태소 분석 대신 공백 분리 및 기본 불용어 처리
        words = [w for w in all_titles.split() if len(w) > 1 and w not in keywords]
        from collections import Counter
        word_counts = Counter(words).most_common(15)
        if word_counts:
            df_word = pd.DataFrame(word_counts, columns=['단어', '빈도'])
            fig_word = px.bar(df_word, x='단어', y='빈도', color='빈도',
                              title="제목 내 빈출 단어", text_auto=True,
                              template=plotly_template,
                              color_continuous_scale='Blues')
            st.plotly_chart(update_chart_style(fig_word), use_container_width=True)
            st.caption("💡 제목에서 추출한 단어 빈도입니다. '추천', '비교', '후기' 등 사용자 의도를 파악해 보세요.")
            
        # 워드클라우드 시각화
        st.write("☁️ 카페 이슈 워드클라우드")
        wc_cafe = generate_wordcloud(all_titles)
        if wc_cafe:
             st.image(wc_cafe.to_array(), caption="Cafe Title WordCloud")
        
        st.divider()
        st.subheader("👥 최신 통합 카페 게시물")
        # 페이징 적용
        paged_cafe = paginate(df_cafe, 20, "cafe_list")
        if paged_cafe is not None:
            st.dataframe(
                paged_cafe[['search_keyword', 'title', 'cafename', 'cafeurl']],
                column_config={
                    "cafeurl": st.column_config.LinkColumn(
                        "링크",
                        help="클릭시 해당 카페 게시글로 이동합니다.",
                        validate="^https://.*",
                        display_text="바로가기"
                    )
                },
                use_container_width=True,
                hide_index=True
            )
        st.download_button(
             label="📥 카페 데이터 다운로드 (CSV)",
             data=convert_df(df_cafe),
             file_name=f"realtime_cafe_{datetime.now().strftime('%Y%m%d')}.csv",
             mime="text/csv"
        )

# Tab 5: 실시간 뉴스
with tab5:
    st.header("📰 실시간 최신 뉴스 통합 이슈")
    df_news, news_err = fetch_realtime_news(keywords)
    if news_err:
        st.error(news_err)
    elif df_news is not None:
        df_news['title'] = df_news['title'].apply(clean_html)
        df_news['pubDate'] = pd.to_datetime(df_news['pubDate'], errors='coerce')
        
        st.metric("수집된 뉴스 기사", f"{len(df_news):,}건")
        
        # 시간대별 키워드 뉴스 발행 추이
        news_daily = df_news.groupby([df_news['pubDate'].dt.date, 'search_keyword']).size().reset_index(name='news_count')
        news_daily.columns = ['발행일', '키워드', '뉴스 수']
        fig_news = px.bar(news_daily, x='발행일', y='뉴스 수', color='키워드', barmode='group',
                          title="날짜별 뉴스 발행 현황",
                          template="plotly_dark" if is_dark else "simple_white")
        st.plotly_chart(update_chart_style(fig_news), use_container_width=True)
        
        # 뉴스 제목 키워드 분석
        st.subheader("🔍 실시간 뉴스 핵심 키워드 (Hot Topics)")
        all_news_titles = " ".join(df_news['title'].dropna().tolist())
        news_words = [w for w in all_news_titles.split() if len(w) > 1 and w not in keywords]
        from collections import Counter
        news_word_counts = Counter(news_words).most_common(15)
        if news_word_counts:
            df_news_word = pd.DataFrame(news_word_counts, columns=['단어', '빈도'])
            fig_news_word = px.bar(df_news_word, x='빈도', y='단어', orientation='h',
                                   title="뉴스 제목 내 상위 키워드", text_auto=True,
                                   template=plotly_template,
                                   color='빈도', color_continuous_scale='Reds')
            st.plotly_chart(update_chart_style(fig_news_word), use_container_width=True)
            st.caption("💡 뉴스의 핵심 단어를 통해 현재 시장의 주요 이슈를 파악해 보세요.")

        # 워드클라우드 시각화 (신규)
        st.write("☁️ 뉴스 이슈 워드클라우드")
        wc_news = generate_wordcloud(all_news_titles)
        if wc_news:
             st.image(wc_news.to_array(), caption="News Title WordCloud")

        st.divider()
        st.subheader("🗞️ 최신 관련 뉴스 통합 리스트")
        # 페이징 적용
        paged_news = paginate(df_news.sort_values('pubDate', ascending=False), 20, "news_list")
        if paged_news is not None:
            st.dataframe(
                paged_news[['search_keyword', 'title', 'pubDate', 'link']], 
                column_config={
                    "link": st.column_config.LinkColumn(
                        "링크",
                        help="클릭시 해당 뉴스 기사로 이동합니다.",
                        validate="^https://.*",
                        display_text="바로가기"
                    ),
                    "pubDate": st.column_config.DatetimeColumn(
                        "발행일시",
                        format="YYYY-MM-DD HH:mm"
                    )
                },
                use_container_width=True,
                hide_index=True
            )
        st.download_button(
             label="📥 뉴스 데이터 다운로드 (CSV)",
             data=convert_df(df_news),
             file_name=f"realtime_news_{datetime.now().strftime('%Y%m%d')}.csv",
             mime="text/csv"
        )

# Tab 6: 쇼핑인사이트
with tab6:
    st.header("📊 쇼핑인사이트 Deep Dive")
    
    # --- 쇼핑인사이트 설정 (탭 내부 상단으로 이동) ---
    st.subheader("⚙️ 분석 분야 설정")
    
    # 대분류 카테고리만 정의
    CAT_OPTIONS = {
        "패션의류": "50000000",
        "패션잡화": "50000001",
        "화장품/미용": "50000002",
        "디지털/가전": "50000003",
        "가구/인테리어": "50000004",
        "출산/육아": "50000005",
        "식품": "50000006",
        "스포츠/레저": "50000007",
        "생활/건강": "50000008",
        "여가/생활편의": "50000009",
        "면세점": "50000010",
        "도서": "50000011",
        "직접 입력": "manual"
    }
    
    cat_col1, cat_col2 = st.columns([1, 2])
    
    with cat_col1:
        # 생활/건강(index=8)을 기본값으로 설정하여 '오메가3' 키워드와 매칭
        selected_cat_name = st.selectbox("대분류 카테고리 선택", list(CAT_OPTIONS.keys()), index=8)
    
    with cat_col2:
        if selected_cat_name == "직접 입력":
            cat_id = st.text_input("카테고리 ID 직접 입력", "50000000")
        else:
            cat_id = CAT_OPTIONS[selected_cat_name]
            st.info(f"선택된 분야: **{selected_cat_name}** (ID: `{cat_id}`)")

    
    st.divider()
    
    st.markdown(f"""
    **쇼핑인사이트**는 네이버 쇼핑 내에서 발생하는 사용자 클릭 데이터를 기반으로 마켓 트렌드를 분석합니다.
    - 선택 카테고리: **{selected_cat_name}** (ID: `{cat_id}`)
    - 분석 키워드: **{', '.join(keywords)}**
    """)
    
    st.subheader(f"📈 분야 내 키워드 클릭 트렌드 ({start_date} ~ {end_date})")
    df_ins, ins_err, api_response = fetch_shopping_insight_trend(cat_id, keywords, start_date, end_date)
    
    # 디버깅 정보 표시 (expander)
    with st.expander("🔍 API 요청/응답 정보 (디버깅)"):
        st.write("**요청 정보:**")
        st.json({
            "URL": "https://openapi.naver.com/v1/datalab/shopping/category/keywords",
            "카테고리 ID": cat_id,
            "키워드": keywords,
            "시작일": start_date,
            "종료일": end_date,
            "시간 단위": "date"
        })
        
        if api_response:
            st.write("**API 응답:**")
            st.json(api_response)
        else:
            st.warning("API 응답 데이터가 없습니다.")
    
    # 에러 처리
    if ins_err:
        st.error(f"❌ API 호출 오류: {ins_err}")
        st.info("""
        **문제 해결 방법:**
        - API 인증 키가 올바른지 확인하세요.
        - 카테고리 ID가 유효한지 확인하세요.
        - 위의 '🔍 API 요청/응답 정보'를 확인하여 상세 오류를 파악하세요.
        """)
    elif df_ins is None:
        st.warning("⚠️ API 응답이 없습니다. 네트워크 연결을 확인하세요.")
    elif df_ins.empty:
        st.warning(f"⚠️ 선택하신 카테고리 **'{selected_cat_name}'** 에는 키워드 **{', '.join(keywords)}** 에 대한 클릭 데이터가 존재하지 않습니다.")
        st.info("""
        **데이터가 보이지 않는 이유:**
        - **카테고리 불일치**: 키워드가 해당 카테고리에 속하지 않는 상품일 수 있습니다. (예: '원피스'를 '식품'에서 검색)
        - **검색량 부족**: 해당 기간 내 클릭량이 집계 기준 미만일 수 있습니다.
        
        **해결 방법:**
        1. **카테고리 변경**: 키워드에 맞는 올바른 카테고리를 선택해주세요.
        2. **키워드 변경**: 더 일반적이거나 인기 있는 키워드로 시도해보세요.
        """)
    elif 'period' not in df_ins.columns:
        st.error(f"❌ 예상치 못한 데이터 형식입니다. 컬럼: {df_ins.columns.tolist()}")
        with st.expander("🔍 원본 데이터 확인"):
            st.dataframe(df_ins)
    else:
        # 데이터 전처리
        df_ins['period'] = pd.to_datetime(df_ins['period'])
        
        st.info(f"📊 총 **{len(df_ins):,}**개의 쇼핑 클릭 데이터 포인트가 분석되었습니다.")
        
        # 메인 트렌드 차트
        fig_ins = px.line(df_ins, x='period', y='ratio', color='keyword',
                          title="키워드별 쇼핑 클릭 지수 추이",
                          template=plotly_template, 
                          color_discrete_sequence=px.colors.qualitative.Vivid,
                          markers=True)
        fig_ins.update_layout(
            hovermode="x unified",
            xaxis_title="날짜",
            yaxis_title="클릭 지수",
            legend_title="키워드"
        )
        st.plotly_chart(update_chart_style(fig_ins), use_container_width=True)
        st.info("💡 클릭 지수는 기간 내 최대 수치를 100으로 둔 상대적 활동 지표입니다.")
        
        # 상세 분석 섹션
        st.divider()
        st.subheader("📊 키워드별 상세 분석")
        
        col_analysis1, col_analysis2 = st.columns(2)
        
        with col_analysis1:
            # 키워드별 평균/최대/최소 통계
            stats_df = df_ins.groupby('keyword')['ratio'].agg([
                ('평균 클릭지수', 'mean'),
                ('최대 클릭지수', 'max'),
                ('최소 클릭지수', 'min'),
                ('변동성(표준편차)', 'std')
            ]).round(2).reset_index()
            
            st.write("**📈 키워드별 클릭 지수 통계**")
            st.dataframe(stats_df, use_container_width=True, hide_index=True)
            
            # 평균 클릭지수 바차트
            fig_avg = px.bar(stats_df, x='keyword', y='평균 클릭지수', 
                            color='평균 클릭지수',
                             title="키워드별 평균 클릭 지수 비교",
                             template=plotly_template,
                             text_auto='.1f',
                             color_continuous_scale='Blues')
            st.plotly_chart(update_chart_style(fig_avg), use_container_width=True)
        
        with col_analysis2:
            # 키워드별 피크 시점 찾기
            peak_data = []
            for kw in df_ins['keyword'].unique():
                kw_data = df_ins[df_ins['keyword'] == kw]
                peak_idx = kw_data['ratio'].idxmax()
                peak_row = kw_data.loc[peak_idx]
                peak_data.append({
                    '키워드': kw,
                    '피크 날짜': peak_row['period'].strftime('%Y-%m-%d'),
                    '피크 지수': round(peak_row['ratio'], 2)
                })
            
            peak_df = pd.DataFrame(peak_data)
            st.write("**🔥 키워드별 최고 인기 시점**")
            st.dataframe(peak_df, use_container_width=True, hide_index=True)
            
            # 최근 7일 vs 이전 7일 변화율
            if len(df_ins) >= 14:
                recent_change = []
                for kw in df_ins['keyword'].unique():
                    kw_data = df_ins[df_ins['keyword'] == kw].sort_values('period')
                    if len(kw_data) >= 14:
                        recent_7 = kw_data.tail(7)['ratio'].mean()
                        prev_7 = kw_data.tail(14).head(7)['ratio'].mean()
                        change_rate = ((recent_7 - prev_7) / prev_7 * 100) if prev_7 > 0 else 0
                        recent_change.append({
                            '키워드': kw,
                            '최근 7일 평균': round(recent_7, 2),
                            '이전 7일 평균': round(prev_7, 2),
                            '변화율(%)': round(change_rate, 2)
                        })
                
                if recent_change:
                    change_df = pd.DataFrame(recent_change)
                    st.write("**📊 최근 트렌드 변화 (최근 7일 vs 이전 7일)**")
                    st.dataframe(change_df, use_container_width=True, hide_index=True)
        
        # 전체 데이터 테이블
        st.divider()
        with st.expander("📋 전체 데이터 보기"):
            display_df = df_ins.copy()
            display_df['period'] = display_df['period'].dt.strftime('%Y-%m-%d')
            st.dataframe(display_df.sort_values(['keyword', 'period'], ascending=[True, False]), 
                        use_container_width=True, hide_index=True)
            st.download_button(
                label="📥 쇼핑인사이트 데이터 다운로드 (CSV)",
                data=convert_df(display_df),
                file_name=f"shopping_insight_{start_date}_{end_date}.csv",
                mime="text/csv"
            )




# Tab 7: 종합 리포트 (신규)
with tab7:
    st.header("📑 마켓 인사이트 종합 리포트")
    st.info("💡 각 탭의 데이터를 취합하여 핵심 인사이트를 요약합니다. (규칙 기반 자동 생성)")
    st.warning("⚠️ **주의**: 본 리포트는 API에서 제공하는 **최대 100건의 상위 노출 데이터**만을 기반으로 분석되었습니다. 전체 시장 데이터를 대변하지 않을 수 있으며, 표본 편향이 있을 수 있으므로 참고용으로만 활용해 주세요.")

    if not keywords:
        st.warning("분석할 키워드를 사이드바에서 입력해주세요.")
    else:
        # 데이터 수집 (캐싱 활용)
        # 1. 트렌드
        final_trend_df = None
        trend_raw, _ = fetch_realtime_trend(keywords, start_date, end_date) 
        if trend_raw is not None and not trend_raw.empty:
            trend_raw['period'] = pd.to_datetime(trend_raw['period'])
            final_trend_df = trend_raw

        # 2. 쇼핑
        shop_raw, _ = fetch_realtime_shopping(keywords)
        
        # 3. 콘텐츠 (블로그/카페/뉴스)
        blog_raw, _ = fetch_realtime_blog(keywords)
        cafe_raw, _ = fetch_realtime_cafe(keywords)
        news_raw, _ = fetch_realtime_news(keywords)

        # --- 분석 로직 ---
        
        # 1. 트렌드 요약
        trend_summary = "데이터 부족"
        avg_ratio = 0
        peak_date = "-"
        if final_trend_df is not None:
            avg_ratio = final_trend_df['ratio'].mean()
            # sort_values로 안전하게 최대값 추출
            max_row = final_trend_df.sort_values('ratio', ascending=False).iloc[0]
            peak_date = max_row['period'].strftime('%Y-%m-%d')
            peak_kw = max_row['keyword']
            
            # 상승/하락 추세
            recent_avg = final_trend_df[final_trend_df['period'] >= final_trend_df['period'].max() - pd.Timedelta(days=3)]['ratio'].mean()
            early_avg = final_trend_df[final_trend_df['period'] <= final_trend_df['period'].min() + pd.Timedelta(days=3)]['ratio'].mean()
            
            if recent_avg > early_avg * 1.1:
                trend_status = "📈 상승세"
            elif recent_avg < early_avg * 0.9:
                trend_status = "📉 하락세"
            else:
                trend_status = "➡️ 보합세"
                
            trend_summary = f"{trend_status} (최고점: {peak_date}, {peak_kw})"

        # 2. 시장 가격 요약
        avg_price = 0
        min_price = 0
        mall_count = 0
        if shop_raw is not None:
             shop_raw['lprice'] = pd.to_numeric(shop_raw['lprice'], errors='coerce')
             avg_price = shop_raw['lprice'].mean()
             min_price = shop_raw['lprice'].min()
             mall_count = shop_raw['mallName'].nunique()
        
        # 3. 콘텐츠 점유율
        content_counts = {
            "Blog": len(blog_raw) if blog_raw is not None else 0,
            "Cafe": len(cafe_raw) if cafe_raw is not None else 0,
            "News": len(news_raw) if news_raw is not None else 0
        }
        total_content = sum(content_counts.values())
        top_channel = max(content_counts, key=content_counts.get) if total_content > 0 else "-"
        
        # --- 리포트 UI ---
        
        # Scorecards
        r1, r2, r3, r4 = st.columns(4)
        r1.metric("트렌드 상태", trend_summary.split('(')[0].strip())
        r2.metric("평균 시장가", f"{int(avg_price):,}원" if not pd.isna(avg_price) else "-")
        r3.metric("총 콘텐츠 반응", f"{total_content:,}건")
        r4.metric("최다 활동 채널", top_channel)
        
        st.divider()
        
        c1, c2 = st.columns([1, 1])
        
        with c1:
            st.subheader("📊 콘텐츠 채널별 점유율 (SOV)")
            if total_content > 0:
                df_sov = pd.DataFrame(list(content_counts.items()), columns=['채널', '건수'])
                fig_sov = px.pie(df_sov, values='건수', names='채널', hole=0.5, 
                                 template=plotly_template,
                                 color_discrete_sequence=px.colors.qualitative.Pastel)
                st.plotly_chart(update_chart_style(fig_sov), use_container_width=True)
            else:
                st.write("데이터가 없습니다.")

        with c2:
            st.subheader("📝 자동 생성 요약 리포트")
            report_text = f"""
            ### 1. 트렌드 분석
            - 분석 기간 동안 검색 트렌드는 **{trend_summary}**를 보이고 있습니다.
            - 검색량이 가장 높았던 시점은 **{peak_date}** 입니다.
            
            ### 2. 시장 가격 동향 (상위 100개 기준)
            - 네이버 쇼핑 상위 노출 상품 기준, 평균 판매가는 **{int(avg_price):,}원** 입니다.
            - 최저가는 **{int(min_price):,}원**으로 형성되어 있습니다.
            - 수집된 데이터 내에서 **{mall_count}**개의 판매처가 확인됩니다.
            
            ### 3. 여론 및 콘텐츠 (최신 100건 기준)
            - 수집된 **{total_content}**건의 문서는 주로 **{top_channel}** 영역에서 생성되었습니다.
            - 상위 노출 콘텐츠 중 후기(블로그/카페)와 보도(뉴스)의 비중을 참고하여 마케팅 전략을 점검해 보세요.
            
            > **Note**: 위 분석은 제한된 표본(각 채널별 최대 100건)에 기반한 결과입니다.
            """
            st.markdown(report_text)
            
            # 텍스트 다운로드
            st.download_button("📥 리포트 다운로드 (TXT)", report_text, file_name=f"report_{datetime.now().strftime('%Y%m%d')}.txt")

    st.divider()
    
auth_status = "✅ 인증 완료" if (CLIENT_ID and CLIENT_SECRET) else "❌ 인증 미완료"
st.sidebar.caption(f"상태: {auth_status} | 소스: {API_KEY_SOURCE} | 업데이트: {datetime.now().strftime('%H:%M:%S')}")
st.sidebar.caption("[© 오늘코드](https://www.youtube.com/todaycode)")

# 우측 하단 고정 링크
st.markdown(
    '<div class="fixed-footer"><a href="https://www.youtube.com/todaycode" target="_blank">📺 유튜브 오늘코드</a></div>',
    unsafe_allow_html=True
)
