import { FormField } from "@/components/auth/form-field";
import { LocationCombobox } from "@/components/flight/location-combobox";
import { SelectField } from "@/components/flight/select-field";
import { tomorrow } from "@/lib/flight-client";
import type {
  FlightSearchRequest,
  LocationOption,
  OneWaySearchRequest,
  SelectedLocations,
  TravelClass,
} from "@/lib/flight-types";

const TRAVEL_CLASS_OPTIONS = [
  { value: 1, label: "이코노미" },
  { value: 2, label: "프리미엄 이코노미" },
  { value: 3, label: "비즈니스" },
  { value: 4, label: "퍼스트" },
];

export type TripType = "round-trip" | "one-way";

type SearchConditionFieldsProps = {
  tripType: TripType;
  defaultValues?: Partial<FlightSearchRequest> | null;
  /** "조건 변경"으로 돌아왔을 때 출발지·도착지 선택을 복원한다. */
  defaultLocations?: SelectedLocations | null;
};

export function SearchConditionFields({
  tripType,
  defaultValues,
  defaultLocations,
}: SearchConditionFieldsProps) {
  const minDate = tomorrow();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <LocationCombobox
          label="출발지"
          name="origin"
          placeholder="도시, 공항 또는 국가 (예: 서울)"
          defaultValue={defaultLocations?.origin}
        />
        <LocationCombobox
          label="도착지"
          name="destination"
          placeholder="도시, 공항 또는 국가 (예: 도쿄)"
          defaultValue={defaultLocations?.destination}
        />
        <FormField
          label="가는 날"
          id="outboundDate"
          name="outboundDate"
          type="date"
          min={minDate}
          defaultValue={defaultValues?.outboundDate}
          required
        />
        {tripType === "round-trip" && (
          <FormField
            label="오는 날"
            id="returnDate"
            name="returnDate"
            type="date"
            min={minDate}
            defaultValue={defaultValues?.returnDate}
            required
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-4">
        <FormField
          label="성인"
          id="adults"
          name="adults"
          type="number"
          min={1}
          max={9}
          defaultValue={defaultValues?.adults ?? 1}
          required
        />
        <FormField
          label="소아"
          id="children"
          name="children"
          type="number"
          min={0}
          max={8}
          defaultValue={defaultValues?.children ?? 0}
          required
        />
        <FormField
          label="유아(좌석)"
          id="infantsInSeat"
          name="infantsInSeat"
          type="number"
          min={0}
          max={8}
          defaultValue={defaultValues?.infantsInSeat ?? 0}
          required
        />
        <FormField
          label="유아(무릎)"
          id="infantsOnLap"
          name="infantsOnLap"
          type="number"
          min={0}
          max={8}
          defaultValue={defaultValues?.infantsOnLap ?? 0}
          required
        />
      </div>

      <SelectField
        label="좌석 등급"
        id="travelClass"
        name="travelClass"
        options={TRAVEL_CLASS_OPTIONS}
        defaultValue={defaultValues?.travelClass ?? 1}
      />
    </div>
  );
}

type FormResult<T> =
  | { request: T; locations: SelectedLocations; error?: undefined }
  | { request?: undefined; locations?: undefined; error: string };

/** 왕복 폼 값을 백엔드 요청 형태로 바꾼다. 클라이언트에서 막을 수 있는 오류는 `error`로 돌려준다. */
export function readFlightSearchForm(formData: FormData): FormResult<FlightSearchRequest> {
  const common = readOneWaySearchForm(formData);

  if (common.error !== undefined) return common;

  const request: FlightSearchRequest = {
    ...common.request,
    returnDate: String(formData.get("returnDate") ?? ""),
  };

  // yyyy-MM-dd 문자열은 사전순 비교가 날짜 비교와 같다.
  if (request.returnDate <= request.outboundDate) {
    return { error: "오는 날은 가는 날보다 뒤여야 합니다." };
  }

  return { request, locations: common.locations };
}

/** 편도 폼 값을 백엔드 요청 형태로 바꾼다. 왕복 폼의 공통 항목 파싱에도 쓴다. */
export function readOneWaySearchForm(formData: FormData): FormResult<OneWaySearchRequest> {
  const origin = readLocation(formData, "origin");
  const destination = readLocation(formData, "destination");

  if (!origin) return { error: "목록에서 출발지를 선택해 주세요." };
  if (!destination) return { error: "목록에서 도착지를 선택해 주세요." };

  // 백엔드 SAME_ORIGIN_DESTINATION과 같은 규칙: 공항이 달라도 같은 도시면 안 된다(ICN → GMP).
  if (cityName(origin) === cityName(destination)) {
    return { error: "출발지와 도착지가 같은 도시입니다." };
  }

  const request: OneWaySearchRequest = {
    origin: origin.airportCodes,
    destination: destination.airportCodes,
    outboundDate: String(formData.get("outboundDate") ?? ""),
    adults: Number(formData.get("adults")),
    children: Number(formData.get("children")),
    infantsInSeat: Number(formData.get("infantsInSeat")),
    infantsOnLap: Number(formData.get("infantsOnLap")),
    travelClass: Number(formData.get("travelClass")) as TravelClass,
  };

  return { request, locations: { origin, destination } };
}

function readLocation(formData: FormData, name: "origin" | "destination") {
  const raw = formData.get(`${name}Option`);
  return typeof raw === "string" && raw ? (JSON.parse(raw) as LocationOption) : null;
}

function cityName(option: LocationOption) {
  return option.type === "CITY" ? option.nameKo : (option.cityNameKo ?? option.nameKo);
}
