
window.addEventListener('DOMContentLoaded', () => {
  const departmentInput = document.getElementById('departmentName');
  const outputPathInput = document.getElementById('outputPath');
  const attendanceIntegrationUrlInput = document.getElementById('attendanceIntegrationUrl');
  const attendanceIntegrationKeyInput = document.getElementById('attendanceIntegrationKey');
  const browseBtn = document.getElementById('browseBtn');
  const form = document.getElementById('settingsForm');

  // 기존 설정 불러오기
  window.api.loadSettings().then(settings => {
    if (settings) {
      departmentInput.value = settings.department || '';
      outputPathInput.value = settings.outputPath || '';
      attendanceIntegrationUrlInput.value = settings.attendanceIntegrationUrl || '';
      attendanceIntegrationKeyInput.value = settings.attendanceIntegrationKey || '';
    }
  });

  // 탐색 버튼 클릭 → 폴더 선택
  browseBtn.addEventListener('click', async () => {
    const selectedPath = await window.api.selectOutputFolder();
    if (selectedPath) {
      outputPathInput.value = selectedPath;
    }
  });

  // 저장 버튼 클릭
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const department = departmentInput.value;
    const outputPath = outputPathInput.value;
    const attendanceIntegrationUrl = attendanceIntegrationUrlInput.value.trim();
    const attendanceIntegrationKey = attendanceIntegrationKeyInput.value.trim();

    const result = await window.api.saveSettings({
      department,
      outputPath,
      attendanceIntegrationUrl,
      attendanceIntegrationKey
    });

    // result가 boolean인지 객체 인지 판단 후 분기
    if (result === true || (result && result.success)) {
      alert('설정이 저장되었습니다.');
      window.api.reloadApp();
    } else {
      const errorMsg = result?.error || '알 수 없는 오류';
      alert(`설정 저장 실패: ${errorMsg}`);
    }
  });
});
