/**
 * Marca "Dossiês" (ícone + wordmark) para fundo claro — usada na topbar e no
 * cabeçalho da lista. Traço externo e texto seguem os tokens de marca;
 * arcos internos e o ponto são cores fixas da ilustração, não tokens.
 */
export function LogoDossies({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 74"
      role="img"
      aria-label="Dossiês"
      className={className}
    >
      <g fill="none">
        <path d="M22 11 V63" stroke="var(--acento-profundo)" strokeWidth="2.4" />
        <path d="M22 11 H41 A26 26 0 0 1 41 63 H22" stroke="var(--acento-profundo)" strokeWidth="2.4" />
        <path d="M28.5 19 H41 A18 18 0 0 1 41 55 H28.5" stroke="#D4882F" strokeWidth="2.1" />
        <path d="M35 27 H41 A10 10 0 0 1 41 47 H35" stroke="#D4882F" strokeWidth="1.8" />
        <circle cx="41" cy="37" r="2.9" fill="#7FA084" />
      </g>
      <text
        x="78"
        y="50"
        fontFamily="Archivo, 'Helvetica Neue', Arial, sans-serif"
        fontSize="38"
        fontWeight="300"
        letterSpacing="6"
        fill="var(--texto)"
      >
        ossiês
      </text>
    </svg>
  );
}
