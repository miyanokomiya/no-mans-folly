import { circleClamp, clamp } from "okageo";
import { Color } from "../models";

type RGBA = Color;

export interface HSLA {
  h: number; // 0 ~ 360
  s: number; // 0 ~ 1
  l: number; // 0 ~ 1
  a: number; // 0 ~ 1
}

export interface HSVA {
  h: number; // 0 ~ 360
  s: number; // 0 ~ 1
  v: number; // 0 ~ 1
  a: number; // 0 ~ 1
}

export function parseHSLA(str: string): HSLA | undefined {
  const splited = str.replace(/ /g, "").match(/hsla\((.+),(.+)%,(.+)%,(.+)\)/);
  if (!splited || splited.length < 5) return;
  return {
    h: clamp(0, 360, parseFloat(splited[1])),
    s: clamp(0, 1, parseFloat(splited[2]) / 100),
    l: clamp(0, 1, parseFloat(splited[3]) / 100),
    a: clamp(0, 1, parseFloat(splited[4])),
  };
}

export function parseHSVA(str: string): HSVA | undefined {
  const splited = str.replace(/ /g, "").match(/hsva\((.+),(.+)%,(.+)%,(.+)\)/);
  if (!splited || splited.length < 5) return;
  return {
    h: clamp(0, 360, parseFloat(splited[1])),
    s: clamp(0, 1, parseFloat(splited[2]) / 100),
    v: clamp(0, 1, parseFloat(splited[3]) / 100),
    a: clamp(0, 1, parseFloat(splited[4])),
  };
}

export function parseRGBA(str: string): RGBA | undefined {
  const splited = str.replace(/ /g, "").match(/rgba\((.+),(.+),(.+),(.+)\)/);
  if (!splited || splited.length < 5) return;
  return {
    r: clamp(0, 255, parseFloat(splited[1])),
    g: clamp(0, 255, parseFloat(splited[2])),
    b: clamp(0, 255, parseFloat(splited[3])),
    a: clamp(0, 1, parseFloat(splited[4])),
  };
}

export function rednerHSLA(hsla: HSLA): string {
  return `hsla(${hsla.h},${hsla.s * 100}%,${hsla.l * 100}%,${hsla.a})`;
}

export function rednerHSVA(hsva: HSVA): string {
  return `hsva(${hsva.h},${hsva.s * 100}%,${hsva.v * 100}%,${hsva.a})`;
}

export function rednerRGBA(rgba: RGBA): string {
  return `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
}

export function rgbaToHsva(rgba: RGBA): HSVA {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;

  const v = Math.max(r, g, b);
  const c = v - Math.min(r, g, b);
  const h = c === 0 ? c : v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c;
  return {
    h: clamp(0, 360, 60 * (h < 0 ? h + 6 : h)),
    s: clamp(0, 1, v === 0 ? v : c / v),
    v: clamp(0, 1, v),
    a: rgba.a,
  };
}

function getHsvToRgbParam(h: number, s: number, v: number, n: number) {
  const k = (n + h / 60) % 6;
  return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
}

export function hsvaToRgba(hsva: HSVA): RGBA {
  const h = circleClamp(0, 360, hsva.h);
  return {
    r: clamp(0, 1, getHsvToRgbParam(h, hsva.s, hsva.v, 5)) * 255,
    g: clamp(0, 1, getHsvToRgbParam(h, hsva.s, hsva.v, 3)) * 255,
    b: clamp(0, 1, getHsvToRgbParam(h, hsva.s, hsva.v, 1)) * 255,
    a: hsva.a,
  };
}

export function hslaToHsva(hsla: HSLA): HSVA {
  const sv = slToSv(hsla.s, hsla.l);
  return {
    h: hsla.h,
    s: sv.s,
    v: sv.v,
    a: hsla.a,
  };
}

export function hsvaToHsla(hsva: HSVA): HSLA {
  const sl = svToSl(hsva.s, hsva.v);
  return {
    h: hsva.h,
    s: sl.s,
    l: sl.l,
    a: hsva.a,
  };
}

function svToSl(s: number, v: number): { s: number; l: number } {
  const l = ((2 - s) * v) / 2;
  const ss = l === 0 ? s : l === 1 ? 0 : l < 0.5 ? (s * v) / (l * 2) : (s * v) / (2 - l * 2);

  return { s: ss, l };
}

function slToSv(s: number, l: number): { s: number; v: number } {
  const v = l + s * Math.min(l, 1 - l);
  const ss = v === 0 ? 0 : 2 * (1 - l / v);
  return { s: ss, v };
}

export function isSameColor(a?: RGBA, b?: RGBA): boolean {
  if (a && b) return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  return a === b;
}

function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export function colorToHex(color: Color): string {
  return "#" + componentToHex(color.r) + componentToHex(color.g) + componentToHex(color.b);
}

export function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 1,
      }
    : { r: 0, g: 0, b: 0, a: 1 };
}
