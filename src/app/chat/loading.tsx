import { AppNavbar } from "@/components/app-navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-screen">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Chat messages skeleton */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Input area skeleton */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 