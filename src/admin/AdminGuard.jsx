export default function AdminGuard({ children }) {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isLocalhost) {
    return (
      <div className="min-h-screen grid place-items-center text-center p-6">
        <div>
          <div className="text-2xl font-semibold text-red-500">
            Access denied
          </div>
          <div className="mt-2 text-gray-400">
            Admin panel is only available on localhost.
          </div>
        </div>
      </div>
    );
  }

  return children;
}
