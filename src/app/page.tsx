"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleRoute = (path: string) => {
    router.push(path);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="text-4xl">
        Welcome <span className="text-teal-500">Traderzzz</span>
      </div>
      <form onSubmit={(e) => handleSubmit(e)} className="flex flex-col gap-3">
        <div>Login and start trading!</div>
        <input
          type="email"
          className="bg-white/10 rounded-md p-2"
          placeholder="Email"
        />
        <input
          type="password"
          className="bg-white/10 rounded-md p-2"
          placeholder="Password"
        />
        <button
          className="bg-teal-500 rounded-md p-2 cursor-pointer hover:bg-teal-600 transition duration-200 ease-in-out"
          type="submit"
        >
          Login
        </button>
      </form>
    </div>
  );
}
