# ARCHITECTURE.md

## 목적

이 문서는 저장소의 상위 구조와 책임 분리를 빠르게 이해하기 위한 문서다.

자세한 구조 메모는 `docs/code-map/` 아래에 두고, 여기에는 오래 유지할 상위 구조만 적는다.

## 문서 구조 원칙

이 저장소는 아래 문서 구조를 유지한다.

- `AGENTS.md`: 짧은 지속 규칙
- `docs/CODEX-WORKFLOW.md`: Codex와 일하는 방식
- `docs/continuity/`: 현재 상태와 재시작 지점
- `docs/exec-plans/active/`: 살아 있는 실행 계획
- `docs/exec-plans/completed/`: 끝난 계획 기록
- `docs/code-map/`: 실제 코드 구조 해설

즉, 짧은 규칙은 루트에 두고 큰 설명과 실행 문서는 `docs/`로 분리한다.

## 현재 상위 구조

- `index.html`: 현재 제품의 핵심 실행 파일
- `manifest.json`, `sw.js`: PWA와 캐시 관련 파일
- `integrations/google-apps-script/`: Google Sheets 연동 코드
- `legacy/excel/`: 기존 회사 운영 엑셀 원본
- `docs/`: 구조, 실행 계획, 연속성 문서

## 현재 아키텍처 요약

- 프런트엔드 로직이 `index.html`에 집중되어 있다.
- 데이터는 `localStorage`와 Google Sheets 동기화를 함께 사용한다.
- 운영 기능은 실제 업무 흐름을 담고 있으므로, 단순 프로토타입으로 취급하면 안 된다.

## 핵심 경계

1. 제품 실행 파일
- `index.html`
- `manifest.json`
- `sw.js`

2. 외부 연동
- `integrations/google-apps-script/IBS_AppScript.gs`

3. 레거시 참고 자료
- `legacy/excel/Room Map.xlsx`

4. 지속 문서
- `docs/continuity/`
- `docs/code-map/`
- `docs/exec-plans/`

## 현재 구조상 가장 큰 리스크

1. `index.html` 단일 파일 결합도
2. 로컬 저장과 시트 동기화의 이중 상태
3. 부분 저장 API보다 전체 저장에 더 의존하는 구조
4. 구조 설명이 코드에 비해 늦게 따라가는 문제

## 다음에 더 자세히 볼 위치

- 현재 시스템 구조: `docs/code-map/current-system.md`
- 프런트엔드 세부: `docs/FRONTEND.md`
- 안정성 세부: `docs/RELIABILITY.md`
- Codex 작업 방식: `docs/CODEX-WORKFLOW.md`
