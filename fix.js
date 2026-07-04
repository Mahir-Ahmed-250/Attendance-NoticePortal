const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

const badBlock = `                                              {/* Permissions */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">`;
const newAvatarCode = `                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
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
                                    toast.error(
                                      "ইমেজ সাইজ ২০০ KB এর বেশি হতে পারবে না। অনুগ্রহ করে ছোট ইমেজ আপলোড দিন। (Image size cannot exceed 200 KB. Please upload a smaller image.)",
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
                                      toast.error(
                                        "ইমেজ সাইজ ২০০ KB এর বেশি হতে পারবে fix this."
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
                                className="hidden"
                              />
                              <div className="flex flex-col items-center gap-2">
                                {memberForm.avatarUrl && memberForm.avatarUrl.startsWith("data:") ? (
                                  <img src={memberForm.avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                  <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                )}
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600">
                                  Drag & Drop or Click to Upload
                                </span>
                              </div>
                            </div>
                            <input
                              type="url"
                              placeholder="অথবা সরাসরি ইমেজ লিংক দিতে পারেন..."
                              value={
                                memberForm.avatarUrl &&
                                memberForm.avatarUrl.startsWith("data:")
                                  ? ""
                                  : memberForm.avatarUrl
                              }
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  avatarUrl: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </div>

                          {/* Permissions */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">`;

// We'll replace everything from `                                              {/* Permissions */}` to `                 ...p,\n                                          avatarUrl: reader.result as string,\n                                        }));\n                                      }\n` with `newAvatarCode` plus the rest of the permissions block.
// Wait, actually I can just run `git restore` if it was tracked! But it's not a git repo.
