import { redirect } from "next/navigation";

// Root page redirects directly to the admin panel.
// This is an internal tool — no public landing page needed.
export default function Home() {
  redirect("/admin");
}
