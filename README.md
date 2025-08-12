# Attendance Manager

**Attendance Manager**는 직원 근태 관리 및 방사선 안전 관리 기능을 통합한 Eletron 기반 데스크톱 애플리케이션입니다.  
직원 정보, 근태 기록, 방사선 관계 종사자 서류 작성 기능을 제공하며, Python 모듈과 연동됩니다.

---

## 📦 주요 기능

### 1. 직원 근태 관리
- 직원 정보 등록/수정/삭제
- 부서별, 직종별 필터링
- 이름 검색
- 근태 기록 입력 및 조회
- CSV 기반 데이터 저장

### 2. 방사선 안전 관리
- 종사자 신고서, 건강진단표, TLD 신청서 자동 작성 (Python 스크립트 실행)
- 배치전 검사, 변경 신고, TLD 신청 상태 체크
- 직원 목록 필터링 기능

### 3. 데이터 관리
- `data/` 폴더에 CSV 형태로 저장
- 샘플 데이터 제공

---

## 🛠️ 기술 스택
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Eletron, Node.js
- **Automation**: Python 3.x
- **Database**: CSV

---

## 📂 프로젝트 구조
```
attendance/
├── data/ # CSV 데이터 저장
├── python_dist/ # Python 빌드 및 실행 파일
├── src/ # JavaScript 소스코드
├── templates/ # 문서 템플릿 파일
├── views/ # HTML 뷰 파일
├── main.js # Electron 메인 프로세스
├── preload.js # Preload 스크립트
├── package.json # 프로젝트 설정
└── README.md
```

## 🚀 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/woobinww/attendance.git
cd attendance
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 개발 모드 실행
```bash
npm start
```

### 4. 빌드
```bash
npm run build
```

## 📌 주의사항
- `python_dist/` 폴더 내 Python 실행 파일 필수(방사선 안전관리 관련 서류 작성 시)
- `data/` 폴더의 CSV 파일은 샘플 데이터이며, 실사용시 교체
- `.env` 또는 민감한 정보는 커밋하지 않도록 주의

## 📄 라이선스

이 프로젝트는 개인/기관 내부 사용을 목적으로 제작되었습니다.  
외부 배포 시 제작자와 사전 협의가 필요합니다. 
