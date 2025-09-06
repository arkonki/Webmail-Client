
import React from 'react';
import { Skeleton } from './Skeleton';

export const FolderSkeleton: React.FC = () => {
    return (
        <div className="p-1 space-y-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center p-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-3/4 ml-3 rounded" />
                </div>
            ))}
        </div>
    );
}