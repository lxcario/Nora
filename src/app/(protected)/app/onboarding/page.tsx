import { getRegistry } from "@/app/(protected)/app/_actions/academic/registry";
import { getAcademicProfile } from "@/app/(protected)/app/_actions/academic/onboarding";
import { OnboardingWizard } from "@/app/(protected)/app/_components/onboarding-wizard";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  // If the user already finished onboarding, send them to the app.
  const profile = await getAcademicProfile();
  if (profile && profile.onboardingStatus === "complete") {
    redirect("/app");
  }

  const registry = await getRegistry();
  return <OnboardingWizard registry={registry} />;
}
