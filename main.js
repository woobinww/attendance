const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { runPythonExecutable } = require('./src/python_bridge.js');
const log = require('electron-log');
const { generateSheet } = require('./src/attendanceGenerator.js');


// 개발 여부 판별
const isDev = !app.isPackaged;

// 환경별 기준 경로 설정
const basePath = __dirname;   // 정적 리소스

const userDir = app.getPath('userData'); // 사용자 데이터
const devDir = path.join(__dirname);

const currentDir = isDev ? devDir : userDir;

const dataDir = path.join(currentDir, 'data');
const defaultOutput = path.join(currentDir, 'output');
const outputDir = path.join(currentDir, 'output');
const templateDir = path.join(basePath, 'templates');
const settingsPath = path.join(currentDir, 'user_settings.json');


// 설정 저장 및 브로드캐스트
function saveSettings(settings) {
  try {
    if (!settings.outputPath || settings.outputPath.trim() === '') {
      settings.outputPath = defaultOutput;
    }

    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    // 변경 알림
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      win.webContents.send('settings-updated', settings);
    }

    return { success: true };
  } catch (err) {
    console.error('⚠️ 환경설정 저장 실패:', err);
    return { success: false, error: err.message };
  }
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('⚠️ 설정 로딩 실패:', err);
    return null;
  }
}


// 초기 폴더 생성
function initializeAppData() {
  const foldersToEnsure = [dataDir, outputDir, templateDir];
  foldersToEnsure.forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      console.warn(`${dirPath} 폴더가 존재하지 않습니다.`)
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`폴더 생성됨: ${dirPath}`);
    }
  });

  // CSV 기본 복사 (배포 환경에서만)
  if (!isDev) {
    const defaultDataPath = path.join(__dirname, 'data');
    const filesToCopy = ['attendance.csv', 'employees.csv'];

    filesToCopy.forEach((file) => {
      const src = path.join(defaultDataPath, file);
      const dest = path.join(dataDir, file);

      if (!fs.existsSync(dest)) {
        try {
          console.warn(`${file} 파일이 존재하지 않습니다.`);
          fs.copyFileSync(src, dest);
          console.log(`${file} 초기 데이터 복사됨`);
        } catch (err) {
          console.error(`❗ ${file} 복사 실패:`, err.message);
        }
      }
    });
  }
}

// 초기 user_settings.json 파일 초기화 코드
const defaultSettings = {
  department: "부서",
  outputPath: ""
};

if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  console.log(`기본 설정 파일 생성됨: ${settingsPath}`);
}


let mainWindow, employeeWindow;

process.on('uncaughtException', (error) =>{
  log.error(`❗ UncaughtException at ${new Date().toISOString()}\n`, error);
});
if (!app.isPackaged) {
  log.transports.console.level = 'info'; // 개발 중일 때 콘솔에 출력 
} else {
  log.transports.console.level = false; //  배포 버전 콘솔 로그 비활성화
}
log.transports.file.level = 'error'; // error만 파일 기록
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB 까지로 용량 제한


// 설정 요청/저장 IPC 처리
ipcMain.handle('saveSettings', (event, settings) => {
  return saveSettings(settings);
});



ipcMain.handle('generate-attendance-sheet', async (event, { year, month, department }) => {
  const templatePath = path.join(templateDir, 'attendance(2025)_template.xlsx');
  const outputPath = path.join(outputDir, `근무현황표_${year}${String(month).padStart(2, '0')}.xlsx`);
  const csvPath = path.join(dataDir, 'employees.csv');
  const attendancePath = path.join(dataDir, 'attendance.csv');

  try {
    await generateSheet({
      templatePath,
      outputPath,
      csvPath,
      attendancePath,
      targetYear: year,
      targetMonth: month,
      department
    });
    return { success: true };
  } catch (err) {
    console.error('📛 엑셀 생성 오류:', err);
    return { success: false, error: err.message };
  }
});




ipcMain.on('run-python', (event, { scriptName, args, replyChannel }) => {
  const py = spawn('python', [path.join(process.resourcesPath, scriptName), ...args]);
  let ouput = '';

  py.stdout.on('data', (data) => {
    output += data.toString();
  });

  py.stderr.on('data', (data) => {
    console.error("stderr:", data.toString());
  });

  py.on('close', (code) => {
    event.sender.send(replyChannel, output.trim()); // 호출된 채널로 응답
  });
});


// 사용자 설정 경로

// 설정 불러오기
ipcMain.handle('loadSettings', async () => {
  return loadSettings();
});


// 설정 창 열기
ipcMain.on('open-settings', () => {
  const settingsWindow = new BrowserWindow({
    width: 400,
    height: 320,
    resizable: true,
    title: '환경 설정',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--userDataPath=${app.getPath('userData')}`],
      contextIsolation: true,
      sandbox: false
    }
  });
  settingsWindow.loadFile('views/settings.html');
});

// 설정 변경 후 앱 리로드
ipcMain.on('reload-app', () => {
  app.relaunch();
  app.exit(0);
});

// 폴더 선택 다이얼로그
ipcMain.handle('selectOutputFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});


// 방사선안전관리 페이지로 넘어가기
ipcMain.on('open-safety', () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--userDataPath=${app.getPath('userData')}`],
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'views', 'safety.html'));
});




app.whenReady().then(async () => {
  initializeAppData();

  const settings = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    : {};

  console.log('🛠️ 설정 경로:', settingsPath);  // 🔍 main 프로세스에서 출력
  console.log('📄 불러온 설정:', settings);

  const department = settings.department || '근무';

  // 근태기록 메인 창
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${department} 근태관리`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--userDataPath=${app.getPath('userData')}`],
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'views', 'attendance.html'));
  mainWindow.setTitle(`${department} 근태관리`);
});
