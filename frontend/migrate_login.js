const fs = require('fs');

const loginHtml = fs.readFileSync('E:/AI Project/企业管理系统/frontend/login.html', 'utf8');
const commonJs = fs.readFileSync('E:/AI Project/企业管理系统/frontend/common.v2.js', 'utf8');

// Find all </script> tags
const positions = [];
let pos = 0;
while ((pos = loginHtml.indexOf('</script>', pos)) !== -1) {
  positions.push(pos);
  pos += 9;
}
console.log('</script> positions:', positions);

// Find inline script: from marker to first </script> after it
const marker = '<script src="common.v2.js"></script>';
const markerPos = loginHtml.indexOf(marker);
const inlineStart = markerPos + marker.length;

// The inline script ends at the FIRST </script> after the marker (the actual close tag)
// Because the second </script> in the file is INSIDE the broken script (browser sees first </script> as close)
const firstScriptAfterMarker = loginHtml.indexOf('</script>', inlineStart);
const inlineEnd = firstScriptAfterMarker; // points to the actual </script>

console.log('Marker pos:', markerPos);
console.log('Inline start:', inlineStart);
console.log('First </script> after marker:', firstScriptAfterMarker);

// Extract login-specific code (without the wrapping <script> tags)
const inlineScript = loginHtml.substring(inlineStart, inlineEnd);
console.log('Inline script length:', inlineScript.length);

// Append login code to common.v2.js
const loginCode = '\n\n// ===== LOGIN PAGE LOGIC =====\n' + inlineScript + '\n\n' + `
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    loadLoginState();
    var form = document.getElementById('loginForm');
    if (form) form.addEventListener('submit', handleLogin);
    var remembered = localStorage.getItem('rememberedUsername');
    if (remembered) {
      var el = document.getElementById('username');
      if (el) el.value = remembered;
      var cb = document.getElementById('rememberMe');
      if (cb) cb.checked = true;
    }
  });
})();
`;

fs.writeFileSync('E:/AI Project/企业管理系统/frontend/common.v2.js', commonJs + loginCode, 'utf8');
console.log('common.v2.js updated, length:', fs.readFileSync('E:/AI Project/企业管理系统/frontend/common.v2.js', 'utf8').length);

// Remove inline script from login.html (keep up to inlineEnd, then skip the </script> and continue)
const before = loginHtml.substring(0, inlineStart);
const after = loginHtml.substring(inlineEnd + 9); // skip </script>
const newHtml = before + after;

fs.writeFileSync('E:/AI Project/企业管理系统/frontend/login.html', newHtml, 'utf8');
console.log('login.html updated, length:', newHtml.length);
console.log('Done!');
