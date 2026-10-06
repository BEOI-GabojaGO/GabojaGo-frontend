import { FlightShell } from "@/components/flight/flight-shell";
import { WishlistPanel } from "@/components/wishlist/wishlist-panel";

export default function WishlistPage() {
  return (
    <FlightShell title="위시리스트" description="담아 둔 항공권과 여행 정보를 모아 봅니다.">
      <WishlistPanel />
    </FlightShell>
  );
}
