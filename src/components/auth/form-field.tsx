import type { ComponentProps } from "react";

type FormFieldProps = ComponentProps<"input"> & {
  label: string;
};

export function FormField({ label, id, ...inputProps }: FormFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        id={id}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
        {...inputProps}
      />
    </label>
  );
}
