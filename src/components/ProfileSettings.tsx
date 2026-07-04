import React, { useState } from 'react';
import { User, ProfileRequest, Role } from '../types';
import { ShieldCheck, Lock, UserCheck, Image, Save, AlertCircle, Clock, Eye, EyeOff, Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileSettingsProps {
  currentUser: any;
  userRole: Role;
  profileRequests: ProfileRequest[];
  onSubmitProfileRequest: (requestedName: string, requestedPin: string) => void;
  onInstantUpdate: (updatedFields: Partial<User>) => void;
}

export default function ProfileSettings({
  currentUser,
  userRole,
  profileRequests,
  onSubmitProfileRequest,
  onInstantUpdate
}: ProfileSettingsProps) {
  const [name, setName] = React.useState(currentUser.name || '');
  const [pin, setPin] = React.useState(currentUser.pin || ''); // PIN corresponds to user.pin
  const [avatarUrl, setAvatarUrl] = React.useState(currentUser.avatarUrl || '');
  const [password, setPassword] = React.useState(currentUser.password || '');
  const [designation, setDesignation] = React.useState(currentUser.designation || '');
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    setName(currentUser.name || '');
    setPin(currentUser.pin || '');
    setAvatarUrl(currentUser.avatarUrl || '');
    setPassword(currentUser.password || '');
    setDesignation(currentUser.designation || '');
  }, [currentUser]);

  // Find any active pending requests for this user
  const pendingRequest = profileRequests.find(
    r => r.userPin === currentUser.pin && r.status === 'Pending'
  );

  const handleInstantSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Update password, avatarUrl and designation (if manager)
    const updatedFields: Partial<User> = {
      password: password.trim(),
      avatarUrl: avatarUrl.trim()
    };

    if (userRole === 'manager') {
      updatedFields.designation = designation.trim();
    }

    onInstantUpdate(updatedFields);

    setMessage({
      type: 'success',
      text: 'পাসওয়ার্ড, প্রোফাইল ছবি এবং অন্যান্য তথ্য সফলভাবে আপডেট করা হয়েছে! (Profile updated instantly!)'
    });
  };

  const handleVerificationRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (pendingRequest) {
      setMessage({
        type: 'error',
        text: 'আপনার ইতিমধ্যে একটি পরিবর্তন অনুরোধ পেন্ডিং রয়েছে! সেটি সমাধান হওয়া পর্যন্ত নতুন অনুরোধ পাঠানো যাবে না।'
      });
      return;
    }

    const cleanName = name.trim();
    const cleanPin = pin.trim();

    if (!cleanName || !cleanPin) {
      setMessage({
        type: 'error',
        text: 'নাম এবং পিন নম্বর খালি রাখা যাবে না।'
      });
      return;
    }

    if (cleanName === currentUser.name && cleanPin === currentUser.pin) {
      setMessage({
        type: 'info',
        text: 'কোনো পরিবর্তন করা হয়নি। আপনার নাম এবং পিন নম্বর বর্তমান তথ্যের সাথে মিল রয়েছে।'
      });
      return;
    }

    if (userRole === 'manager') {
      onInstantUpdate({ name: cleanName, pin: cleanPin });
      setMessage({
        type: 'success',
        text: 'আপনার নাম এবং পিন সফলভাবে আপডেট করা হয়েছে!'
      });
      return;
    }

    // Submit request to manager
    onSubmitProfileRequest(cleanName, cleanPin);

    setMessage({
      type: 'success',
      text: 'নাম এবং পিন পরিবর্তনের অনুরোধটি সফলভাবে পাঠানো হয়েছে। ম্যানেজার ভেরিফাই করে সাবমিট করলে এটি আপডেট হবে।'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left">
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Profile Settings & Security
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-1">
         
        </p>

        {message && (
          <div className={`mt-4 p-4 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2.5 ${
            message.type === 'success' ? 'bg-emerald-50 border border-emerald-150 text-emerald-800' :
            message.type === 'info' ? 'bg-indigo-50 border border-indigo-150 text-indigo-800' :
            'bg-rose-50 border border-rose-150 text-rose-800'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{message.text}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Instant Changes Column (Password & Avatar) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Lock className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"> Change Your Password & Profile Image</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-5">
           
            </p>

            <form onSubmit={handleInstantSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {userRole === 'manager' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                   Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Chief Executive Officer"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                 Profile Image
                </label>
                
                {/* Drag and Drop Zone */}
                <div 
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-4 text-center cursor-pointer transition-all relative group mb-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          setAvatarUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => document.getElementById('profile-image-upload')?.click()}
                >
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setAvatarUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full border-2 border-indigo-100 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <span className="text-[10px] font-extrabold text-slate-600 mt-1">
                      {avatarUrl ? 'ছবি পরিবর্তন করতে ক্লিক বা ড্র্যাগ করুন' : 'ছবি আপলোড করতে ক্লিক বা ড্র্যাগ করুন'}
                    </span>
                    <span className="text-[9px] text-slate-400">PNG, JPG up to 2MB (Converted to Base64)</span>
                  </div>
                </div>

                {/* Manual URL input fallback */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 font-mono shrink-0">OR URL:</span>
                  <input
                    type="url"
                    value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="অথবা সরাসরি ইমেজ লিংক দিতে পারেন..."
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <Save className="w-4 h-4" />
                পাসওয়ার্ড ও ছবি সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>

        {/* Verification Needed Column (Name & PIN) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Correct Your Name or PIN</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-5">
             Mentor Will Verify Your Name and PIN Before Updating
            </p>

            {pendingRequest && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-bold text-amber-800">
                <div className="flex items-center gap-2 mb-1.5 text-amber-900">
                  <Clock className="w-4 h-4 animate-spin shrink-0" />
                 Awaiting Verification
                </div>
                <p className="font-medium text-slate-600">
                 One Request is already pending for your name and PIN change. Please wait for the mentor to verify
                </p>
                <div className="mt-2 pl-2 border-l-2 border-amber-400 space-y-1 text-[11px] font-mono">
                  <p>Requested Name: {pendingRequest.requestedName}</p>
                  <p>Requested PIN: {pendingRequest.requestedPin}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleVerificationRequest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!!pendingRequest}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Pin
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  disabled={!!pendingRequest}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!!pendingRequest || (name.trim() === currentUser.name && pin.trim() === currentUser.pin)}
                className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <Save className="w-4 h-4" />
               Request For Review & Update
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
