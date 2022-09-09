import { loginUser, getMe } from "../utils/userApi";
import { MouseEvent, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import useUserStore from "../context/userStore";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const { registered } = router.query;
  const [creds, setCreds] = useState({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>();
  const { setUser } = useUserStore();

  const handleLogin = async (
    e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>
  ) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await loginUser(creds);

      const accessToken = response.data.accessToken;
      Cookies.set("accessToken", accessToken, { expires: 7 });

      const refreshToken = response.data.refreshToken;
      Cookies.set("refreshToken", refreshToken, { expires: 365 });

      const me = await getMe();

      setUser(me.data);

      const isAdmin = me.data.role === "admin";

      if (isAdmin) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (error: any) {
      setError(
        error.response.data.message[0].message || error.response.data.message
      );
    }
    setLoading(false);
  };

  return (
    <div>
      <div className={registered === "true" ? "" : "hidden"}>
        <div
          className="flex items-center justify-between p-4 text-green-700 border rounded border-green-900/10 bg-green-50"
          role="alert"
        >
          <strong className="text-sm font-medium">
            You have successfully registered. Please login to continue.
          </strong>
        </div>
      </div>
      <div className="px-4 py-16 mx-auto max-w-screen-xl sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Log into your Account
          </h1>

          <p className="mt-4 text-rose-500">{error}</p>
        </div>

        <form action="" className="max-w-md mx-auto mt-8 mb-0 space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>

            <div className="relative">
              <input
                onChange={(e) => setCreds({ ...creds, email: e.target.value })}
                type="email"
                className="w-full p-4 pr-12 text-sm border-gray-200 rounded-lg shadow-sm"
                placeholder="Enter email"
              />

              <span className="absolute inset-y-0 inline-flex items-center right-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <input
                onChange={(e) =>
                  setCreds({ ...creds, password: e.target.value })
                }
                type="password"
                className="w-full p-4 pr-12 text-sm border-gray-200 rounded-lg shadow-sm"
                placeholder="Enter password"
              />

              <span className="absolute inset-y-0 inline-flex items-center right-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              No account?&nbsp;
              <Link className="underline" href="/register">
                Sign up
              </Link>
            </p>

            <button
              disabled={loading}
              onClick={handleLogin}
              type="submit"
              className="inline-block px-5 py-3 ml-3 text-sm font-medium text-white bg-teal-500 rounded-lg"
            >
              {loading ? "Loading" : "Log in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
