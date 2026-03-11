import React, { useEffect, useState } from "react";
import { X, Sparkles, BookOpen, ChevronRight } from "lucide-react";
import DocumentationPanel from "./DocumentationPanel";
import "./HelpModal.css";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Небольшая задержка для плавного появления контента
      setTimeout(() => setShowContent(true), 150);
    } else {
      setShowContent(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`help-modal-overlay ${isOpen ? "open" : "closing"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`help-modal-container ${isOpen ? "open" : "closing"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Декоративные элементы */}
        <div className="help-modal-decoration">
          <div className="decoration-circle decoration-circle-1"></div>
          <div className="decoration-circle decoration-circle-2"></div>
          <div className="decoration-circle decoration-circle-3"></div>
        </div>

        {/* Заголовок */}
        <div className="help-modal-header">
          <div className="help-modal-header-content">
            <div className="help-modal-icon-wrapper">
              <BookOpen className="help-modal-icon" size={28} />
              <Sparkles className="help-modal-sparkle" size={16} />
            </div>
            <div>
              <h2 id="help-modal-title" className="help-modal-title">
                Справка по использованию
              </h2>
              <p className="help-modal-subtitle">
                Всё, что нужно знать для эффективной работы
              </p>
            </div>
          </div>
          <button
            className="help-modal-close-btn"
            onClick={onClose}
            aria-label="Закрыть справку"
          >
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className={`help-modal-content ${showContent ? "visible" : ""}`}>
          <DocumentationPanel />
        </div>

        {/* Подвал с подсказками */}
        <div className="help-modal-footer">
          <div className="help-modal-tip">
            <ChevronRight size={16} className="tip-icon" />
            <span>
              Нажмите <kbd>Esc</kbd> для закрытия
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
