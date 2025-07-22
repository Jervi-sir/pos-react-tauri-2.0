import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "lucide-react";

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Button variant="link" onClick={logout} className="cursor-pointer ">
      <LogOutIcon /> Logout
    </Button>
  );
}
