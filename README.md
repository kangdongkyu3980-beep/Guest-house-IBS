# IBS 룸 대시보드 (단일 `index.html`)

이 프로젝트는 **단일 HTML + Vanilla JS**로 동작하는 운영 대시보드(PWA)입니다.

## 실행 방법 (권장)

`file://`로 더블클릭 실행도 가능하지만, **PWA(Service Worker) / fetch / 캐시** 때문에 브라우저별로 동작이 달라질 수 있어요.  
가장 안전한 방법은 **로컬 서버로 실행**하는 것입니다.

### 방법 A) Python (설치돼 있으면 가장 쉬움)

1) 폴더에서 터미널을 엽니다.
2) 아래 실행:

```bash
python -m http.server 5173
```

3) 브라우저에서 아래 주소로 접속:

`http://localhost:5173/index.html`

### 방법 B) Node.js가 있을 때

```bash
npx http-server -p 5173
```

## Google Sheets 연동 (Apps Script)

`index.html`에는 Apps Script WebApp URL이 내장되어 있고, 다음을 사용합니다.

- `GET ?action=loadAll`: 예약 전체 + `lastModified` (실시간 동기화/불러오기용)
- `POST action=bulkSave`: 예약 전체 저장
- `POST action=dailySnapshot`: KPI 스냅샷 저장
- `POST action=archiveBooking`: 삭제 전 이력 보관

Apps Script 코드는 `integrations/google-apps-script/IBS_AppScript.gs`에 있습니다.

## 현재 폴더 구조

- 루트: 실행에 필요한 웹앱 파일과 핵심 가이드 문서
- `docs/`: 코드맵, 실행계획, 연속성 문서
- `integrations/google-apps-script/`: Google Sheets 연동용 Apps Script
- `legacy/excel/`: 기존 회사 운영 엑셀 원본

`legacy/excel/Room Map.xlsx`는 현재 회사가 실제로 가지고 있던 기존 운영 파일이며, 이 프로젝트는 그 스프레드시트 중심 운영의 비효율을 HTML 시스템으로 개선하기 위한 작업입니다. 따라서 이 엑셀 파일은 제품의 미래 구조가 아니라, 개선 대상인 레거시 참고자료로 분리 보관합니다.

## PWA/캐시(업데이트) 주의사항

PWA는 Service Worker가 `index.html`을 캐시할 수 있어, 코드 업데이트 후에도 **구버전 화면이 계속 뜨는** 일이 생길 수 있습니다.

### 증상
- GitHub/배포본을 업데이트했는데도 화면이 그대로임
- 데이터/대시보드가 “갑자기 비어 보임”

### 해결
- 브라우저에서 해당 앱의 사이트 데이터/저장공간을 삭제하거나
- 개발자도구(F12) → Application → Service Workers → **Unregister** 후 새로고침

## 트러블슈팅

### 1) “빈 화면” 또는 KPI/점유현황이 안 뜸
- 최신 버전에서는 **렌더링이 한 부분에서 실패해도 전체 화면이 멈추지 않도록 방어**가 들어가 있습니다.
- 그래도 문제가 있으면 화면에 `⚠ 오류: ...` 토스트가 뜨도록 되어 있으니, 해당 메시지를 기반으로 원인을 추적하면 됩니다.

### 2) 시트 동기화가 안 됨
- 네트워크 상태 확인
- Apps Script WebApp 배포 상태(권한/URL) 확인
- `GET ?action=loadAll`이 `ok:true`로 응답하는지 확인
