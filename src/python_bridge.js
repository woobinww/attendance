const { spawn } = require('child_process');
const path = require('path');

function runPythonExecutable(exeName, args = [], callback) {
  // exe 파일은 python_dist 디렉토리에 위치
  const exePath = path.join(__dirname, '../python_dist', exeName);
  const subprocess = spawn(exePath, args);

  let stdout = '', stderr = '';
  subprocess.stdout.on('data', data => { stdout += data.toString(); });
  subprocess.stderr.on('data', data => { stderr += data.toString(); });

  subprocess.on('close', code => {
    if (code === 0) {
      callback(null, stdout.trim());
    } else {
      callback(new Error(`Executable error (code ${code}): ${stderr.trim()}`), null);
    }
  });
}

module.exports = { runPythonExecutable };
