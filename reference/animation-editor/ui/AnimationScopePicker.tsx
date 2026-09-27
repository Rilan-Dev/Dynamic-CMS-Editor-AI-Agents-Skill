"use client";

import { useState } from "react";
import type { AnimationApplyScope, AnimationScopeOption } from "../core/types";

const scopeKey = (scope: AnimationApplyScope): string => {
  switch (scope.kind) {
    case "target": return `target:${scope.targetId}`;
    case "similar-page": return `similar:${scope.targetType}:${scope.targetIds.join(",")}`;
    case "section": return `section:${scope.sectionId}`;
    case "page": return `page:${scope.pageId}`;
    case "global": return `global:${scope.targetType ?? "all"}`;
  }
};

export function AnimationScopePicker({
  options,
  value,
  onChange,
}: {
  options: AnimationScopeOption[];
  value: AnimationApplyScope;
  onChange(scope: AnimationApplyScope): void;
}) {
  const [pending, setPending] = useState<AnimationScopeOption | null>(null);
  const [globalStep, setGlobalStep] = useState<1 | 2>(1);

  const choose = (option: AnimationScopeOption) => {
    if (!option.confirmation) {
      onChange(option.scope);
      return;
    }
    setPending(option);
    setGlobalStep(1);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.requiresSecondConfirmation && globalStep === 1) {
      setGlobalStep(2);
      return;
    }
    onChange(pending.scope);
    setPending(null);
    setGlobalStep(1);
  };

  return (
    <div className="ae-group">
      <p className="ae-question">Where should this animation be used?</p>
      <div className="ae-scope-list">
        {options.map((option) => {
          const key = scopeKey(option.scope);
          return (
            <button
              key={key}
              type="button"
              className="ae-scope"
              data-active={scopeKey(value) === key}
              aria-pressed={scopeKey(value) === key}
              onClick={() => choose(option)}
            >
              <span aria-hidden>{option.scope.kind === "global" ? "🌐" : option.scope.kind === "page" ? "📄" : option.scope.kind === "section" ? "▦" : "✦"}</span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="ae-confirm" role="alertdialog" aria-label="Confirm animation scope">
          <strong>
            {pending.requiresSecondConfirmation && globalStep === 2
              ? "Confirm website-wide change"
              : "Confirm this change"}
          </strong>
          <span>{pending.confirmation}</span>
          {pending.requiresSecondConfirmation && globalStep === 2 && (
            <span>This changes the shared website draft. Public pages still change only after Publish.</span>
          )}
          <div className="ae-actions">
            <button type="button" className="ae-button" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" className="ae-button ae-button--primary" onClick={confirm}>
              {pending.requiresSecondConfirmation && globalStep === 1
                ? "Continue"
                : pending.scope.kind === "global"
                  ? "Apply everywhere"
                  : "Apply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
