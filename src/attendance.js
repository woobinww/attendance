
console.log('✅ window.api:', window.api);
console.log('✅ typeof loadSettings:', typeof window.api?.loadSettings);
// 전역 오류 핸들러
window.onerror = function(message, source, lineno, colno, error) {
  if (window.logger) {
    window.logger.error(`${message} at ${source}:${lineno}:${colno}`);
  }
};

// 설정 관련
let currentSettings = {};

// 설정 적용
function applySettings(settings) {
  const dept = settings.department;
}

// 날짜 → YYYY-MM-DD 형식
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

let currentEmployeeList = [];
// 직원 직원명 -> 부서 매핑
function getDepartmentOf(name, employeeList) {
  const found = employeeList.find(e => e.name === name);
  return found ? found.department : '';
}

// 초기 날짜
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;
let selectedMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

function updatedSelectedMonth() {
  selectedMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
}

let attendanceRecords = []; // 전체 기록 저장

// 달력 렌더링 함수
function renderCalendar(year, month, records) {
  
  const calendarArea = document.getElementById('calendarArea');
  calendarArea.innerHTML = '';

  const calendar = document.createElement('div');
  calendar.id = 'calendar';

  const title = document.createElement('h3');
  title.textContent = `${year}년 ${month}월`;
  title.style.marginBottom = '10px';
  calendarArea.appendChild(title);

  const table = document.createElement('table');
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const headerRow = document.createElement('tr');
  days.forEach(day => {
    const th = document.createElement('th');
    th.textContent = day;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  let row = document.createElement('tr');
  for (let i = 0; i < firstDay; i++) {
    row.appendChild(document.createElement('td'));
  }

  for (let date = 1; date <= lastDate; date++) {
    const cell = document.createElement('td');
    const dateObj = new Date(year, month - 1, date);
    const weekday = dateObj.getDay(); // 0 = 일요일, 6 = 토요일

    // 요일 클래스 적용
    if (weekday === 0) {
      cell.classList.add('sunday');
    } else if (weekday === 6) {
      cell.classList.add('saturday');
    }

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const dayRecords = records.filter(r => r.date === dateStr); // 인자로 받은 records 기준

    const dayNum = document.createElement('div');
    dayNum.textContent = date;
    dayNum.className = 'day-number';
    cell.appendChild(dayNum);

    dayRecords.forEach(r => {
      const summary = document.createElement('div');
      summary.className = 'record';

      const formatWithColor = (label, value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) return '';
        const color = num < 0 ? 'red' : 'inherit';
        return `${label} <span style="color:${color}">${num}</span>`;
      };

      const details = [
        formatWithColor('OT', r.ot),
        formatWithColor('야간', r.nightOt),
        formatWithColor('휴일', r.holidayOt),
        formatWithColor('탄력', r.flexOt),
        r.off && `<span style="color:blue">${r.off}</span>` // 👈 여기
      ].filter(Boolean).join(', ');

      summary.innerHTML = `${r.name}: ${details}`;
      cell.appendChild(summary);
    });

    // 날짜 클릭 이벤트: 폼 채우기
    cell.addEventListener('click', () => {
      const form = document.getElementById('attendanceForm');
      const selectedName = document.getElementById('filterByName').value;

      form.date.value = dateStr;

      if (selectedName) {
        // 직원 선택을 자동 지정
        form.name.value = selectedName;
        
        // 기록 불러오기
        const record = attendanceRecords.find(r => r.date === dateStr && r.name === selectedName);
        if (record) {
          form.ot.value = record.ot || '';
          form.nightOt.value = record.nightOt || '';
          form.holidayOt.value = record.holidayOt || '';
          form.flexOt.value = record.flexOt || '';
          form.off.value = record.off || '';
          form.note.value = record.note || '';
        } else {
          // 기록이 없으면 폼 초기화 (날짜 + 이름만 유지)
          form.ot.value = '';
          form.nightOt.value = '';
          form.holidayOt.value = '';
          form.flexOt.value = '';
          form.off.value = '';
          form.note.value = '';
        }

        // 포커스를 OT 필드로 이동 
        form.ot.focus();
      } else {
        // 직원이 선택되지 않은 경우에는 이름 필드도 초기화
        form.name.value = '';
        form.ot.value = '';
        form.nightOt.value = '';
        form.holidayOt.value = '';
        form.flexOt.value = '';
        form.off.value = '';
        form.note.value = '';

        form.name.focus();
      }



      // 이전 선택 제거
      document.querySelectorAll('.calendar td').forEach(td => td.classList.remove('selected'));
      cell.classList.add('selected');

      // 직원 드롭다운에 포커스 이동
      // form.name.focus();
    });

    row.appendChild(cell);

    if ((firstDay + date) % 7 === 0 || date === lastDate) {
      table.appendChild(row);
      row = document.createElement('tr');
    }
  }

  calendar.appendChild(table);
  calendarArea.appendChild(calendar);
}

// papaparse 라이브러리로 preload.js에서 정의 
// CSV → 객체 변환 (CSV를 JS객체로. [{ key: value, key: value }]   ) 
// function parseCSV(content) {
  // const lines = content.trim().split('\n');
  // const headers = lines[0].split(',');
// 
  // return lines.slice(1).map(line => {
    // const values = line.split(',');
    // const obj = {};
    // headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    // return obj;
  // });
// }

// 객체 → CSV 문자열
function convertToCSV(records) {
  const headers = ['date', 'name', 'ot', 'nightOt', 'holidayOt', 'flexOt', 'off', 'note'];
  const escapeCSV = (v) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map(r => 
    headers.map(h => escapeCSV(r[h])).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// 저장(CSV문자열로 변환한 뒤 저장)
function saveAttendance() {
  const csv = convertToCSV(attendanceRecords);
  window.api.saveCSV("attendance.csv", csv);
}

// 현재 부서 현재 직원 불러오기
async function getCurrentEmployeesInDepartment(settings, selectedMonth) {
  const department = settings.department;
  console.log(`department: ${department}`)

  const employeeData = window.api.readCSV('employees.csv')
  const lines = employeeData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const idxName = headers.indexOf('이름');
  const idxDept = headers.indexOf('부서');
  const idxSSN  = headers.indexOf('주민등록번호');
  const idxLeave = headers.indexOf('퇴사일');
  const idxJoin = headers.indexOf('입사일');

  if (idxName === -1 || idxSSN === -1 || 
    idxDept === -1 || idxJoin === -1 ||
    idxLeave === -1
  ) {
    console.warn('직원 정보에 필수 항목이 없습니다.');
    return [];
  }

  const [targetYear, targetMonth] = 
    selectedMonth.split('-').map(Number); // 예: '2025-08'

  return lines.slice(1)
    .map(line => line.split(',').map(cell => cell.trim()))
    .filter(cols => {
      const dept = cols[idxDept];
      const joinDate = cols[idxJoin];
      const leaveDate = cols[idxLeave];

      if (dept !== department) return false;

      // 입사일 체크
      if (!joinDate) return false;
      const [jy, jm] = joinDate.split('-').map(Number);
      const joined = jy < targetYear || (jy === targetYear && jm <= targetMonth);
      if (!joined) return false;

      // 퇴사일 체크
      if (!leaveDate) return true;
      const [ly, lm] = leaveDate.split('-').map(Number);
      const stillWorking = ly > targetYear || (ly === targetYear && lm >= targetMonth);
      return stillWorking;
    })
    .map(cols => ({ name: cols[idxName], ssn: cols[idxSSN] }));
}

// 이름 드롭다운
async function populateEmployDropdown() {
  try {
    const employees = await getCurrentEmployeesInDepartment(currentSettings, selectedMonth);
    currentEmployeeList = employees;

    const select = document.getElementById('employeeSelect');
    select.innerHTML = ''; // 옵션 초기화

    employees.forEach(({ name }) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("employees dropdown creating failed:", err);
  }
}

// 달력 직원 필터
async function populateEmployeeFilterDropdown() {
  try {
    const employees = await getCurrentEmployeesInDepartment(currentSettings, selectedMonth);
    currentEmployeeList = employees;

    const filterSelect = document.getElementById('filterByName');
    filterSelect.innerHTML = '<option value="">전체 직원</option>'

    const uniqueNames = [...new Set(employees.map(e => e.name))];
    uniqueNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      filterSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("filtered employees creating failed:", err);
  }
}

// 직원 근태 요약 렌더링
function renderSummaryFor(name, year, month) {
  if (!name) {
    document.getElementById('summaryContent').innerHTML = '';
    return;
  }

  const filtered = attendanceRecords.filter(r => {
    return r.name === name && new Date(r.date).getFullYear() === year && (new Date(r.date).getMonth() + 1) === month;
  });

  let totalOT = 0;
  let totalNight = 0;
  let totalHoliday = 0;
  let totalFlex = 0;

  filtered.forEach(r => {
    totalOT += parseFloat(r.ot) || 0;
    totalNight += parseFloat(r.nightOt) || 0;
    totalHoliday += parseFloat(r.holidayOt) || 0;
    totalFlex += parseFloat(r.flexOt) || 0;
  });

  const html = `
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>직원 이름:</strong> ${name}</li>
      <li><strong>총 OT:</strong> ${(totalOT + totalHoliday).toFixed(1)}시간 (기본 OT ${totalOT.toFixed(1)} + 휴일 OT ${totalHoliday.toFixed(1)})</li>
      <li><strong>총 야간 OT:</strong> ${totalNight.toFixed(1)}시간</li>
      <li><strong>총 탄력 OT:</strong> ${totalFlex.toFixed(1)}시간</li>
    </ul>
  `;

  document.getElementById('summaryContent').innerHTML = html;
}

// title  적용 공통 함수
function applyPageTitle(dept) {
  const pageTitle = `${dept || ''} 근태 기록`;

  // 화면 상단 H1/H2 등 클래스가 .title인 엘리먼트
  const titleE1 = document.querySelector('.title');
  if (titleE1) titleE1.textContent = pageTitle;

  // os 창/탭 제목
  document.title = pageTitle;

  // (선택) 프레임 타이틀까지 확실히 바꾸고 싶으면 preload/main에 setWindowTitle IPC를 붙여 사용
  // if (window.api?.setWindowTitle) window.api.setWindowTitle(pageTitle);
}

// 직원 선택으로 달력 렌더링 다시 불러오기 
function refreshCalendarAndSummary() {
  const selectedName = document.getElementById('filterByName').value;

  // 현재 부서의 직원 이름 리스트
  const allowedNames = currentEmployeeList.map(e => e.name);
  
  const filtered = attendanceRecords.filter(r => {
    if (!allowedNames.includes(r.name)) return false;
    if (selectedName && r.name !== selectedName) return false;
    return true;
  });

  renderCalendar(currentYear, currentMonth, filtered);
  renderSummaryFor(selectedName, currentYear, currentMonth);
}


// DOMContentLoaded 하나만 
document.addEventListener('DOMContentLoaded', () => {
  // 1. CSV 로딩 및 파싱
  const csv = window.api.readCSV("attendance.csv");
  attendanceRecords = window.api.parseCSV(csv);

  // 2. 드롭다운 채우기
  // populateEmployDropdown();            // 입력용
  // populateEmployeeFilterDropdown();   // 필터용

  // 3. 초기 렌더링
  // renderCalendar(currentYear, currentMonth, attendanceRecords);

  // 4. 이전/다음 월 버튼
  // 4.1. 이전 월
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentMonth -= 1;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear -= 1;
    }
    updatedSelectedMonth();
    populateEmployDropdown();
    populateEmployeeFilterDropdown();
    refreshCalendarAndSummary();
  });

  // 4.2. 다음 월 
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
    updatedSelectedMonth();
    populateEmployDropdown();
    populateEmployeeFilterDropdown();
    refreshCalendarAndSummary();
  });

  // 5. select 변경 이벤트 등록
  document.getElementById('filterByName').addEventListener('change', () => {
    refreshCalendarAndSummary();
  });

  // 6. 직원 이름 선택 시, 해당 날짜의 데이터 입력
  document.getElementById('employeeSelect').addEventListener('change', () => {
    const form = document.getElementById('attendanceForm');
    const selectedDate = form.date.value;
    const selectedName = form.name.value;

    if (!selectedDate || !selectedName) return;
    const existing = attendanceRecords.find(
      r => r.date === selectedDate && r.name === selectedName
    );

    form.ot.value = existing?.ot || '';
    form.nightOt.value = existing?.nightOt || '';
    form.holidayOt.value = existing?.holidayOt || '';
    form.flexOt.value = existing?.flexOt || '';
    form.off.value = existing?.off || '';
    form.note.value = existing?.note || '';
  });

  // 7. reset버튼
  document.getElementById('resetFormBtn').addEventListener('click', () => {
    const form = document.getElementById('attendanceForm');
    form.reset();

    // 선택 강조 해제
    document.querySelectorAll('.calendar td').forEach(td => td.classList.remove('selected-cell'));
  });

  
  // 8. 템플릿에 저장
  document.getElementById('generate-excel-btn').addEventListener('click', async () => {
    const department = window.api.getDepartment();
    const result = await window.api.generateSheet(currentYear, currentMonth, department);

    if (result.success) {
      alert(`엑셀 저장 완료`);
    } else {
      alert(`오류 발생: ${result.error}`);
    }
  });

  // 9. 폼 제출
  document.getElementById('attendanceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const record = {
      date: form.date.value,
      name: form.name.value,
      ot: form.ot.value,
      nightOt: form.nightOt.value,
      holidayOt: form.holidayOt.value,
      flexOt: form.flexOt.value,
      off: form.off.value,
      note: form.note.value
    };

    // 입력값 전부 비어있으면 해당날짜/직원의 기존 데이터 삭제
    const allEmpty = [record.ot, record.nightOt, record.holidayOt, record.flexOt, record.off, record.note].every(v => v === '');
  
    attendanceRecords = attendanceRecords.filter(r => !(r.date === record.date && r.name === record.name));

    if (!allEmpty) {
      attendanceRecords.push(record); // 값이 있으면 새로 추가
    }
  
    saveAttendance();
  
    form.reset();

    refreshCalendarAndSummary();
  });

  // 10. safety.html 연결
  document.getElementById('goEmployeesBtn').addEventListener('click', () => {
    window.location.href = 'employees.html'; // 실제 안전관리 페이지 경로
  });

  // 11. 환경설정 창
  document.getElementById('goSettingsBtn').addEventListener('click', () => {
    window.api.openSettings(); // preload -> main IPC로 연결 필요 
  });

  // 12. 설정 로드 시 타이틀 적용
  window.api.loadSettings().then(async settings => {
    currentSettings = settings;
    applySettings(settings);
    applyPageTitle(settings?.department);

    currentEmployeeList = await getCurrentEmployeesInDepartment(currentSettings, selectedMonth);

    populateEmployDropdown();
    populateEmployeeFilterDropdown();
    
    console.log(currentEmployeeList);
    refreshCalendarAndSummary();
  });

  // 13. 설정 변경 이벤트 시 타이틀 재적용 
  window.api.onSettingsChanged((updatedSettings) => {
    currentSettings = updatedSettings;
    applySettings(updatedSettings);
    applyPageTitle(updatedSettings?.department);
  });
  
  // 14. BFCache 복원 시 (뒤로가기 등) 타이틀 재 적용
  // DOMContentLoaded는 복원 시 안 불릴 수 있으므로 pageshow를 함께 사용
  window.addEventListener('pageshow', () => {
    applyPageTitle(currentSettings?.department) ;
  });
});



