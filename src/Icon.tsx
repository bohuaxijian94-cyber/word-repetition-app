type Name =
  | "home"
  | "words"
  | "stats"
  | "more"
  | "review"
  | "import"
  | "settings"
  | "listening";
const paths: Record<Name, string> = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  words:
    "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm9 3a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 2",
  stats: "M4 20h17M7 16v-4m6 4V5m6 11V9",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  review: "M5 5h14v14H5zM8 2h14v14",
  import: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm3 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  listening: "M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4zm13 0h3v8h-3z",
};
export default function Icon({ name }: { name: Name }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
