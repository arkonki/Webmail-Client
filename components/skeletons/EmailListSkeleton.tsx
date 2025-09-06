
import React from 'react';
import { Skeleton } from './Skeleton';

export const EmailListSkeleton: React.FC = () => {
    return (
        <div className="p-2 space-y-1">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-4 w-1/2 rounded" />
                        <Skeleton className="h-3 w-12 rounded" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mb-2 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                </div>
            ))}
        </div>
    );
};