import { Suspense } from "react";
import ExpenseStats from "@/components/expenses/ExpenseStats";

export default function ExpenseStatsPage() {
  return (
    <Suspense fallback={null}>
      <ExpenseStats />
    </Suspense>
  );
}
