import React from 'react';

export function UserAvatar({ user, size = 'md', className = '' }: { user: any, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    xxl: 'w-24 h-24'
  };
  
  // Use UI Avatars for a nice blank placeholder with user's name
  const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=6366f1&color=fff&bold=true`;
  
  return (
    <img
      src={user.avatarUrl || placeholderUrl}
      alt={user.name}
      referrerPolicy="no-referrer"
      className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-xs ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = placeholderUrl;
      }}
    />
  );
}
