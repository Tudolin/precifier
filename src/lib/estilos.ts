/**
 * Classes Tailwind reaproveitadas nos formularios.
 * Campos e botoes grandes, com bastante contraste — pensado para
 * quem tem pouca familiaridade com tecnologia.
 */

export const campo =
  "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg text-slate-900 " +
  "placeholder:text-slate-400 outline-none transition focus:border-massa-500 focus:ring-4 focus:ring-massa-100 " +
  "disabled:bg-slate-100 disabled:text-slate-500";

export const campoErro =
  "w-full rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-lg text-slate-900 " +
  "placeholder:text-red-300 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100";

export const rotulo = "mb-1.5 block text-base font-semibold text-slate-700";

export const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-massa-600 px-6 py-3 text-lg font-bold text-white " +
  "shadow-sm transition hover:bg-massa-700 focus:outline-none focus:ring-4 focus:ring-massa-200 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-3 " +
  "text-lg font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 " +
  "focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60";

export const botaoPerigo =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-lg font-bold text-white " +
  "transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const botaoIcone =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-200 bg-white " +
  "text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200";

export const cartao = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
