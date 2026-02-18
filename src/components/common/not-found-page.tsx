import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate({ to: "/" });
  };

  const handleLogout = () => {
    // Replace with your actual logout logic
    // For example: auth.logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 flex flex-col items-center max-w-md w-full">
        <h1 className="text-2xl text-center font-bold mb-4 text-red-600">
          Halaman yang anda cari tidak ditemukan
        </h1>
        <p className="mb-8 text-gray-700">Silakan kembali atau keluar</p>
        <div className="flex gap-4">
          <Button variant="default" onClick={handleHome}>
            Home
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
