import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Replace single-line `prev => prev.map` / filter with `prev => (prev || []).map` / filter
code = re.sub(r'prev => prev\.(map|filter|find)', r'prev => (prev || []).\1', code)
code = re.sub(r'prev => \[\.\.\.prev\]', r'prev => [...(prev || [])]', code)
code = re.sub(r'prev => \[([^\]]+), \.\.\.prev\]', r'prev => [\1, ...(prev || [])]', code)

with open('src/App.tsx', 'w') as f:
    f.write(code)
