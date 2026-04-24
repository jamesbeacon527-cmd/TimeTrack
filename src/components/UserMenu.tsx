import { useState } from "react";
import { useFirebase } from "./FirebaseProvider";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "./ui/button";
import { LogIn, LogOut, Loader2, Cloud } from "lucide-react";
import { useToast } from "./ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserMenu() {
  const { user, login, logout, loading } = useFirebase();
  const { isSyncing } = useProjects();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (err: unknown) {
      let message = "Could not complete Google login.";
      const error = err as { code?: string; message?: string };
      
      if (error.code === "auth/unauthorized-domain") {
        message = "Domain not authorized. Please add your Vercel URL to 'Authentication > Settings > Authorized domains' in the Firebase Console.";
      } else if (error.code === "auth/popup-closed-by-user") {
        message = "Login window was closed before completion.";
      } else if (error.message) {
        message = error.message;
      }
      
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return <div className="size-8 rounded-full bg-carbon animate-pulse" />;
  }

  if (!user) {
    return (
      <Button 
        variant="outlineGlass" 
        size="sm" 
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="text-[10px] md:text-xs uppercase tracking-widest gap-2 h-8"
      >
        {isLoggingIn ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <LogIn className="size-3" />
        )}
        {isLoggingIn ? "Connecting..." : "Sync Devices"}
      </Button>
    );
  }

  const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email?.[0].toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-2">
      {user && (
        <div className={`px-2 py-1 rounded-md border transition-colors ${
          isSyncing 
            ? "bg-volt/10 text-volt border-volt/20" 
            : "bg-primary/10 text-primary border-primary/20"
        }`}>
          <span className="text-[10px] uppercase tracking-widest font-medium">
            {isSyncing ? "Syncing..." : "Synced"}
          </span>
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
              <AvatarFallback className="bg-carbon text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-xs uppercase tracking-widest text-primary hover:bg-transparent cursor-default">
            Account Connected
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="gap-2 text-xs uppercase tracking-widest text-ruby">
            <LogOut className="size-3" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
