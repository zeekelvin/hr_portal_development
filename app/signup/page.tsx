"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [role, setRole]           = useState("employee"); // or "hr", "admin"
  const [saving, setSaving]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          role       : role
        }
      }
    });

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.user) {
      router.push("/"); // they’ll be bootstrapped into employees on first login
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* your form UI here */}
    </form>
  );
}
