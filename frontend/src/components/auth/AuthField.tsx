interface AuthFieldProps {
  id: string;
  label: string;
type: React.HTMLInputTypeAttribute;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

const INPUT_CLASS_NAME =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100";

export default function AuthField({
  id,
  label,
  type,
  value,
  placeholder,
  autoComplete,
  onChange,
}: AuthFieldProps) {
  return (
<div>
  <label
    htmlFor={id}
    className="mb-2 block text-sm font-medium text-heading"
  >
    {label}
  </label>

  <input
    id={id}
    type={type}
    value={value}
    placeholder={placeholder}
    autoComplete={autoComplete}
    onChange={(event) => onChange(event.target.value)}
    className={`${INPUT_CLASS_NAME} border-border bg-surface text-heading placeholder:text-body focus:border-primary focus:ring-primary/20`}
  />
</div>
  );
}