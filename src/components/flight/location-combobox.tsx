"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { formatLocation } from "@/lib/flight-client";
import type { LocationOption } from "@/lib/flight-types";
import { searchLocations } from "@/lib/locations";

type LocationComboboxProps = {
  label: string;
  /** 폼 필드 이름. `{name}`에 공항 코드 목록, `{name}Option`에 선택 항목(JSON)이 실린다. */
  name: "origin" | "destination";
  placeholder: string;
  defaultValue?: LocationOption | null;
};

/** 도시·공항 자동완성. 목록에서 고른 항목만 값으로 인정한다. */
export function LocationCombobox({
  label,
  name,
  placeholder,
  defaultValue = null,
}: LocationComboboxProps) {
  const listId = useId();
  const inputId = `${name}-input`;
  const [selected, setSelected] = useState<LocationOption | null>(defaultValue);
  const [query, setQuery] = useState(defaultValue ? formatLocation(defaultValue) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = open && !selected ? searchLocations(query) : [];
  // 도시 행이 함께 뜬 공항은 그 아래로 들여 써서 소속을 보여 준다.
  const listedCities = new Set(
    results.filter((option) => option.type === "CITY").map((option) => option.nameKo),
  );

  function choose(option: LocationOption) {
    setSelected(option);
    setQuery(formatLocation(option));
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={results.length > 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        required
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
      <input type="hidden" name={name} value={selected?.airportCodes ?? ""} />
      <input type="hidden" name={`${name}Option`} value={selected ? JSON.stringify(selected) : ""} />

      {open && !selected && query.trim() && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">일치하는 도시·공항이 없어요.</li>
          )}
          {results.map((option, index) => (
            <li
              key={`${option.type}-${option.code}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // 클릭 전에 입력칸 blur로 목록이 닫히지 않게 한다.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer py-2 pr-4 text-sm ${
                option.type === "AIRPORT" && option.cityNameKo && listedCities.has(option.cityNameKo)
                  ? "pl-9"
                  : "pl-4"
              } ${index === active ? "bg-blue-50" : ""}`}
            >
              {option.type === "CITY" ? (
                <>
                  <p className="font-bold text-slate-900">
                    {option.nameKo}, {option.countryNameKo}
                  </p>
                  <p className="text-xs text-slate-500">
                    모든 공항 · {option.airports?.map((airport) => airport.code).join(", ")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">
                    {option.nameKo} ({option.code})
                  </p>
                  <p className="text-xs text-slate-500">
                    {option.cityNameKo}, {option.countryNameKo}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
