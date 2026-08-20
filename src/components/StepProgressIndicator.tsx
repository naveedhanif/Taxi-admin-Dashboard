import { Check } from "lucide-react";

interface StepProgressIndicatorProps {
  currentStep: number; // 1 to 5
  totalSteps?: number;
  onStepClick?: (step: number) => void;
}

const steps = [
  { step: 1, title: "Business" },
  { step: 2, title: "Stripe Connect" },
  { step: 3, title: "Subscription" },
  { step: 4, title: "Vehicle" },
  { step: 5, title: "Fare Rules" },
];

export default function StepProgressIndicator({
  currentStep,
  totalSteps = 5,
  onStepClick,
}: StepProgressIndicatorProps) {
  const activeStepObj = steps.find((s) => s.step === currentStep) || steps[0];

  return (
    <div className="w-full max-w-xl mx-auto mb-8 font-sans">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#185FA5]" style={{ fontFamily: "Inter" }}>
            Step {currentStep} of {totalSteps}
          </span>
          <h2 className="text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
            {activeStepObj.title}
          </h2>
        </div>
        <div className="text-xs text-[#5F5E5A]">
          {Math.round((currentStep / totalSteps) * 100)}% Completed
        </div>
      </div>

      {/* Progress Bar Container with Recessed Shadow */}
      <div
        className="relative h-2.5 w-full rounded-full overflow-hidden p-0.5"
        style={{
          background: "#F0EEE7",
          boxShadow: "inset 2px 2px 4px rgba(44,44,42,0.14), inset -2px -2px 4px rgba(255,255,255,0.8)",
          border: "1px solid #ECE9E0",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
            background: "linear-gradient(135deg, #378ADD, #0C447C)",
            boxShadow: "0 1px 3px rgba(12,68,124,0.3)",
          }}
        />
      </div>

      {/* Embossed Dots Row */}
      <div className="flex items-center justify-between mt-3 px-1">
        {steps.map((s) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => onStepClick && onStepClick(s.step)}
              disabled={!onStepClick}
              className={`flex items-center gap-1.5 transition-all text-left ${
                onStepClick ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                  isDone
                    ? "text-white"
                    : isCurrent
                    ? "text-white"
                    : "text-[#5F5E5A]"
                }`}
                style={{
                  background: isDone
                    ? "#639922"
                    : isCurrent
                    ? "#185FA5"
                    : "#F0EEE7",
                  boxShadow: isDone
                    ? "2px 2px 4px rgba(59,109,17,0.3)"
                    : isCurrent
                    ? "2px 2px 5px rgba(4,44,83,0.3)"
                    : "3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85)",
                }}
              >
                {isDone ? <Check size={11} strokeWidth={3} /> : s.step}
              </div>
              <span
                className={`hidden md:inline text-xs ${
                  isCurrent
                    ? "font-bold text-[#2C2C2A]"
                    : isDone
                    ? "font-medium text-[#27500A]"
                    : "text-[#B4B2A9]"
                }`}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
