# Repository Guidelines

## 프로젝트 구조 & 모듈 구성
- 루트: `main.js`(Electron 메인), `preload.js`, `package.json`, `icon.ico`.
- `src/`: 렌더러 로직 JS 모듈(`attendance.js`, `employees.js`, `settings.js`, `safety.js`, `hwp-helper.js`, `python_bridge.js` 등), `style.css`.
- `views/`: HTML 뷰(`attendance.html`, `employees.html`, `settings.html`, `safety.html`).
- `data/`: CSV 데이터(`attendance.csv`, `employees.csv`).
- `templates/`: 출력 템플릿(`.hwp`, `.xlsx`).
- `python_dist/`: 배포 포함 실행 파일(환경에 따라 없을 수 있음).

## 빌드·테스트·개발 명령
- `npm install`: 의존성 설치/복원.
- `npm start`: Electron 앱 로컬 실행.
- `npm run pack`: 디렉터리 패키징(인스톨러 생성 없음).
- `npm run build`: 설치 파일 생성(`electron-builder`).
- `npm run restore-dev`: 개발 의존성 복원.
- 참고: `package.json`의 `dist` 스크립트는 내부 의존 스크립트 부재로 동작하지 않을 수 있습니다.

## 코딩 스타일 & 네이밍 규칙
- 언어: JavaScript(Electron). 들여쓰기 2 스페이스, 세미콜론 사용, 따옴표는 단일(`'`).
- 변수/함수 `camelCase`, 클래스 `PascalCase`.
- 파일명은 소문자-케밥케이스 권장(예: `hwp-helper.js`). 기존 혼재는 유지하되 새 파일은 케밥으로 통일.
- DOM id/class는 케밥케이스. 로깅은 `electron-log` 선호(개발 중에는 `console` 허용).
- Lint/Format 도구 미지정: PR에서 일관 포맷 유지. 권장 Prettier: `{ semi: true, singleQuote: true, tabWidth: 2 }`.

## 테스트 지침
- 현재 자동화 테스트 없음. 변경 시 수동 검증 필수.
- 수동 체크 흐름(`npm start` 실행 후):
  - 근태 달력 렌더/입력/저장 동작(`data/attendance.csv`).
  - 직원 목록/부서 필터 동작(`data/employees.csv`).
  - 템플릿 생성 버튼 동작(`templates/*`).
  - 설정 변경 시 타이틀/화면 반영.
- 회귀 위험 변경은 스크린샷/짧은 캡처 영상 첨부 권장.

## 커밋 & PR 가이드라인
- 커밋: Conventional Commits 권장 — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` 등.
  - 예: `feat(attendance): 월 이동 시 요약 갱신`
- PR 필수 사항: 목적/배경, 주요 변경점, 테스트 방법, 스크린샷 또는 영상, 관련 이슈(`#123`), 영향 범위/롤백 방법.

## 보안·설정 팁
- 렌더러에서 파일 시스템 직접 접근 금지. `preload.js`의 `window.api`(IPC)만 사용/확장.
- `preload` API 표면은 최소화하고 입력 검증을 적용.
- `data/`, `templates/` 경로/파일명 변경 시 `electron-builder`의 `files`/`extraResources` 설정 동기화 필요.

