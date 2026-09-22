import { FlightShell } from "@/components/flight/flight-shell";
import { RoundTripStepFlow } from "@/components/flight/round-trip-step-flow";

export default function RoundTripStepPage() {
  return (
    <FlightShell
      title="왕복 항공권 · 단계별 조회"
      description="가는편을 먼저 고르고, 이어지는 오는편을 고른 뒤 예약 옵션을 확인하세요. (직항만 조회됩니다)"
    >
      <RoundTripStepFlow />
    </FlightShell>
  );
}
