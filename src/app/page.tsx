"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      alert("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="text-4xl">
        Welcome <span className="text-teal-500">Traderzzz</span>
      </div>
      <form onSubmit={(e) => handleLogin(e)} className="flex flex-col gap-3">
        <div>Login and start trading!</div>
        <input
          type="email"
          className="bg-white/10 rounded-md p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="bg-white/10 rounded-md p-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
