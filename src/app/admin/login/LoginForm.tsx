"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="flex w-full flex-col gap-4 text-left">
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] text-sage">Email</span>
        <input name="email" type="email" required autoFocus autoComplete="username" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] text-sage">Mật khẩu admin</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </label>
      {state.error ? <p className="text-[14px] text-rose">{state.error}</p> : null}
      <button className="btn" disabled={pending}>
        {pending ? "Đang kiểm tra..." : "Đăng nhập"}
      </button>
    </form>
  );
}
