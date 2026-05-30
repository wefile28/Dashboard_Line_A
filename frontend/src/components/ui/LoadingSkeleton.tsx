'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'textShort' | 'heading' | 'card' | 'chart' | 'avatar' | 'tableRow';
  count?: number;
}

export function Skeleton({ className, variant = 'text', count = 1 }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full bg-slate-100 rounded-sm',
    textShort: 'h-4 w-1/3 bg-slate-100 rounded-sm',
    heading: 'h-6 w-1/2 bg-slate-100 rounded-md',
    card: 'h-36 bg-slate-100 rounded-2xl',
    chart: 'h-[300px] bg-slate-100 rounded-2xl',
    avatar: 'h-10 w-10 bg-slate-100 rounded-full',
    tableRow: 'h-12 w-full bg-slate-100 rounded-lg',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('animate-shimmer', variantClasses[variant], className)}
        />
      ))}
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="tableRow" />
      ))}
    </div>
  );
}
