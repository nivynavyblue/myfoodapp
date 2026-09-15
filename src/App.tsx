import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GroupsProvider } from "@/context/GroupsContext";
import { AuthScreen } from "@/components/AuthScreen";
import { RestaurantList } from "@/components/RestaurantList";
import { GroupsScreen } from "@/components/GroupsScreen";
import { Button } from "@/components/ui/button";
import {
  ArrowRightStartOnRectangleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [groupsOpen, setGroupsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <GroupsProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="container flex h-14 items-center justify-between">
            <h1 className="text-lg font-semibold">Restaurantes</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Grupos"
                onClick={() => setGroupsOpen(true)}
              >
                <UserGroupIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sair"
                onClick={() => signOut()}
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="container pb-28 pt-4">
          <RestaurantList />
        </main>

        <GroupsScreen open={groupsOpen} onOpenChange={setGroupsOpen} />
      </div>
    </GroupsProvider>
  );
}
