import { FlightShell } from "@/components/flight/flight-shell";
import { RoundTripBundleFlow } from "@/components/flight/round-trip-bundle-flow";

export default function RoundTripBundlePage() {
  return (
    <FlightShell
      title="왕복 항공권 · 일정 한 번에 조회"
      description="왕복 일정을 한 번에 입력하고 가는편·오는편 조합을 비교한 뒤 예약 옵션을 확인하세요. (직항만 조회됩니다)"
    >
      <RoundTripBundleFlow />
    </FlightShell>
  );
}
