import { FitnessTabs } from "@/components/fitness/FitnessTabs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FitnessLayout({
  children,
}: LayoutProps<"/fitness">) {
  const active = await prisma.workoutSession.findFirst({
    where: { status: "IN_PROGRESS" },
    select: { id: true },
  });

  return (
    // Bottom padding keeps content clear of the fixed mobile tab bar.
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <FitnessTabs sessionActive={active !== null} />
      {children}
    </div>
  );
}
