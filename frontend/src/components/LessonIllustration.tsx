export function LessonIllustration() {
  return (
    <svg
      className="lesson-art"
      viewBox="0 0 520 340"
      fill="none"
      role="img"
      aria-label="A plant growing in soil under the sun, with sunlight and water"
    >
      <circle cx="399" cy="76" r="34" fill="var(--color-sun)" />
      <path
        d="M399 23v-13m0 132v-13m53-53h13m-132 0h13m91-38 10-10m-91 91 10-10m71 0 10 10m-91-91 10 10"
        stroke="var(--color-sun)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M51 275c56-30 118-24 176-8 68 18 143 22 242-4v49H51v-37Z"
        fill="var(--color-soil)"
      />
      <path
        d="M51 275c56-30 118-24 176-8 68 18 143 22 242-4"
        stroke="var(--color-soil-line)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M263 265c-2-42-4-84 3-124"
        stroke="var(--color-green)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M264 199c-43-5-62-25-63-52 35 0 57 17 63 52Zm3-31c5-38 25-58 57-61 0 34-19 55-57 61Zm-2 56c-35-1-54-16-61-43 31-4 53 10 61 43Zm5-34c8-29 26-44 53-45-3 27-20 43-53 45Z"
        fill="var(--color-leaf)"
      />
      <path
        d="M263 267c-6-18-24-24-43-20m42 21c7-21 25-28 47-22m-47 20c-4-14-12-20-22-21m23 22c5-14 12-20 23-22"
        stroke="var(--color-root)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M86 89c13 4 21 12 23 27m-23-27c-13 4-21 12-23 27m23-27V70"
        stroke="var(--color-water)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M86 78c-7-6-8-14 0-22 8 8 7 16 0 22Z"
        fill="var(--color-water)"
      />
      <path
        d="M128 113v38"
        stroke="var(--color-water)"
        strokeWidth="2"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />
      <path
        d="M310 106h59"
        stroke="var(--color-water)"
        strokeWidth="2"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />
    </svg>
  )
}
