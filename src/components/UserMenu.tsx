import { useState, useEffect } from "react";
import { useFirebase } from "./FirebaseProvider";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "./ui/button";
import { LogIn, LogOut, Loader2 } from "lucide-react";
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
  const { user, userData, login, logout, loading } = useFirebase();
  const { isSyncing } = useProjects();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tokenRole, setTokenRole] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(false).then(res => {
        const claimsRole = res.claims.role as string;
        const isAdmin = res.claims.admin ? "Admin" : "";
        setTokenRole(claimsRole || isAdmin || "");
      }).catch(console.error);
    } else {
      setTokenRole("");
    }
  }, [user]);

  const displayRole = tokenRole || userData?.role;

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
        <span className="hidden sm:inline">{isLoggingIn ? "Connecting..." : "Sync Devices"}</span>
        <span className="sm:hidden">Sync</span>
      </Button>
    );
  }

  const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email?.[0].toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-2">
      {user && (
        <div className={`hidden sm:block px-2 py-1 rounded-md border transition-colors ${
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                {displayRole && (
                  <span className="bg-primary/20 text-primary uppercase tracking-widest text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {displayRole}
                  </span>
                )}
              </div>
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
