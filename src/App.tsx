import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/components/AuthScreen";
import { RestaurantList } from "@/components/RestaurantList";
import { Button } from "@/components/ui/button";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

export default function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-semibold">Restaurants</h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => signOut()}
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="container pb-28 pt-4">
        <RestaurantList />
      </main>
    </div>
  );
}
