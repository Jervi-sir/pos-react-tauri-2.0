import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

function Input({ className, placeholder, type, id, ...props }: React.ComponentProps<"input">) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [filled, setFilled] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  React.useEffect(() => {
    const val = inputRef.current?.value;
    setFilled(!!val);
  }, []);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    setFilled(!!e.target.value);
    props.onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    props.onFocus?.(e);
  };

  const handleLabelClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="group relative flex items-center rounded-md transition-colors focus-within:border-primary">
      <input
        ref={inputRef}
        type={inputType}
        id={id}
        data-slot="input"
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
          isPassword ? "pr-10" : ""
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1.5 flex items-center justify-center p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
      <label
        htmlFor={id}
        onClick={handleLabelClick}
        className={cn(
          "absolute left-1 top-0 translate-y-2 cursor-text bg-neutral-900 px-2 text-sm transition-all rounded-2xl",
          "pointer-events-none", // prevent blocking clicks
          (focused || filled) && "-translate-y-3 text-xs text-primary"
        )}
      >
        <span className="pointer-events-auto">{placeholder}</span>
      </label>
    </div>
  );
}

export { Input };
