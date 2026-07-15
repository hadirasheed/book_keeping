import { redirect } from "next/navigation";

// No auth: load straight into the dashboard.
export default function Home() {
  redirect("/dashboard");
}
