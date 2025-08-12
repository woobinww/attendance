const { spawn } = require('child_process');
const path = require('path');

function runPythonScript(scriptName, args = [], callback) {
  const scriptPath = path.join(__dirname, '../python', scriptName);
  const python = spawn('python', [scriptPath, ...args]);

  let stdout = '', stderr = '';
  python.stdout.on('data', data => { stdout += data.toString(); });
  python.stderr.on('data', data => { stderr += data.toString(); });

  python.on('close', code => {
    if (code === 0) {
      callback(null, stdout.trim());
    } else {
      callback(new Error(`Python error: ${stderr.trim()}`), null);
    }
  });
}

module.exports = { runPythonScript };
