import { FlightShell } from "@/components/flight/flight-shell";
import { OneWayFlow } from "@/components/flight/one-way-flow";

export default function OneWayPage() {
  return (
    <FlightShell
      title="편도 항공권 조회"
      description="편도 항공편을 찾고 바로 예약 옵션을 확인하세요. (직항만 조회됩니다)"
    >
      <OneWayFlow />
    </FlightShell>
  );
}
