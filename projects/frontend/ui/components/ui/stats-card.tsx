import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}

export default function StatsCard({ title, value, icon, loading }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center min-w-0">
          <div className="p-2 bg-gray-100 rounded-lg shrink-0">
            {icon}
          </div>
          <div className="ml-3 md:ml-4 min-w-0">
            <p className="text-xs md:text-sm font-medium text-gray-600 truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-xl md:text-2xl font-bold text-gray-900 truncate">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
