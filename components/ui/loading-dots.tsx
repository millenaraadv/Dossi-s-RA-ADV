// Indicador de carregamento inline — três blocos (não bolinhas: nenhum
// canto arredondado em nenhum elemento, ver styles/tokens.css) que pulsam em
// sequência. Herda a cor do texto ao redor via `currentColor`, então funciona
// tanto em botões escuros (texto branco) quanto em texto normal.
export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} aria-hidden="true">
      <span className="h-[5px] w-[5px] animate-loading-dot bg-current [animation-delay:0ms]" />
      <span className="h-[5px] w-[5px] animate-loading-dot bg-current [animation-delay:160ms]" />
      <span className="h-[5px] w-[5px] animate-loading-dot bg-current [animation-delay:320ms]" />
    </span>
  );
}
