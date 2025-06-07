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
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100 rounded-lg">
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
