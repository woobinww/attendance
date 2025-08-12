// 전역 오류 핸들러
window.onerror = function(message, source, lineno, colno, error) {
  if (window.logger) {
    window.logger.error(`${message} at ${source}:${lineno}:${colno}`);
  }
};

// renderer.js (Node.js require 제거 + preload 기반 수정 버전)

let employees = [];

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
      leaveDate: emp["퇴사일"],
      preExam: emp["배치전검사"] || "N",
      notification: emp["변경신고"] || "N",
      TLD: emp["TLD신청"] || "N"
    };
  });
};

// DOM 로딩 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
  const csv = window.api.readCSV('employees.csv');
  employees = parseCSV(csv);
  renderEmployees(employees);
  setupFilters();
});

// 주민번호 마스킹
function maskSSN(ssn) {
  if (!ssn || ssn.length < 8 || !ssn.includes('-')) return ssn;
  return ssn.substring(0, 8) + '******';
}


// 직원 렌더링 
function renderEmployees(list) {
  const tableBody = document.querySelector('#employeeTable tbody');
  tableBody.innerHTML = "";

  list.forEach((emp, visibleIndex) => {
    const actualIndex = employees.findIndex(e =>
      e.name === emp.name &&
      e.ssn === emp.ssn &&
      e.joinDate === emp.joinDate
    );

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="checkbox" class="emp-check" data-index="${actualIndex}"></td>
      <td>${emp.name}</td>
      <td>${emp.department}</td>
      <td>${maskSSN(emp.ssn)}</td>
      <td>${emp.job}</td>
      <td>${emp.license}</td>
      <td>${emp.joinDate}</td>
      <td>${emp.leaveDate}</td>
      <td>${emp.preExam}</td>
      <td>${emp.notification}</td>
      <td>${emp.TLD}</td>
      <td>
        <button class="edit-btn" data-index="${actualIndex}">수정</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  attachRowEventHandlers(); // 이벤트 등록
}

// 필터 동적 생성
function setupFilters() {
  const deptSelect = document.getElementById('filterDept');
  const jobSelect = document.getElementById('filterJob');
  const filterCurrent = document.getElementById('filterCurrent');
  const searchName = document.getElementById('searchName');

  const departments = [...new Set(employees.map(emp => emp.department))];
  const jobs = [...new Set(employees.map(emp => emp.job))];

  departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    deptSelect.appendChild(opt);
  });

  deptSelect.value = "영상의학과"; // default
  applyFilters();                  // 초기 필터 반영

  jobs.forEach(j => {
    const opt = document.createElement('option');
    opt.value = j;
    opt.textContent = j;
    jobSelect.appendChild(opt);
  });

  // 이벤트 설정
  deptSelect.addEventListener('change', applyFilters);
  jobSelect.addEventListener('change', applyFilters);
  filterCurrent.addEventListener('change', applyFilters);
  searchName.addEventListener('keyup', applyFilters);
}

function applyFilters() {
  const dept = document.getElementById('filterDept').value;
  const job = document.getElementById('filterJob').value;
  const current = document.getElementById('filterCurrent').checked;
  const name = document.getElementById('searchName').value.trim();

  let filtered = employees.slice();
  if (dept) filtered = filtered.filter(emp => emp.department === dept);
  if (job) filtered = filtered.filter(emp => emp.job === job);
  if (current) filtered = filtered.filter(emp => !emp.leaveDate || new Date(emp.leaveDate) > new Date());
  if (name) filtered = filtered.filter(emp => emp.name.includes(name));

  renderEmployees(filtered);
}

// 이후 수정/삭제/저장/버튼 실행은 동일 로직으로 연결
// window.api.writeCSV(csvContent), window.api.runPythonExecutable(...) 등 preload.js에서 추가 정의 필요


let editIndex = null; // 수정 중인 직원의 배열 인덱스
const addForm = document.getElementById('addForm');
const formTitle = document.getElementById('formTitle');
const leaveDateGroup = document.getElementById('leaveDateGroup');

// 수정/삭제 버튼 이벤트 처리
function attachRowEventHandlers() {
  const tableBody = document.querySelector('#employeeTable tbody');

  tableBody.querySelectorAll('.edit-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const emp = employees[index];
      editIndex = index;

      // 폼에 기존 데이터 채우기
      addForm.name.value = emp.name;
      addForm.department.value = emp.department;
      addForm.ssn.value = emp.ssn;
      addForm.job.value = emp.job;
      addForm.license.value = emp.license;
      addForm.joinDate.value = emp.joinDate;
      addForm.leaveDate.value = emp.leaveDate;

      addForm.preExam.checked = emp.preExam === "Y";
      addForm.notification.checked = emp.notification === "Y";
      addForm.TLD.checked = emp.TLD === "Y";

      formTitle.textContent = "직원 정보 수정";
      addForm.querySelector('button[type="submit"]').textContent = "수정 완료";
      leaveDateGroup.style.display = "inline-block";
    });
  });

  tableBody.querySelectorAll('.del-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const empName = employees[index].name;
      if (confirm(`${empName} 님의 정보를 삭제하시겠습니까?`)) {
        employees.splice(index, 1);
        saveEmployeesCSV();
        applyFilters(); // 삭제 후 재렌더링
      }
    });
  });
}


addForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (editIndex !== null) {
    // 수정 모드
    employees[editIndex] = {
      name: addForm.name.value,
      department: addForm.department.value,
      ssn: addForm.ssn.value,
      job: addForm.job.value,
      license: addForm.license.value,
      joinDate: addForm.joinDate.value,
      leaveDate: addForm.leaveDate.value || "",

      preExam: addForm.preExam.checked ? "Y" : "N",
      notification: addForm.notification.checked ? "Y" : "N",
      TLD: addForm.TLD.checked ? "Y" : "N",
    };
  } else {
    // 추가 모드
    employees.push({
      name: addForm.name.value,
      department: addForm.department.value,
      ssn: addForm.ssn.value,
      job: addForm.job.value,
      license: addForm.license.value,
      joinDate: addForm.joinDate.value,
      leaveDate: addForm.leaveDate.value || "",
      preExam: addForm.preExam.checked ? "Y" : "N",
      notification: addForm.notification.checked ? "Y" : "N",
      TLD: addForm.TLD.checked ? "Y" : "N",
    });
  }

  saveEmployeesCSV();
  applyFilters();
  addForm.reset();
  editIndex = null;
  formTitle.textContent = "신규 직원 추가";
  addForm.querySelector('button[type="submit"]').textContent = "추가";
  leaveDateGroup.style.display = "none";
});



// 저장
function saveEmployeesCSV() {
  const header = "이름,부서,주민등록번호,직종,면허번호,입사일,퇴사일,배치전검사,변경신고,TLD신청";
  const rows = employees.map(emp => {
    return `${emp.name},${emp.department},${emp.ssn},${emp.job},${emp.license},${emp.joinDate},${emp.leaveDate},${emp.preExam},${emp.notification},${emp.TLD}`;
  });
  const csvContent = [header, ...rows].join("\n");

  // 실제 저장은 preload.js의 window.api.saveCSV를 이용
  window.api.saveCSV('employees.csv', csvContent);
  console.log("CSV 저장 완료");
}







// *** button -> python 실행 연결

// 예시: 관계종사자신고서작성
document.getElementById('btnRegiWorker').addEventListener('click', () => {
  const selectIndices = [...document.querySelectorAll('.emp-check:checked')]
    .map(chk => parseInt(chk.dataset.index)); // 선택된 직원 인덱스 예시
  const args = [
    JSON.stringify(selectIndices),
    window.api.getPath('employeesCSV'),
    window.api.getPath('regi_template'),
    window.api.getPath('output')
  ];
  console.log('args:', args)
  window.api.runPythonExecutable('regi_worker.exe', args, (err, result) => {
    if (err) return alert(`실패 ${err.message}`);
    alert('신고서 작성 완료.');
  });
  window.api.openFolder(window.api.getPath('output'));
});

// 방사선관계종사자건강진단표
document.getElementById('btnTestWorker').addEventListener('click', () => {
  const selectIndices = [...document.querySelectorAll('.emp-check:checked')]
    .map(chk => parseInt(chk.dataset.index)); // 선택된 직원 인덱스 예시
  
  // 선택 인원 수 체크
  if (selectIndices.length !== 1) {
    return alert("⚠️ 건강진단표는 한 사람만 선택해야 합니다.");
  }
  const args = [
    JSON.stringify(selectIndices),
    window.api.getPath('employeesCSV'),
    window.api.getPath('test_template'),
    window.api.getPath('output')
  ];
  window.api.runPythonExecutable('test_worker.exe', args, (err, result) => {
    if (err) return alert(`실패 ${err.message}`);
    alert('방사선관계종사자건강진단표 작성 완료.');
  });
  window.api.openFolder(window.api.getPath('output'));
});



// TLD신청서
document.getElementById('btnTldApp').addEventListener('click', () => {
  const selectIndices = [...document.querySelectorAll('.emp-check:checked')]
    .map(chk => parseInt(chk.dataset.index)); // 선택된 직원 인덱스 예시
  const args = [
    JSON.stringify(selectIndices),
    window.api.getPath('employeesCSV'),
    window.api.getPath('tld_template'),
    window.api.getPath('output')
  ];
  window.api.runPythonExecutable('tld_app.exe', args, (err, result) => {
    if (err) return alert(`실패 ${err.message}`);
    alert('TLD신청서 작성 완료.');
  });
  window.api.openFolder(window.api.getPath('output'));
});


