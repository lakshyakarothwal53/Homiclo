import { createFileRoute } from "@tanstack/react-router";
import { ReportListPage } from "@/components/reports/ReportListPage";
import { useReports } from "@/hooks/use-reports";

export const Route = createFileRoute("/_app/reports/financial")({
  head: () => ({
    meta: [
      { title: "Financial Reports — HOMIQLO" },
      { name: "description", content: "P&L, cash flow and ledgers." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data = [] } = useReports("financial");
  return (
    <ReportListPage
      eyebrow="Reports › Financial"
      title="Financial Reports"
      description="Financial overview and controls."
      rows={data}
    />
  );
}
