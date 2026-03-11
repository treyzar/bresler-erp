import React from "react";
import { Undo2, Redo2 } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const HistoryButtons: React.FC<Props> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => (
  <div className="flex gap-2">
    <button
      className="btn btn-secondary"
      onClick={onUndo}
      disabled={!canUndo}
      title="Отменить (Ctrl+Z)"
    >
      <Undo2 size={14} />
      Отменить
    </button>
    <button
      className="btn btn-secondary"
      onClick={onRedo}
      disabled={!canRedo}
      title="Повторить (Ctrl+Y)"
    >
      <Redo2 size={14} />
      Повторить
    </button>
  </div>
);

export default HistoryButtons;
