"use client";

export function EditToggleButton({
  editing,
  salvando,
  onEdit,
  onConcluir,
  onCancelar,
}: {
  editing: boolean;
  salvando: boolean;
  onEdit: () => void;
  onConcluir: () => void;
  onCancelar: () => void;
}) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="border border-acento bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200"
      >
        Editar esta etapa
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancelar}
        disabled={salvando}
        className="border border-acento bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-texto hover:bg-neutro-200 disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConcluir}
        disabled={salvando}
        className="border border-acento bg-acento px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
      >
        {salvando ? "Salvando…" : "Concluir edição"}
      </button>
    </div>
  );
}
