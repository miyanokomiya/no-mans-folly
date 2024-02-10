import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { useGlobalClickEffect } from "../../hooks/window";
import { TAU } from "../../utils/geometry";

interface Props {
  open: boolean;
  onSuccess: () => void;
  onFail: () => void;
}

export const Skillcheck: React.FC<Props> = ({ open, onFail, onSuccess }) => {
  const duration = 60;
  const range = Math.PI / 3;
  const sin = Math.sin(range);
  const cos = Math.cos(range);
  const greatRange = range * 0.3;
  const greatSin = Math.sin(greatRange);
  const greatCos = Math.cos(greatRange);

  const loopRef = useRef(0);
  const timerRef = useRef(0);
  const [radian, setRadian] = useState(0);
  const [currentRadian, setCurrentRadian] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<"" | "success" | "great" | "fail">("");

  const init = useCallback(() => {
    setStatus("");
    cancelAnimationFrame(loopRef.current);
    timerRef.current = 0;
    loopRef.current = 0;
    const r = Math.random() * TAU;
    setRadian(r);
    setCurrentRadian(r + range * 1.1 + (Math.random() * Math.PI) / 3);
  }, []);

  useEffect(() => {
    if (open) {
      init();
      setPlaying(true);
    }
  }, [open, init]);

  const tick = useCallback(() => {
    timerRef.current = timerRef.current + 1;
    setCurrentRadian((r) => r + TAU / duration);
  }, []);

  useEffect(() => {
    if (!playing) return;

    const fn = () => {
      tick();
      if (timerRef.current < duration) {
        loopRef.current = requestAnimationFrame(fn);
      } else {
        setPlaying(false);
        setStatus("fail");
      }
    };
    loopRef.current = requestAnimationFrame(fn);

    return () => {
      cancelAnimationFrame(loopRef.current);
    };
  }, [onFail, tick, playing]);

  const onStop = useCallback(
    (e: MouseEvent) => {
      // Check "timerRef" to avoid detecting the click initiating this component.
      if (!playing || timerRef.current < 10) return;

      e.preventDefault();
      cancelAnimationFrame(loopRef.current);
      setPlaying(false);

      const adjusted = currentRadian - TAU;
      if (radian <= adjusted && adjusted <= radian + range) {
        if (adjusted <= radian + greatRange) {
          setStatus("great");
        } else {
          setStatus("success");
        }
      } else {
        setStatus("fail");
      }
    },
    [onSuccess, onFail, playing, currentRadian, radian, range],
  );
  useGlobalClickEffect(onStop);

  useEffect(() => {
    if (!status) return;

    setTimeout(() => {
      if (status === "success" || status === "great") {
        onSuccess();
      } else {
        onFail();
      }
      setStatus("");
    }, 500);
  }, [status, onSuccess, onFail]);

  const csin = Math.sin(currentRadian);
  const ccos = Math.cos(currentRadian);

  const message = useMemo(() => {
    switch (status) {
      case "success":
        return <span className="text-xl font-bold">Success!</span>;
      case "great":
        return <span className="text-2xl font-bold">Great!!</span>;
      case "fail":
        return <span>Fail</span>;
      default:
        return <span>Click</span>;
    }
  }, [status]);

  const containerStyle = useMemo(() => {
    switch (status) {
      case "success":
        return {
          transition: "all 0.2s",
          transform: "scale(1.25)",
        };
      case "great":
        return {
          transition: "all 0.2s",
          transform: "scale(1.25)",
        };
      default:
        return {};
    }
  }, [status]);

  return (
    <Dialog open={open} onClose={onFail} hideClose={true} required={true} className="bg-transparent">
      <div className="relative w-32 h-32 rounded-full bg-gray-100 select-none" style={containerStyle}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">
          <g transform={`rotate(${(radian / Math.PI) * 180})`}>
            <path stroke="black" strokeWidth="2" fill="none" d={`M${cos * 45} ${sin * 45} A 45 45 0 1 1 45 0`} />
            <path
              stroke="red"
              strokeWidth="8"
              strokeLinecap="square"
              fill="none"
              d={`M45,0 A 45 45 0 0 1 ${cos * 45} ${sin * 45}`}
            />
            <path
              stroke="white"
              strokeWidth="6"
              strokeLinecap="square"
              fill="none"
              d={`M45,0 A 45 45 0 0 1 ${greatCos * 45} ${greatSin * 45}`}
            />
          </g>
          <path stroke="blue" strokeWidth="4" fill="none" d={`M${ccos * 16} ${csin * 16} L${ccos * 50} ${csin * 50}`} />
        </svg>
        <div className="absolute top-0 left-0 w-32 h-32 flex items-center justify-center font-medium">{message}</div>
      </div>
    </Dialog>
  );
};
