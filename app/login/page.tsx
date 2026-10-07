"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
  const [isSignup, setIsSignup] = useState(true);
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0f17] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#151b27] p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>

        <p className="mb-8 text-center text-sm text-gray-400">
          {isSignup
            ? "Create an account to use My AI"
            : "Log in to continue to My AI"}
        </p>

        {isSignup && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4 w-full rounded-xl border border-gray-700 bg-[#0b0f17] px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-gray-700 bg-[#0b0f17] px-4 py-3 text-white outline-none focus:border-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-xl border border-gray-700 bg-[#0b0f17] px-4 py-3 text-white outline-none focus:border-blue-500"
        />

        <button
  type="button"
  onClick={() => {
  if (isSignup) {
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert("Please fill all fields.");
      return;
    }

    localStorage.setItem(
      "my-ai-account",
      JSON.stringify({
        username,
        email,
        password,
      })
    );

    alert("Account created successfully!");
    setIsSignup(false);
    return;
  }

  if (!email.trim() || !password.trim()) {
    alert("Please enter your email and password.");
    return;
  }

  const savedAccount = localStorage.getItem("my-ai-account");

  if (!savedAccount) {
    alert("No account found. Please create an account first.");
    return;
  }

  const account = JSON.parse(savedAccount);

  if (email === account.email && password === account.password) {
    localStorage.setItem("my-ai-logged-in", "true");
    localStorage.setItem("my-ai-username", account.username);

    router.push("/");
  } else {
    alert("Incorrect email or password.");
  }
}}
  className="w-full rounded-xl bg-blue-500 py-3 font-semibold transition hover:bg-blue-400"
>
  {isSignup ? "Create Account" : "Log In"}
</button>

        <p className="mt-6 text-center text-sm text-gray-400">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            {isSignup ? "Log in" : "Create account"}
          </button>
        </p>
      </div>
    </main>
  );
}