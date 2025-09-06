"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageLoading from "./PageLoading";

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return <PageLoading />;
  }

  if (status === "authenticated") {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Incorrect email or password.");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="text-4xl">
        Welcome <span className="text-teal-500">Traderzzz</span>
      </div>
      <form
        onSubmit={(e) => handleLogin(e)}
        className="relative flex flex-col gap-3"
      >
        <div>Login and start trading!</div>
        <input
          type="email"
          className="bg-white/10 rounded-md p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
        />
        <input
          type="password"
          className="bg-white/10 rounded-md p-2"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />
        <button
          className={`rounded-md p-2 cursor-pointer ${
            loading
              ? "bg-teal-500/50 disabled"
              : "bg-teal-500 hover:bg-teal-600 transition duration-200 ease-in-out"
          }`}
          type="submit"
        >
          {loading ? (
            <i className="fa-solid fa-circle-notch animate-spin"></i>
          ) : (
            <div>Login</div>
          )}
        </button>
        <div
          className={`absolute w-[300px] bottom-[-50px] left-[-35px] border-1 border-red-500/50 text-red-500 text-center p-1 rounded bg-red-700/10 ${
            error === "" ? "hidden" : "shake"
          }`}
        >
          {error}
        </div>
      </form>
    </div>
  );
}
