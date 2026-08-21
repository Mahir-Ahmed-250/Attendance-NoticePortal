#!/bin/bash
sed -i '2850,2851c\
              )}\
              {/* Table */}\
              <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-slate-50/20">\
                <table className="w-full min-w-[1200px] text-left border-collapse">\
                  <thead>\
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">\
                      <th className="p-4">PIN</th>\
                      <th className="p-4">Name</th>\
                      <th className="p-4">In Time</th>\
                      <th className="p-4">Out Time</th>\
                      <th className="p-4">Late Entry</th>\
                      <th className="p-4">Early Leave</th>\
                      <th className="p-4">W. Hour</th>\
                      <th className="p-4">Absent/Leave</th>\
                      <th className="p-4">Zone</th>\
                      <th className="p-4 w-48">Remarks</th>\
                      <th className="p-4 text-center">Status</th>\
                      <th className="p-4 w-12 text-center">Actions</th>\
                    </tr>\
                  </thead>\
                  <tbody className="divide-y divide-slate-150 bg-white">' src/components/ManagerDashboard.tsx
