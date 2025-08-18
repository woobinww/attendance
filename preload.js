// preload.js
const { contextBridge, ipcRenderer, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");
const Papa = require("papaparse");

// CLI 인자에서 userDataPath 추출
let userDataPath = "";
process.argv.forEach((arg) => {
  if (arg.startsWith("--userDataPath=")) {
    userDataPath = arg.replace("--userDataPath=", "");
  }
});

// 개발/배포 환경 판단
const isDev =
  !process.resourcesPath || process.resourcesPath.includes("node_modules");

// 기준 경로 설정
const basePath = isDev ? __dirname : userDataPath;

// 공통 경로 정의
const dataDir = path.join(basePath, "data");
const outputDir = path.join(basePath, "output");
const templateDir = path.join(__dirname, "../templates");
const settingsPath = path.join(basePath, "user_settings.json");
const pythonDistDir = path.join(__dirname, "../python_dist");

const { department } = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

function readCSV(file) {
  try {
    if (!file || typeof file !== "string")
      throw new Error("유효하지 않은 파일명입니다.");
    const filePath = path.join(dataDir, file);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  } catch (err) {
    log.error(`❗ readCSV error:`, err);
    return "";
  }
}

// 오류 전달 코드
contextBridge.exposeInMainWorld("logger", {
  error: (msg) => {
    log.error(`❗ 렌더러 오류 at ${new Date().toISOString()} ->`, msg);
  },
});

// exposeInMainWorld 이하에 API 정의
contextBridge.exposeInMainWorld("api", {
  // 경로받기
  getPath: (type) => {
    switch (type) {
      case "data":
        return dataDir;
      case "output":
        return outputDir;
      case "employeesCSV":
        return path.join(dataDir, "employees.csv");
      case "regi_template":
        return path.join(templateDir, "rad_regi_template.hwp");
      case "test_template":
        return path.join(templateDir, "rad_test_template.hwp");
      case "tld_template":
        return path.join(templateDir, "TLD_template.hwp");
      case "attendtemplate":
        return path.join(templateDir, "attendance(2025)_template.xlsx");
      default:
        return "";
    }
  },
  // csv 읽기
  readCSV,
  // parsing CSV
  parseCSV: (content) => {
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  },
  // csv 쓰기, 저장
  saveCSV: (file, content) => {
    fs.writeFileSync(path.join(dataDir, file), content, "utf-8");
  },
  // Python exe 실행
  runPythonExecutable: (exeName, args, callback) => {
    const exePath = path.join(pythonDistDir, exeName);
    const subprocess = spawn(exePath, args);
    let output = "";

    subprocess.stdout.on("data", (data) => {
      output += data.toString();
    });

    subprocess.stderr.on("data", (data) => {
      console.error("Python stderr:", data.toString());
    });

    subprocess.on("close", (code) => {
      if (code !== 0) return callback(new Error(`python 종료 코드 ${code}`));
      callback(null, output.trim());
    });
  },
  getEmployeeNames: (file, department) => {
    const content = readCSV(file);
    const lines = content.trim().split("\n");
    // 데이터 없음 처리
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const idxName = headers.indexOf("이름");
    const idxDept = headers.indexOf("부서");
    const idxLeave = headers.indexOf("퇴사일");

    if (idxName === -1 || idxDept === -1) return [];

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    return lines
      .slice(1)
      .map((line) => line.split(",").map((v) => v.trim()))
      .filter((cols) => {
        const dept = cols[idxDept];
        const leave = cols[idxLeave];
        if (department && dept !== department) return false; // 추후 부서 설정

        if (!leave) return true; // 퇴사일 없으면 현직자

        const [y, m] = leave.split("-").map(Number);
        if (!y || !m) return true; // 이상한 형식은 포함

        // 퇴사일의 다음달 부터 제외
        return y > currentYear || (y === currentYear && m >= currentMonth);
      })
      .map((cols) => cols[idxName]) // 이름만 추출
      .filter((name) => name); // 빈 문자열 제거
  },
  openFolder: (folderPath) => {
    shell.openPath(folderPath);
  },
  loadSettings: () => ipcRenderer.invoke("loadSettings"),
  saveSettings: (settings) => ipcRenderer.invoke("saveSettings", settings),
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings-updated", (event, updatedSettings) => {
      callback(updatedSettings);
    });
  },
  selectOutputFolder: () => ipcRenderer.invoke("selectOutputFolder"),
  openSettings: () => ipcRenderer.send("open-settings"),
  getDepartment: () => department,
  generateSheet: (year, month, department) => {
    return ipcRenderer.invoke("generate-attendance-sheet", {
      year,
      month,
      department,
    });
  },
  reloadApp: () => {
    ipcRenderer.send("reload-app");
  },
  openSafety: () => {
    ipcRenderer.send("open-safety");
  },
});
