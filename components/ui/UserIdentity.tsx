import React from 'react';
import { SkeletonLoader } from '../SkeletonLoader';
import { getProfileInitial, type UserProfileSnapshot } from '../../lib/userProfile';

type UserIdentitySize = 'sm' | 'md';

const avatarSizes: Record<UserIdentitySize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
};

const textSizes: Record<UserIdentitySize, { name: string; meta: string }> = {
  sm: { name: 'text-sm', meta: 'text-xs' },
  md: { name: 'text-sm', meta: 'text-xs' },
};

export const UserProfileSkeleton: React.FC<{
  size?: UserIdentitySize;
  showText?: boolean;
  className?: string;
}> = ({ size = 'md', showText = false, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <SkeletonLoader className={`${avatarSizes[size]} rounded-full shrink-0`} />
    {showText && (
      <div className="hidden md:block space-y-1.5 min-w-0">
        <SkeletonLoader className="h-3.5 w-24 rounded-md" />
        <SkeletonLoader className="h-3 w-16 rounded-md" />
      </div>
    )}
  </div>
);

export const UserAvatar: React.FC<{
  profile: UserProfileSnapshot | null | undefined;
  size?: UserIdentitySize;
  className?: string;
  alt?: string;
}> = ({ profile, size = 'md', className = '', alt }) => {
  const initial = getProfileInitial(profile);

  if (profile?.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={alt || profile.name || 'Profile'}
        className={`${avatarSizes[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${avatarSizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0 ${size === 'sm' ? 'text-[11px]' : 'text-sm'} ${className}`}
      aria-hidden={!initial}
    >
      {initial}
    </div>
  );
};

export const UserIdentity: React.FC<{
  profile: UserProfileSnapshot | null | undefined;
  isLoading?: boolean;
  size?: UserIdentitySize;
  meta?: string;
  showText?: boolean;
  alwaysShowText?: boolean;
  className?: string;
}> = ({
  profile,
  isLoading = false,
  size = 'md',
  meta,
  showText = true,
  alwaysShowText = false,
  className = '',
}) => {
  if (isLoading) {
    return <UserProfileSkeleton size={size} showText={showText} className={className} />;
  }

  if (!profile?.name) {
    return null;
  }

  const textVisibility = alwaysShowText ? 'block' : 'hidden md:block';

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <UserAvatar profile={profile} size={size} />
      {showText && (
        <div className={`${textVisibility} text-left min-w-0`}>
          <div className={`${textSizes[size].name} font-bold text-slate-900 truncate`}>{profile.name}</div>
          {meta ? (
            <div className={`${textSizes[size].meta} text-slate-500 truncate`}>{meta}</div>
          ) : profile.email ? (
            <div className={`${textSizes[size].meta} text-slate-500 truncate`}>{profile.email}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};
