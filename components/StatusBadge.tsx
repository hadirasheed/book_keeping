import { Badge } from "@/components/ui/badge";
import type { StatementStatus } from "@/lib/types";

const LABEL: Record<StatementStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  done: "Done",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: StatementStatus }) {
  return <Badge variant={status}>{LABEL[status]}</Badge>;
}
