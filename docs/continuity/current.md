# 현재 상태

## 마지막 갱신일

2026-04-09

## 이 프로젝트가 지금 무엇인가

이 프로젝트는 게스트하우스 운영용 IBS 대시보드를 단일 HTML 앱으로 구현한 상태다.  
프론트엔드는 `index.html` 중심으로 동작하고, 데이터 저장과 조회는 Google Apps Script와 Google Sheets 연동에 의존한다.

이제 목표는 단순한 내부 도구 유지가 아니라, 현재 운영 지식을 보존한 채 SaaS로 확장 가능한 구조를 만드는 것이다.

## 지금 어디 단계에 있는가

현재는 SaaS 출시 로드맵 기준으로 아래 상태다.

- 마일스톤 1 `운영형 MVP 안정화`: 진행 중
- 마일스톤 2 `도메인 명세 확정`: 시작 전
- 마일스톤 3 `프론트엔드 경계 분리`: 시작 전
- 마일스톤 4 `백엔드 계약 정의`: 시작 전
- 마일스톤 5 이후 `인증, 멀티테넌시, 결제`: 아직 아님

한 줄로 요약하면, 지금은 `운영 안정화를 진행하면서 SaaS 전환을 위한 문서 기반을 깔아 둔 초반 단계`다.

## 단계 현황 표

| 단계 | 상태 | 메모 |
| --- | --- | --- |
| 마일스톤 1 운영형 MVP 안정화 | 진행 중 | 모바일, 저장, 재조회, 동기화 신뢰 보강 단계 |
| 마일스톤 2 도메인 명세 확정 | 다음 우선순위 | `domain-model.md` 작성이 가장 먼저 필요 |
| 마일스톤 3 프론트엔드 경계 분리 | 대기 | `index.html` 경계 문서화 전에는 크게 움직이지 않음 |
| 마일스톤 4 백엔드 계약 정의 | 대기 | Apps Script 이후 API 계약 초안 필요 |
| 마일스톤 5 시트 의존 축소 | 아직 아님 | 앞선 문서화와 계약 정의 이후 진행 |
| 마일스톤 6 내부용 백엔드 1차 구축 | 아직 아님 | 현재는 설계 전 단계 |
| 마일스톤 7 인증과 권한 | 아직 아님 | 내부 백엔드와 사용자 모델 이후 |
| 마일스톤 8 감사 로그와 변경 추적 | 아직 아님 | 저장 구조와 권한 모델 이후 |
| 마일스톤 9 단일 고객 정식 운영 | 아직 아님 | 내부 제품화 이후 |
| 마일스톤 10 멀티테넌시 설계 | 아직 아님 | 단일 고객 운영 안정화 이후 |
| 마일스톤 11 고객 온보딩 최소 버전 | 아직 아님 | 멀티테넌시 정의 이후 |
| 마일스톤 12 결제 전 준비 | 아직 아님 | 과금 기준과 상품 경계 정의 필요 |
| 마일스톤 13 결제 시스템 연결 | 아직 아님 | 정책 정리 이후 테스트 결제 단계 |
| 마일스톤 14 베타 출시 | 아직 아님 | 소수 고객 검증 단계 |
| 마일스톤 15 정식 출시 | 아직 아님 | 운영 체계, 지원, 청구 안정화 이후 |

## 현재 위치 요약

지금까지 확인된 방향은 아래와 같다.

- 전달 방식은 네이티브 앱이 아니라 웹앱/PWA가 맞다.
- 엑셀은 회사가 가진 기존 운영 파일이며, 최종 목표는 HTML 시스템 중심 운영이다.
- `index.html`은 버릴 프로토타입이 아니라 실제 운영 지식이 들어 있는 핵심 자산이다.
- 지금 가장 중요한 일은 기능 추가보다 구조를 읽히게 만들고 데이터 흐름을 신뢰 가능하게 만드는 것이다.

## 이번까지 완료된 것

1. 저장소 구조를 정리했다.
2. `AGENTS.md`, `docs/`, `continuity`, `exec-plans` 구조를 만들었다.
3. `index.html`에 연동 테스트와 검증형 동기화 흐름을 추가했다.
4. GitHub 원격 저장소에 로컬 `index.html` 변경을 반영했다.
5. 파일럿 계획 문서와 SaaS 출시 로드맵 문서를 추가했다.
6. 동기화 안정화 보강(요청 타임아웃, 수동 동기화 실행 잠금, 연동 테스트 실행 잠금, 탭 복귀 시 동기화 재시작)을 적용했다.

## 현재 제품 상태

### 강점

- 실제 업무 흐름을 이미 반영하고 있다.
- 모바일에서 사용 가능한 웹앱 형태다.
- 오프라인/동기화 흐름의 출발점이 이미 있다.
- 운영 지식이 코드 안에 축적돼 있다.

### 약점

- 핵심 로직이 `index.html` 하나에 너무 많이 몰려 있다.
- 동기화 신뢰성이 아직 완전히 제도화되지 않았다.
- 백엔드 계약이 얇고 SaaS용 사용자/권한/테넌트 모델이 없다.
- 프론트엔드에 실사용 Apps Script URL이 직접 들어 있다.

## 지금 읽어야 할 문서 순서

내일 다시 시작할 때는 아래 순서로 읽는다.

1. `AGENTS.md`
2. `docs/CODEX-WORKFLOW.md`
3. `docs/ARCHITECTURE.md`
4. `docs/FRONTEND.md`
5. `docs/RELIABILITY.md`
6. `docs/code-map/current-system.md`
7. `docs/exec-plans/active/pilot-plan.md`
8. `docs/exec-plans/active/saas-release-roadmap.md`
9. `docs/continuity/current.md`

## 다음 세션에서 바로 할 일

가장 추천하는 다음 작업은 아래 셋 중 하나다.

1. `docs/code-map/domain-model.md` 작성
2. `docs/code-map/index-html-boundaries.md` 작성
3. `docs/exec-plans/active/backend-migration-plan.md` 작성

우선순위는 `도메인 모델 문서화 -> index.html 경계 문서화 -> 백엔드 마이그레이션 계획` 순서다.

## 지금 바로 시작하면 되는 한 걸음

내일 가장 먼저 할 일은 `docs/code-map/domain-model.md`를 만드는 것이다.

이유는 아래와 같다.

- 예약, 객실, 게스트, 식사, 체크인/체크아웃 개념이 SaaS 구조의 기초가 되기 때문이다.
- 백엔드 계약과 권한 모델, 결제 기준도 결국 이 데이터 모델 위에서 정의되기 때문이다.
- 지금은 코드보다 개념이 먼저 고정돼야 이후 작업이 덜 흔들린다.

현재 마일스톤의 `목표`, `문맥`, `제약`, `완료 조건`은 `docs/exec-plans/active/pilot-plan.md`의 `이번 작업 4항목` 섹션을 기준으로 본다.

## 현재 파일 기준 현실

- 메인 제품: `index.html`
- PWA 관련: `manifest.json`, `sw.js`
- 백엔드 연동: `integrations/google-apps-script/IBS_AppScript.gs`
- 기존 회사 파일: `legacy/excel/Room Map.xlsx`
- 작업 기준: `AGENTS.md`
- 실행 계획: `docs/exec-plans/active/`

## 다음 작업 전에 꼭 기억할 것

1. 운영 중인 실제 흐름을 깨지 말 것
2. `DEFAULT_DATA`를 생산 데이터처럼 믿지 말 것
3. Apps Script 쪽 `saveOne`, `updateOne`, `deleteOne`을 완전히 믿지 말 것
4. `index.html`에 큰 기능을 더 넣기 전에 경계를 먼저 문서화할 것
5. 서비스 워커 캐시 영향은 항상 검토할 것

## 열린 결정 사항

아직 정하지 못한 큰 결정은 아래다.

1. Apps Script 이후의 장기 백엔드 스택
2. 내부 운영자와 미래 고객용 인증 모델
3. 첫 상용 버전의 고객 범위
4. 과금 기준

## 세션 종료 시 갱신 규칙

오늘 작업이 끝나면 최소 아래 중 하나는 갱신한다.

1. 현재 위치가 바뀌었으면 이 문서
2. 구조 이해가 바뀌었으면 `docs/ARCHITECTURE.md` 또는 `docs/code-map/`
3. 검증 기준이 바뀌었으면 `docs/RELIABILITY.md`
4. 실행 계획이 바뀌었으면 `docs/exec-plans/active/`

## 다음 에이전트를 위한 재시작 문장

다음 세션에서는 먼저 `AGENTS.md`, `docs/CODEX-WORKFLOW.md`, `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/RELIABILITY.md`, `docs/code-map/current-system.md`, `docs/exec-plans/active/pilot-plan.md`, `docs/exec-plans/active/saas-release-roadmap.md`, `docs/continuity/current.md`를 읽고 시작한다.

그 다음 가장 높은 우선순위 작업인 `docs/code-map/domain-model.md` 작성부터 진행한다.
## 2026-04-09 엑셀 반영 로그 (룸맵)
- 소스: `룸맵.루밍리스트 (Room Map).xlsx` 기준으로 `index.html`의 `DEFAULT_DATA`를 최신 예약 66건(gh 44, ibs 22)으로 갱신함.
- 범위: 로그인/권한/결제/백엔드 교체 없이 데이터 정합성 업데이트만 수행함.
