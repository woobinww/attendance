// employee.js

// 전역 오류 핸들러
window.onerror = function(message, source, lineno, colno, error) {
  if (window.logger && typeof window.loogger.error === 'function') {
    window.logger.error(`${message} at ${source}:${lineno}:${colno}`);
  } else {
    console.error(`❗ ${message} at ${source}:${lineno}:${colno}`);
  }
};

let employees = [];
const employeeForm = document.getElementById('employeeForm');
const formTitle = document.getElementById('formTitle');
const leaveDateGroup = document.getElementById('leaveDateGroup');
const cancelEditBtn = document.getElementById('cancelEditBtn');
let editIndex = null; // 수정 중인 직원의 배열 인덱스

let department = window.api.getDepartment(); // preload.js 에서 직접 가져오기
console.log(`부서 설정됨: ${department}`);


// 설정에서 조정할 값들
const deptSelect = document.getElementById('filterDept');

// CSV 파싱 함수
const parseCSV = (csvContent) => {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const emp = {};
    headers.forEach((h, i) => emp[h.trim()] = values[i]?.trim() || "");
    return {
      name: emp["이름"],
      department: emp["부서"],
      ssn: emp["주민등록번호"],
      job: emp["직종"],
      license: emp["면허번호"],
      joinDate: emp["입사일"],
      leaveDate: emp["퇴사일"]
    };
  });
};

// employees csv 저장
function saveEmployeesCSV() {
  const header = "이름,부서,주민등록번호,직종,면허번호,입사일,퇴사일";
  const rows = employees.map(emp => {
    return `${emp.name},${emp.department},${emp.ssn},${emp.job},${emp.license},${emp.joinDate},${emp.leaveDate}`;
  });
  const csvContent = [header, ...rows].join("\n");
  window.api.saveCSV("employees.csv", csvContent);
  console.log("CSV file saved")
}

// filterDept select 초기화 함수
function initializeDeptSelect(departmentFromSettings) {
  const deptSelect = document.getElementById('filterDept');
  if (!deptSelect) return;

  // employees 목록에서 부서 종류 추출
  const departments = [...new Set(employees.map(emp => emp.department))];

  // 기존 옵션 제거 후 초기화
  deptSelect.innerHTML = '';

  // 선택 옵션 추가
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '전체';
  deptSelect.appendChild(defaultOption);

  departments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    deptSelect.appendChild(opt);
  });

  // settings에서 불러온 부서를 기본 값으로 선택
  deptSelect.value = departmentFromSettings || '';
}


// 주민번호 마스킹
function maskSSN(ssn) {
  if (!ssn || ssn.length <8 || !ssn.includes('-')) return ssn;
  return ssn.substring(0, 8) + '******';
}



// 직원 렌더링
function renderEmployees(list) {
  const tableBody = document.querySelector('#employeeTable tbody');
  tableBody.innerHTML = "";

  list.forEach((emp) => {
    const actualIndex = employees.findIndex(e => 
      e.name === emp.name &&
      e.ssn === emp.ssn &&
      e.joinDate === emp.joinDate
    );

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="checkbox" class="emp-check" data-index="${actualIndex}"</td>
      <td>${emp.name}</td>
      <td>${emp.department}</td>
      <td>${maskSSN(emp.ssn)}</td>
      <td>${emp.job}</td>
      <td>${emp.license}</td>
      <td>${emp.joinDate}</td>
      <td>${emp.leaveDate}</td>
      <td>
        <button class="edit-btn" data-index="${actualIndex}">수정</button>
        <button class="del-btn" data-index="${actualIndex}">삭제</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  attachRowEventHandlers(); // 이벤트 등록
}

// 수정삭제폼의 부서명 datalist로 채우기 
function populateDepartmentAutocomplete() {
  const deptInputList = document.getElementById('departmentList');
  if (!deptInputList) return;

  // 중복 제거된 부서 목록
  const departments = [...new Set(employees.map(emp => emp.department))];

  // 기존 옵션 제거
  deptInputList.innerHTML = '';

  departments.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept;
    deptInputList.appendChild(option);
  });
}


// confirm 함수
function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById('customConfirm');
  modal.style.display = 'block';

  // 버튼 핸들링
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');

  const cleanup = () => {
    modal.style.display = 'none';
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
  }

  const handleYes = () => {
    cleanup();
    onConfirm(true);
  };

  const handleNo = () => {
    cleanup();
    onConfirm(false);
  };

  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
}

// 취소/삭제 후 입력폼 초기화
function resetEmployeeFormUI() {
  employeeForm.reset();
  editIndex = null;
  formTitle.textContent = "신규 직원 추가";
  employeeForm.querySelector('button[type="submit"]').textContent = "추가";
  leaveDateGroup.style.display = "none";
}

// 수정/삭제 버튼 이벤트 처리 
function attachRowEventHandlers() {

  const tableBody = document.querySelector('#employeeTable tbody');
  
  // 수정 버튼
  tableBody.querySelectorAll('.edit-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const emp = employees[index];
      editIndex = index;

      // 폼에 기존 데이터 채우기 
      employeeForm.name.value = emp.name;
      employeeForm.department.value = emp.department;
      employeeForm.ssn.value = emp.ssn;
      employeeForm.job.value = emp.job;
      employeeForm.license.value = emp.license;
      employeeForm.joinDate.value = emp.joinDate;
      employeeForm.leaveDate.value = emp.leaveDate;

      formTitle.textContent = "직원 정보 수정";
      employeeForm.querySelector('button[type="submit"]').textContent = "수정 완료";
      leaveDateGroup.style.display = "inline-block";
    });
  });

  // 삭제 버튼
  tableBody.querySelectorAll('.del-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const empName = employees[index].name;

      showCustomConfirm(`${empName} 님의 정보를 삭제하시겠습니까?`, (confirmed) => {
        if (confirmed) {
          employees.splice(index, 1);
          saveEmployeesCSV();
          applyFilters();

          resetEmployeeFormUI();
        }
      })
    });
  });
}

// 필터 동적 생성
function setupFilters() {
  // deptSelect는 설정에서 정하는 것으로
  // const deptSelect = document.getElementById('filterDept');
  const jobSelect = document.getElementById('filterJob');
  const filterCurrent = document.getElementById('filterCurrent');
  const searchName = document.getElementById('searchName');

  const departments = [ 
    ...new Set(employees.map(emp => emp.department))
  ];
  const jobs = [
    ...new Set(employees.map(emp => emp.job))
  ];

  applyFilters(); // 초기 필터 반영

  // 직종 선택 목록 만들기
  jobs.forEach(j => {
    const opt = document.createElement('option');
    opt.value = j;
    opt.textContent = j;
    jobSelect.appendChild(opt);
  });
  
  // 동적 이벤트 설정
  deptSelect.addEventListener('change', applyFilters);
  jobSelect.addEventListener('change', applyFilters);
  filterCurrent.addEventListener('change', applyFilters);
  searchName.addEventListener('change', applyFilters);
}

// 필터 적용
function applyFilters() {
  const dept = document.getElementById('filterDept').value;
  const job = document.getElementById('filterJob').value;
  const current = document.getElementById('filterCurrent').checked;
  const name = document.getElementById('searchName').value.trim();

  let filtered = employees.slice();
  if (dept) filtered = filtered.filter(emp => emp.department === dept);
  if (job) filtered = filtered.filter(emp => emp.job === job);
  if (current) {
    filtered = filtered.filter(emp => 
      !emp.leaveDate || new Date(emp.leaveDate) > new Date());
  };
  if (name) filtered = filtered.filter(emp => emp.name.includes(name));

  renderEmployees(filtered);
}


// submit 버튼을 누를 때 이벤트 처리 
employeeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (editIndex !== null) {
    // 수정모드
    employees[editIndex] = {
      name: employeeForm.name.value,
      department: employeeForm.department.value,
      ssn: employeeForm.ssn.value,
      job: employeeForm.job.value,
      license: employeeForm.license.value,
      joinDate: employeeForm.joinDate.value,
      leaveDate: employeeForm.leaveDate.value || ""
    };
  } else {
    // 추가 모드
    employees.push({
      name: employeeForm.name.value,
      department: employeeForm.department.value,
      ssn: employeeForm.ssn.value,
      job: employeeForm.job.value,
      license: employeeForm.license.value,
      joinDate: employeeForm.joinDate.value,
      leaveDate: employeeForm.leaveDate.value || ""
    });
  }

  saveEmployeesCSV();
  applyFilters();
  resetEmployeeFormUI();
})

// 취소버튼 누를때 핸들러
cancelEditBtn.addEventListener('click', () => {
  resetEmployeeFormUI();
})



// DOM 로딩 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
  try {
    const csv = window.api.readCSV('employees.csv');
    employees = parseCSV(csv);

    // 방사선안전관리 버튼 조건부 표시 및 이벤트 연결
    const safetyBtn = document.getElementById('btnSafetyPage');
    if (safetyBtn && department === '영상의학과') {
      safetyBtn.style.display = 'inline-block';
      safetyBtn.addEventListener('click', () => {
        try {
          window.api.openSafety();
        } catch (err) {
          console.error('❗ opening safety window failed:', err);
          alert('방사선안전관리 창을 열 수 없습니다.');
        }
      });
    }

    // department select 초기화는 settings 불러온 후 실행
    department = window.api.getDepartment(); // preload.js 에서 가져오기
    console.log(`부서 설정됨: ${department}`);

    initializeDeptSelect(department); // select 옵션 구성 및 기본값 반영
    populateDepartmentAutocomplete(); // 자동완성용 datalist 생성
    renderEmployees(employees);    // 테이블 그리기
    setupFilters();                // 이벤트 등록 등 필터 준비
  } catch (err) {
    console.error('employees.csv loading failed:', err);
    alert('직원 데이터를 불러오는 데 실패했습니다.');
  }

  const backBtn = document.getElementById('backToAttendanceBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
    window.location.href = 'attendance.html';
    });
  } else {
    console.warn('backToAttendanceBtn not found.');
  }
});

