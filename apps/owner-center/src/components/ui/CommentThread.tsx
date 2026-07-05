// apps/owner-center/src/components/ui/CommentThread.tsx
// Comment thread with user, company, role, and timestamp.

import React from 'react';
import { cn } from './types';
import type { CommentEntry } from './types';

export interface CommentThreadProps {
  comments: CommentEntry[];
  emptyLabel?: string;
  className?: string;
}

export function CommentThread({
  comments,
  emptyLabel = 'No comments yet',
  className,
}: CommentThreadProps): React.ReactElement {
  if (comments.length === 0) {
    return <p className={cn('acc-comment-thread__empty', className)}>{emptyLabel}</p>;
  }

  return (
    <ul className={cn('acc-comment-thread', className)} role="list">
      {comments.map((comment) => (
        <li key={comment.id} className="acc-comment-thread__item">
          <header className="acc-comment-thread__header">
            <div className="acc-comment-thread__author">
              <span className="acc-comment-thread__user">{comment.user}</span>
              {comment.company && (
                <span className="acc-comment-thread__company">{comment.company}</span>
              )}
              {comment.role && (
                <span className="acc-comment-thread__role">{comment.role}</span>
              )}
            </div>
            <time className="acc-comment-thread__time" dateTime={comment.timestamp}>
              {comment.timestamp}
            </time>
          </header>
          <p className="acc-comment-thread__text">{comment.text}</p>
        </li>
      ))}
    </ul>
  );
}
