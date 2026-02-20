"use client";

import Image from 'next/image';
import type { CompanyMember } from '@/types/interfaces';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function labelFor(member: CompanyMember) {
  return member.name?.trim() || member.email.split('@')[0] || 'User';
}

export function CompanyMemberStrip({ members }: { members: CompanyMember[] }) {
  if (!members.length) {
    return <div className="member-strip-empty">No members yet</div>;
  }

  return (
    <div className="member-strip">
      {members.slice(0, 8).map((member) => {
        const label = labelFor(member);
        return (
          <div key={member.id} className="member-pill" title={`${label} • ${member.role} • ${member.status}`}>
            <span className={`member-avatar ${member.status === 'pending' ? 'pending' : ''}`}>
              {member.avatarUrl ? (
                <Image alt={label} src={member.avatarUrl} width={20} height={20} />
              ) : (
                initials(label)
              )}
            </span>
            <span className="member-name">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
