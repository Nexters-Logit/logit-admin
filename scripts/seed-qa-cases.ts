/**
 * 1회성 QA 테스트 항목 시드 스크립트.
 *
 * 실행: npx tsx scripts/seed-qa-cases.ts [dev|prod]  (기본값 dev)
 *
 * 이미 같은 (category_l1, category_l2, category_l3, title) 조합의 항목이 있으면
 * 건너뛰므로 여러 번 실행해도 안전합니다. 이후 신규 항목은 어드민 화면의
 * "테스트 항목 추가"로 등록하세요 — 이 스크립트는 최초 이관용입니다.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type TargetEnv = "dev" | "prod";

function resolveUrl(env: TargetEnv): string {
  const url =
    env === "prod"
      ? process.env.PROD_DATABASE_URL
      : process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error(`Database URL not configured for "${env}"`);
  return url;
}

interface CaseSeed {
  category_l1: string;
  category_l2?: string;
  category_l3?: string;
  title: string;
  steps: string;
  expected: string;
}

const CASES: CaseSeed[] = [
  // 1. 로그인·인증
  { category_l1: "로그인·인증", category_l2: "OAuth 로그인", category_l3: "Google", title: "Google 로그인 버튼", steps: "로그인 페이지에서 「Google로 계속하기」 클릭", expected: "Google OAuth 동의 화면으로 정상 리다이렉트된다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 로그인", category_l3: "Apple", title: "Apple 로그인 버튼", steps: "로그인 페이지에서 「Apple로 계속하기」 클릭", expected: "Apple OAuth 동의 화면으로 정상 리다이렉트된다" },
  { category_l1: "로그인·인증", category_l2: "모바일 로그인", category_l3: "복귀 경로", title: "로그인 후 리다이렉트", steps: "모바일에서 /profile 진입 후 로그인 완료", expected: "/profile로 정상 복귀한다" },
  { category_l1: "로그인·인증", category_l2: "모바일 로그인", category_l3: "약관 링크", title: "이용약관 링크", steps: "로그인 화면에서 이용약관 링크 클릭", expected: "약관 페이지가 정상적으로 열린다" },
  { category_l1: "로그인·인증", category_l2: "모바일 로그인", category_l3: "약관 링크", title: "개인정보 처리방침 링크", steps: "로그인 화면에서 개인정보 처리방침 링크 클릭", expected: "정책 페이지가 정상적으로 열린다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "처리 중 표시", title: "콜백 로딩 스피너", steps: "OAuth 동의 후 콜백 페이지 진입 직후", expected: "「로그인 처리 중…」 스피너가 노출된다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "에러 처리", title: "error 파라미터 처리", steps: "콜백 URL에 error 파라미터를 포함해 진입", expected: "에러 안내 문구가 노출되고 재시도 버튼 없이 홈 이동 버튼만 표시된다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "에러 처리", title: "code 파라미터 누락", steps: "콜백 URL에 code 파라미터 없이 진입", expected: "「유효하지 않은 콜백 요청입니다.」가 노출된다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "에러 처리", title: "토큰 교환 API 실패", steps: "콜백 처리 중 토큰 교환 API가 4xx/5xx 응답", expected: "서버 에러 메시지 또는 「API Error: {status}」가 노출된다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "성공 처리", title: "로그인 성공 리다이렉트", steps: "정상 로그인 완료", expected: "sessionStorage.auth_redirect 경로, 없으면 홈(/)으로 이동한다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "에러 화면 복구", title: "홈으로 돌아가기", steps: "콜백 에러 화면에서 「홈으로 돌아가기」 클릭", expected: "홈으로 이동하며 이후 앱 상태가 정상 동작한다" },
  { category_l1: "로그인·인증", category_l2: "OAuth 콜백", category_l3: "초기 렌더", title: "콜백 화면 깜빡임", steps: "콜백 페이지 진입 초기 Suspense 구간", expected: "빈 화면 깜빡임 없이 스피너가 바로 노출된다" },

  // 2. 홈·프로젝트 관리
  { category_l1: "홈·프로젝트 관리", category_l2: "홈 화면", category_l3: "캐로셀", title: "경험 유형 캐로셀 좌우 이동", steps: "홈 화면 8개 카테고리 캐로셀에서 좌우 버튼 클릭", expected: "정상 이동하며 끝 지점에서 해당 버튼이 비활성화된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "홈 화면", category_l3: "진입 분기", title: "비로그인 생성 진입", steps: "비로그인 상태에서 「프로젝트 생성」 클릭", expected: "생성 모달 대신 로그인 모달이 노출된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "홈 화면", category_l3: "진입 분기", title: "로그인 생성 진입", steps: "로그인 상태에서 「프로젝트 생성」 클릭", expected: "신규 프로젝트 모달 1단계가 노출된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 1단계", category_l3: "필수값 검증", title: "회사명 누락", steps: "회사명을 비운 채 다음 단계 시도", expected: "유효성 에러로 진행이 막힌다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 1단계", category_l3: "필수값 검증", title: "직무 누락", steps: "직무를 비운 채 다음 단계 시도", expected: "유효성 에러로 진행이 막힌다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 1단계", category_l3: "필수값 검증", title: "채용공고 누락", steps: "채용공고를 비운 채 다음 단계 시도", expected: "유효성 에러로 진행이 막힌다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 1단계", category_l3: "글자수 카운터", title: "글자수 실시간 반영", steps: "회사명(100)/직무(100)/공고(3000)/인재상(1000) 입력", expected: "입력할 때마다 글자수 카운터가 실시간으로 갱신된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 1단계", category_l3: "상시 채용", title: "상시 토글", steps: "「상시」 토글을 켠다", expected: "마감일 입력이 비활성화되고 값이 초기화된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 2단계", category_l3: "문항 검증", title: "문항 최소 개수", steps: "문항을 모두 비운 채 제출", expected: "최소 1개 필요 에러로 제출이 막힌다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 2단계", category_l3: "문항 검증", title: "글자수 제한 누락", steps: "문항 내용은 입력하고 글자수 제한을 비운 채 제출", expected: "글자수 제한 누락 에러가 노출된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 2단계", category_l3: "문항 행 관리", title: "문항 추가", steps: "「추가하기」로 문항 행을 추가", expected: "문항 입력 행이 늘어난다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 2단계", category_l3: "문항 행 관리", title: "문항 삭제 버튼 숨김", steps: "문항이 1개만 남을 때까지 삭제", expected: "마지막 1개는 삭제 버튼이 숨겨진다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 생성 2단계", category_l3: "제출 상태", title: "생성 중 상태", steps: "프로젝트 생성 제출 직후", expected: "버튼이 비활성화되고 「생성 중…」 라벨로 바뀐다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 목록", category_l3: "빈 상태", title: "비로그인 빈 목록", steps: "비로그인 상태로 목록 확인", expected: "「로그인하고 자소서를 작성해보세요.」가 노출된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 목록", category_l3: "빈 상태", title: "로그인 0건 빈 목록", steps: "로그인 상태, 프로젝트 없음", expected: "「생성된 프로젝트가 없어요」가 노출된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 목록", category_l3: "목록 상호작용", title: "문항 없는 프로젝트 클릭", steps: "question_id가 없는 프로젝트 행 클릭", expected: "아무 동작도 일어나지 않는다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 목록", category_l3: "삭제", title: "삭제 다이얼로그 진입", steps: "옵션 케밥에서 「삭제」 클릭", expected: "확인 다이얼로그가 뜨고 행 클릭 전파는 차단된다" },
  { category_l1: "홈·프로젝트 관리", category_l2: "프로젝트 목록", category_l3: "삭제", title: "삭제 처리 중", steps: "삭제 확인 버튼 클릭 직후", expected: "「삭제 중…」 상태와 경고 문구가 노출된다" },

  // 3. 채팅·자소서 작성
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 단축키", title: "Enter로 전송", steps: "텍스트 입력 후 Enter", expected: "메시지가 전송된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 단축키", title: "Shift+Enter 줄바꿈", steps: "텍스트 입력 중 Shift+Enter", expected: "줄바꿈만 되고 전송되지 않는다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 단축키", title: "한글 조합 중 Enter 무시", steps: "한글 조합(IME) 중 Enter", expected: "조합만 완료되고 전송되지 않는다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "자동 높이", title: "textarea 자동 높이 조절", steps: "여러 줄의 긴 텍스트 입력", expected: "최대 200px까지 자동으로 늘어난다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 상태", title: "전송 중 입력 잠금", steps: "메시지 전송 중(submitted)", expected: "입력창이 비활성화되고 버튼이 스피너로 바뀐다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 상태", title: "스트리밍 중 정지 아이콘", steps: "AI 응답 스트리밍 중", expected: "전송 버튼이 정지 아이콘으로 바뀌고 클릭 시 중단된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 상태", title: "전송 버튼 활성 색상", steps: "입력창이 빈 상태와 텍스트가 있는 상태를 비교", expected: "텍스트가 있을 때만 버튼 색상이 활성화된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "입력창", category_l3: "전송 상태", title: "응답 종료 후 포커스", steps: "스트리밍 종료 또는 에러 발생", expected: "입력창에 자동으로 포커스가 돌아온다" },
  { category_l1: "채팅·자소서 작성", category_l2: "메시지·에러", category_l3: "에러 안내", title: "429 에러 안내", steps: "429(요청 과다) 상황 재현", expected: "해당 상황에 맞는 한글 안내 문구가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "메시지·에러", category_l3: "에러 안내", title: "401 에러 안내", steps: "401(인증 만료) 상황 재현", expected: "해당 상황에 맞는 한글 안내 문구가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "메시지·에러", category_l3: "에러 안내", title: "500/네트워크 에러 안내", steps: "500 또는 네트워크 오류 상황 재현", expected: "해당 상황에 맞는 한글 안내 문구가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "메시지·에러", category_l3: "에러 안내", title: "다시 시도 동작", steps: "에러 메시지의 「다시 시도」 클릭", expected: "직전에 보낸 메시지로 동일 요청이 다시 전송된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "메시지·에러", category_l3: "히스토리", title: "페이지네이션 로딩", steps: "채팅창 최상단까지 위로 스크롤", expected: "로딩 스피너와 함께 이전 메시지가 추가로 로드된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "초안(Draft)", category_l3: "생성 진입", title: "초안 생성 버튼", steps: "「초안 생성」 클릭", expected: "DraftPanel로 전환되고 토큰 사용 토스트가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "초안(Draft)", category_l3: "생성 진입", title: "초안으로 반영", steps: "AI 메시지의 「초안으로 반영」 클릭", expected: "DraftPanel로 전환되고 토큰 사용 토스트가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "초안(Draft)", category_l3: "작성·저장", title: "글자수 카운터", steps: "DraftPanel에서 내용 입력", expected: "maxLength 기준 글자수 카운터가 표시된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "초안(Draft)", category_l3: "작성·저장", title: "저장 중 상태", steps: "저장 버튼 클릭 직후", expected: "「저장 중…」 라벨과 함께 버튼이 비활성화된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "초안(Draft)", category_l3: "작성·저장", title: "빈 초안 플레이스홀더", steps: "작성된 내용이 없는 상태로 진입", expected: "「아직 작성된 자기소개서가 없어요.」가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "경험 카드", category_l3: "선택 제한", title: "선택 개수 제한", steps: "카드 선택을 제한 개수까지 채운 뒤 추가 선택 시도", expected: "미선택 카드가 비활성(opacity-50) 처리된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "경험 카드", category_l3: "정보 표시", title: "매칭 점수 노출", steps: "경험 카드 목록 확인", expected: "「공고 매칭 점수: N점」이 정상 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "문항 관리", category_l3: "삭제 제한", title: "마지막 문항 삭제 방지", steps: "문항이 1개만 남은 상태에서 삭제 시도", expected: "「마지막 문항은 삭제할 수 없습니다.」가 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "문항 관리", category_l3: "삭제 제한", title: "삭제 실패 처리", steps: "경험/문항 삭제가 서버에서 실패", expected: "에러 토스트가 노출되고 화면이 새로고침된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "문항 관리", category_l3: "문항 추가", title: "문항 추가 모달 검증", steps: "「+」로 문항 추가 모달을 열고 미입력 상태로 제출 시도", expected: "제출 버튼이 비활성화된 상태를 유지한다" },
  { category_l1: "채팅·자소서 작성", category_l2: "문항 관리", category_l3: "문항 추가", title: "문항 추가 처리 중", steps: "문항 추가 제출 직후", expected: "「추가 중…」 라벨이 노출된다" },
  { category_l1: "채팅·자소서 작성", category_l2: "세션", category_l3: "자동 갱신", title: "스트리밍 중 401 자동 갱신", steps: "스트리밍 도중 401(토큰 만료) 발생", expected: "자동으로 토큰을 갱신한 뒤 요청이 재시도된다" },

  // 4. 리포트
  { category_l1: "리포트", category_l2: "접근 상태", category_l3: "비로그인", title: "게스트 미리보기", steps: "비로그인 상태로 리포트 페이지 진입", expected: "블러 처리된 샘플 차트와 로그인 CTA가 노출된다" },
  { category_l1: "리포트", category_l2: "접근 상태", category_l3: "로딩", title: "차트 스켈레톤", steps: "리포트 데이터 로딩 중", expected: "3개 차트 카드 자리에 스켈레톤이 노출된다" },
  { category_l1: "리포트", category_l2: "카테고리 차트", category_l3: "고정 개수", title: "6개 고정 노출", steps: "카테고리 종류가 6개 미만인 상태", expected: "데이터 없는 카테고리도 0건으로 채워져 총 6개가 노출된다" },
  { category_l1: "리포트", category_l2: "카테고리 차트", category_l3: "설명 문구", title: "다양한 경우 문구", steps: "보유 카테고리 수가 3개 초과", expected: "「부족한 카테고리 보완」 계열 문구가 노출된다" },
  { category_l1: "리포트", category_l2: "카테고리 차트", category_l3: "설명 문구", title: "부족한 경우 문구", steps: "보유 카테고리 수가 3개 이하", expected: "「경험 유형 다양화」 계열 문구가 노출된다" },
  { category_l1: "리포트", category_l2: "유형·태그 차트", category_l3: "유형 차트", title: "유형 차트 고정 개수", steps: "경험 유형 종류가 6개 미만", expected: "고정 순서로 6개까지 채워져 노출된다" },
  { category_l1: "리포트", category_l2: "유형·태그 차트", category_l3: "태그 차트", title: "태그 데이터 없음", steps: "해쉬태그 데이터가 없는 상태", expected: "기본 안내 문구가 노출된다" },
  { category_l1: "리포트", category_l2: "경험 목록", category_l3: "빈 상태", title: "비로그인 빈 목록", steps: "비로그인 상태로 확인", expected: "「로그인하고 경험 목록을 확인해보세요.」가 노출된다" },
  { category_l1: "리포트", category_l2: "경험 목록", category_l3: "빈 상태", title: "0건 빈 목록", steps: "로그인 상태, 등록된 경험 없음", expected: "「{이름}님의 경험을 등록해보세요.」가 노출된다" },
  { category_l1: "리포트", category_l2: "경험 목록", category_l3: "삭제", title: "경험 삭제", steps: "경험 옵션 메뉴에서 「삭제」 선택", expected: "확인 다이얼로그가 노출되고 삭제 후 목록에서 사라진다" },

  // 5. 프로필·계정
  { category_l1: "프로필·계정", category_l2: "접근·레이아웃", category_l3: "반응형 분기", title: "웹/모바일 분기", steps: "데스크톱/모바일 너비에서 각각 진입", expected: "기기 판별 후 알맞은 레이아웃으로 분기된다" },
  { category_l1: "프로필·계정", category_l2: "접근·레이아웃", category_l3: "상태별 안내", title: "비로그인 안내(웹)", steps: "비로그인 상태로 웹 프로필 진입", expected: "「로그인하면 계정 관리를 이용할 수 있어요.」가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "접근·레이아웃", category_l3: "상태별 안내", title: "로딩 스켈레톤", steps: "계정 정보 로딩 중", expected: "카드형 펄스 스켈레톤이 노출된다" },
  { category_l1: "프로필·계정", category_l2: "결제·토큰 현황", category_l3: "탭 전환", title: "결제 탭 전환", steps: "「월별 결제」/「MCP 결제」 탭 전환", expected: "각 탭에 맞는 플랜 카드로 전환된다" },
  { category_l1: "프로필·계정", category_l2: "결제·토큰 현황", category_l3: "토큰 사용량", title: "사용량 바 100% 캡", steps: "토큰 사용률이 100%를 초과하는 상태", expected: "진행바가 100%에서 시각적으로 캡된다" },
  { category_l1: "프로필·계정", category_l2: "결제·토큰 현황", category_l3: "토큰 사용량", title: "세션 획득 배지", steps: "이번 세션에서 토큰을 추가로 획득", expected: "「+N」 형태의 획득 배지가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "결제·토큰 현황", category_l3: "결제 내역", title: "결제 내역 빈 상태", steps: "최근 6개월 결제 내역이 없는 상태", expected: "「최근 6개월 동안 결제 내역이 없습니다.」가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "회원탈퇴", title: "탈퇴 확인 다이얼로그", steps: "「회원탈퇴」 클릭", expected: "확인 다이얼로그가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "회원탈퇴", title: "탈퇴 성공 처리", steps: "탈퇴 확정 성공", expected: "토큰/캐시가 초기화되고 홈으로 이동한다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "회원탈퇴", title: "탈퇴 실패 처리", steps: "탈퇴 요청이 서버에서 실패", expected: "에러 토스트가 노출되고 다이얼로그가 닫힌다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "구독 취소", title: "만료일 있는 경우 문구", steps: "구독 취소 시도, expiresAt 값 있음", expected: "「~까지 이용 가능」 문구가 포함된 확인창이 노출된다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "구독 취소", title: "만료일 없는 경우 문구", steps: "구독 취소 시도, expiresAt 값 없음", expected: "일반 취소 확인 문구가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "구독 취소", title: "취소 성공/실패 토스트", steps: "구독 취소 확정 후 성공/실패 각각 재현", expected: "성공 시 예약 완료 토스트, 실패 시 에러 토스트가 노출된다" },
  { category_l1: "프로필·계정", category_l2: "계정 관리", category_l3: "결제 완료 복귀", title: "1회성 성공 토스트", steps: "결제 완료 후 프로필로 복귀", expected: "1회에 한해 성공 토스트가 노출되고 새로고침해도 재노출되지 않는다" },

  // 6. 플랜·결제
  { category_l1: "플랜·결제", category_l2: "접근 제어", category_l3: "리다이렉트", title: "데스크톱 접근 리다이렉트", steps: "데스크톱에서 /profile/plans 직접 접근", expected: "/profile로 자동 리다이렉트된다" },
  { category_l1: "플랜·결제", category_l2: "결제 정보 입력", category_l3: "전화번호", title: "형식 검증", steps: "전화번호를 10자리 미만 또는 형식에 맞지 않게 입력", expected: "「다음으로」 버튼이 비활성화 상태를 유지한다" },
  { category_l1: "플랜·결제", category_l2: "결제 정보 입력", category_l3: "전화번호", title: "자동 하이픈", steps: "전화번호 입력", expected: "입력값에 하이픈이 자동으로 붙는다" },
  { category_l1: "플랜·결제", category_l2: "결제 정보 입력", category_l3: "약관 동의", title: "전체 동의 검증", steps: "필수 약관 중 하나라도 체크하지 않은 상태", expected: "「다음으로」/「동의하기」 버튼이 비활성화된다" },
  { category_l1: "플랜·결제", category_l2: "결제 진행", category_l3: "시작 처리", title: "결제 시작 실패", steps: "결제 시작 요청이 서버에서 실패", expected: "실패 토스트가 노출되고 버튼이 다시 활성화된다" },
  { category_l1: "플랜·결제", category_l2: "결제 진행", category_l3: "시작 처리", title: "결제 시작 성공", steps: "결제 시작 요청 성공", expected: "발급된 결제 URL로 정상 이동한다" },
  { category_l1: "플랜·결제", category_l2: "결제 진행", category_l3: "모바일 시트", title: "스와이프로 닫기", steps: "모바일 결제 시트를 아래로 100px 이상 드래그", expected: "시트가 닫힌다" },
  { category_l1: "플랜·결제", category_l2: "결제 완료", category_l3: "웹", title: "웹 완료 처리", steps: "웹 환경에서 결제 완료 페이지 도달", expected: "완료 플래그가 저장되고 /profile로 리다이렉트된다" },
  { category_l1: "플랜·결제", category_l2: "결제 완료", category_l3: "모바일 폴링", title: "폴링 로딩", steps: "모바일 환경에서 완료 페이지 도달, 구독 활성화 대기", expected: "2초 간격으로 최대 15회 폴링하며 로딩 문구가 노출된다" },
  { category_l1: "플랜·결제", category_l2: "결제 완료", category_l3: "모바일 폴링", title: "폴링 성공", steps: "폴링 중 구독 활성화 확인", expected: "체크 아이콘과 「계정 페이지로 이동」 버튼이 노출된다" },
  { category_l1: "플랜·결제", category_l2: "결제 완료", category_l3: "모바일 폴링", title: "폴링 타임아웃", steps: "15회 폴링 동안 구독 활성화가 확인되지 않음", expected: "「구독 확인이 지연되고 있어요」 안내가 노출된다" },

  // 7. 이벤트·추천인
  { category_l1: "이벤트·추천인", category_l2: "이벤트 페이지 공통", category_l3: "네비게이션", title: "섹션 네비게이션 dot", steps: "이벤트 페이지를 스크롤하며 섹션 이동", expected: "현재 섹션에 맞춰 네비게이션 dot이 하이라이트된다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 페이지 공통", category_l3: "카운트다운", title: "D-day 카운트다운", steps: "이벤트 페이지 진입", expected: "이벤트 종료 시각까지 남은 시간이 정확히 표시된다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 페이지 공통", category_l3: "애니메이션", title: "진입 애니메이션 1회성", steps: "한 섹션에 여러 번 들어갔다 나갔다 반복", expected: "최초 진입 시에만 애니메이션이 실행된다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 상세", category_l3: "이벤트1", title: "컨페티·카운터", steps: "이벤트1 섹션에 최초 진입", expected: "컨페티가 한 번 터지고 토큰 카운터가 0→50→100으로 단계적으로 올라간다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 상세", category_l3: "이벤트2", title: "캘린더 채움 애니메이션", steps: "이벤트2 섹션 진입", expected: "22일치 코인 애니메이션이 순서대로 채워진다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 상세", category_l3: "이벤트2", title: "30일 이후 비활성", steps: "이벤트2 캘린더에서 30일 이후 셀 확인", expected: "비활성 처리(흐리게, 클릭 불가)되어 있다" },
  { category_l1: "이벤트·추천인", category_l2: "이벤트 상세", category_l3: "종료 처리", title: "종료 스탬프", steps: "이벤트 종료 플래그가 켜진 상태 확인", expected: "해당 섹션이 흐려지고 「이벤트 종료」 스탬프가 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "코드·링크", title: "복사 동작", steps: "추천 코드/링크 복사 버튼 클릭", expected: "「복사됨!」이 2초간 노출되고 컨페티가 함께 터진다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "코드·링크", title: "비로그인 마스킹", steps: "비로그인 상태로 추천 페이지 진입", expected: "추천 코드는 마스킹 처리되고 링크/통계는 안내 문구 또는 「—」로 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "접근 제어", title: "비로그인 액션 차단", steps: "비로그인 상태로 복사·공유·코드입력 등 액션 시도", expected: "각 액션마다 로그인 모달이 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "초대 코드 검증", title: "이미 사용된 코드", steps: "이미 사용된 초대 코드 입력", expected: "409 → 「이미 사용」 문구가 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "초대 코드 검증", title: "본인 코드", steps: "본인의 초대 코드 입력", expected: "400 → 「본인 코드 사용 불가」 문구가 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "초대 코드 검증", title: "유효하지 않은 코드", steps: "존재하지 않는 코드 입력", expected: "그 외 상태 → 유효하지 않은 코드 문구가 노출된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "초대 코드 검증", title: "코드 성공 처리", steps: "유효한 초대 코드 입력", expected: "입력 폼이 성공 배너로 전환된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "공유 폴백", title: "카카오 SDK 미초기화", steps: "카카오 SDK가 로드되지 않은 환경에서 공유 버튼 클릭", expected: "에러 없이 조용히 무시된다" },
  { category_l1: "이벤트·추천인", category_l2: "추천인", category_l3: "공유 폴백", title: "Web Share 미지원 폴백", steps: "Web Share API를 지원하지 않는 브라우저에서 공유 버튼 클릭", expected: "클립보드 복사로 대체 동작한다" },
];

async function main() {
  const targetEnv: TargetEnv = process.argv[2] === "prod" ? "prod" : "dev";
  const adapter = new PrismaPg({ connectionString: resolveUrl(targetEnv) });
  const prisma = new PrismaClient({ adapter });

  console.log(`Seeding ${CASES.length} QA cases into "${targetEnv}" database…`);
  let created = 0;
  let skipped = 0;

  try {
    for (const [index, c] of CASES.entries()) {
      const existing = await prisma.qaTestCase.findFirst({
        where: {
          category_l1: c.category_l1,
          category_l2: c.category_l2 ?? null,
          category_l3: c.category_l3 ?? null,
          title: c.title,
        },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.qaTestCase.create({
        data: {
          category_l1: c.category_l1,
          category_l2: c.category_l2 ?? null,
          category_l3: c.category_l3 ?? null,
          title: c.title,
          steps: c.steps,
          expected: c.expected,
          order: index,
        },
      });
      created++;
    }
    console.log(`Done. Created ${created}, skipped ${skipped} (already existed).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
