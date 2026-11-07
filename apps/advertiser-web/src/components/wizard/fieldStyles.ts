export const inputClass =
  'mt-1.5 w-full rounded-xl border border-navy/12 bg-white px-3.5 py-2.5 text-sm text-navy shadow-sm transition placeholder:text-muted/60 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none'

export const inputErrorClass =
  'mt-1.5 w-full rounded-xl border border-rose-500 bg-white px-3.5 py-2.5 text-sm text-navy shadow-sm transition placeholder:text-muted/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none'

export const labelClass = 'block text-sm font-semibold text-navy'

export const chipClass = (selected: boolean) =>
  `rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
    selected
      ? 'border-teal bg-teal-muted/60 text-teal shadow-sm ring-1 ring-teal/20'
      : 'border-navy/10 bg-white text-navy/80 hover:border-navy/20 hover:bg-paper'
  }`

export const dropzoneClass =
  'mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-paper/50 px-4 py-8 text-center transition hover:border-teal/40 hover:bg-teal-muted/20'
