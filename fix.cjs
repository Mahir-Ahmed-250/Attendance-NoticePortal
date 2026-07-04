const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

let startIndex = code.indexOf('                          {/* Base64 Avatar Uploader */}\n                          <div>\n                                              {/* Permissions */}');
let endIndex = code.indexOf('                                        }));\n                                      }\n                                    };\n                                    reader.readAsDataURL(file);\n                                  }\n                                }}\n                                className="hidden"');

if (startIndex !== -1 && endIndex !== -1) {
  let firstPart = code.substring(0, startIndex);
  let lastPart = code.substring(endIndex);

  let newMiddle = `                          {/* Base64 Avatar Uploader */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                              প্রোফাইল ছবি (Base64 Profile Picture)
                            </label>
                            <div
                              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-4 text-center cursor-pointer transition-all relative group mb-2"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  if (file.size > 200 * 1024) {
                                    alert(
                                      "ইমেজ সাইজ ২০০ KB এর বেশি হতে পারবে না।"
                                    );
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                      setMemberForm((p) => ({
                                        ...p,
                                        avatarUrl: reader.result as string,
                                      }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              onClick={() =>
                                document
                                  .getElementById("modal-avatar-upload")
                                  ?.click()
                              }
                            >
                              <input
                                id="modal-avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 200 * 1024) {
                                      alert(
                                        "ইমেজ সাইজ ২০০ KB এর বেশি হতে পারবে না।"
                                      );
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === "string") {
                                        setMemberForm((p) => ({
                                          ...p,
                                          avatarUrl: reader.result as string,
                                        }));
                                      }
`;

  fs.writeFileSync('src/components/ManagerDashboard.tsx', firstPart + newMiddle + lastPart);
  console.log('Fixed Base64 block');
} else {
  console.log('Could not find indices', startIndex, endIndex);
}
