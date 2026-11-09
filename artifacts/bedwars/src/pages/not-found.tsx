import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <Card className="mx-4 w-full max-w-md border-card-border bg-card">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-foreground">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            That page isn’t here. It may have moved or been removed.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Back to BedWars Intel</Link>
        </CardContent>
      </Card>
    </div>
  );
}
